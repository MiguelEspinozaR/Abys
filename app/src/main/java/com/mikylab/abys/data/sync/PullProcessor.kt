package com.mikylab.abys.data.sync

import com.mikylab.abys.core.time.DateFormats
import com.mikylab.abys.data.local.dao.CuentaDao
import com.mikylab.abys.data.local.dao.FuenteDao
import com.mikylab.abys.data.local.dao.PagoDao
import com.mikylab.abys.data.local.dao.SettingDao
import com.mikylab.abys.data.local.dao.SplitDao
import com.mikylab.abys.data.local.dao.SyncStateDao
import com.mikylab.abys.data.local.entity.AppSettingEntity
import com.mikylab.abys.data.local.entity.DiaTrabajadoEntity
import com.mikylab.abys.data.remote.AbysApi
import com.mikylab.abys.data.remote.AbysApiProvider
import com.mikylab.abys.data.remote.mapper.RemoteMappers
import com.mikylab.abys.data.remote.mapper.RemoteMappers.toEntity
import com.mikylab.abys.domain.model.SyncState
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Refresca Room con los datos del servidor (pull).
 *
 * Reglas de reconciliación (ver `docs/data-model.md` §7.3):
 * - la identidad se resuelve por **`serverId`**, no por `localId`: una fila creada en el
 *   dispositivo (UUID) y una descargada del servidor (`srv-<id>`) son **la misma** fila;
 * - si la fila local está `PENDING_*`, **no** se sobrescribe (gana el cambio local);
 * - si el servidor trae una fila que no existe local, se inserta como `SYNCED`;
 * - si la fila local está `SYNCED` y el servidor ya no la tiene, se marca eliminada (soft delete).
 */
@Singleton
class PullProcessor @Inject constructor(
    private val apiProvider: AbysApiProvider,
    private val fuenteDao: FuenteDao,
    private val pagoDao: PagoDao,
    private val cuentaDao: CuentaDao,
    private val splitDao: SplitDao,
    private val settingDao: SettingDao,
    private val syncStateDao: SyncStateDao,
    private val generalRateHelper: GeneralRateHelper,
    private val splitTransactionsSync: SplitTransactionsSync,
) {

    suspend fun pull(): SyncOutcome {
        val api = try {
            apiProvider.api()
        } catch (e: IllegalArgumentException) {
            registrarEstado(error = "URL del backend inválida: ${e.message}")
            return SyncOutcome.FATAL
        } catch (e: Throwable) {
            registrarEstado(error = e.message ?: "No se pudo preparar el cliente HTTP")
            return SyncOutcome.RETRY
        }
        return try {
            pullFuentes(api)
            pullCuentas(api)
            pullPagos(api)
            pullSplits(api)
            pullSettings(api)
            generalRateHelper.recalcular()
            registrarEstado(error = null)
            android.util.Log.i(TAG, "Pull completado correctamente")
            SyncOutcome.OK
        } catch (e: retrofit2.HttpException) {
            android.util.Log.e(TAG, "Pull falló con HTTP ${e.code()}", e)
            registrarEstado(error = "Error HTTP ${e.code()}")
            SyncOutcome.RETRY
        } catch (e: java.io.IOException) {
            android.util.Log.e(TAG, "Pull falló: sin conexión", e)
            registrarEstado(error = "Sin conexión con el servidor")
            SyncOutcome.RETRY
        } catch (e: Throwable) {
            android.util.Log.e(TAG, "Pull falló", e)
            registrarEstado(error = e.message)
            SyncOutcome.FATAL
        }
    }

    private suspend fun pullFuentes(api: AbysApi) {
        val remoto = api.listarFuentes().data ?: return
        val ahora = System.currentTimeMillis()
        val locales = fuenteDao.getAll()
        val porServerId = locales.mapNotNull { f -> f.serverId?.let { it to f } }.toMap()
        val idsRemotos = mutableSetOf<Long>()

        for (dto in remoto) {
            idsRemotos += dto.id
            val entidad = dto.toEntity()
            val existente = porServerId[dto.id]
            if (existente == null) {
                fuenteDao.upsert(entidad)
            } else if (!existente.syncState.isPending) {
                // Misma fila: se conserva el `localId` local (UUID) y se actualizan los datos.
                fuenteDao.upsert(entidad.copy(localId = existente.localId))
            }
        }

        // El servidor ya no tiene estas fuentes → borrado lógico local (BR-084).
        locales
            .filter { it.serverId != null && it.serverId !in idsRemotos && !it.syncState.isPending }
            .forEach { fuenteDao.marcarEliminado(it.localId, ahora, SyncState.SYNCED, ahora) }
    }

    private suspend fun pullCuentas(api: AbysApi) {
        val remoto = api.listarCuentas().data ?: return
        val ahora = System.currentTimeMillis()
        val locales = cuentaDao.getAll()
        val porServerId = locales.mapNotNull { c -> c.serverId?.let { it to c } }.toMap()
        val idsRemotos = mutableSetOf<Long>()

        for (dto in remoto) {
            idsRemotos += dto.id
            val entidad = dto.toEntity()
            val existente = porServerId[dto.id]
            if (existente != null && existente.syncState.isPending) continue
            // Misma fila: se conserva el `localId` local (UUID) y se actualizan los datos.
            val localId = existente?.localId ?: entidad.localId
            cuentaDao.upsert(entidad.copy(localId = localId))

            // Historial de tasas de la cuenta (append-only).
            runCatching { api.historialTasas(dto.id).data }.getOrNull()?.forEach { h ->
                val historial = h.toEntity(localId)
                val previo = cuentaDao.getHistorial(localId)
                if (previo.none { it.localId == historial.localId }) {
                    cuentaDao.upsertHistorialEntrada(historial)
                }
            }
        }

        locales
            .filter { it.serverId != null && it.serverId !in idsRemotos && !it.syncState.isPending }
            .forEach { cuentaDao.marcarEliminado(it.localId, ahora, SyncState.SYNCED, ahora) }
    }

    private suspend fun pullPagos(api: AbysApi) {
        val ahora = System.currentTimeMillis()
        val fuentesPorServerId = fuenteDao.getAll().associateBy { it.serverId }
        val locales = pagoDao.getAll()
        val porServerId = locales.mapNotNull { p -> p.serverId?.let { it to p } }.toMap()
        val idsRemotos = mutableSetOf<Long>()

        // El backend pagina los pagos (`page_size` máx. 500): se descargan **todas** las páginas.
        var pagina = 1
        var total = 0
        var descargados = 0
        var paginaCompleta = false

        while (true) {
            val respuesta = api.listarPagos(page = pagina, pageSize = PAGINA_MAXIMA)
            val remoto = respuesta.data ?: break
            total = respuesta.meta?.total ?: (descargados + remoto.size)
            if (remoto.isEmpty()) {
                paginaCompleta = true
                break
            }

            for (dto in remoto) {
                idsRemotos += dto.id
                val fuente = fuentesPorServerId[dto.fuenteId] ?: continue // la fuente aún no está en local
                val entidad = dto.toEntity(fuente.localId)
                val existente = porServerId[dto.id]
                if (existente != null && existente.syncState.isPending) continue
                val localId = existente?.localId ?: entidad.localId
                pagoDao.upsert(entidad.copy(localId = localId))

                // Días trabajados: se conservan las filas locales cuya fecha no cambia
                // (actualizando id y **monto** del servidor, v0.3.0).
                val diasLocales = pagoDao.getDias(localId).associateBy { it.fecha }
                val dias = dto.diasTrabajados.map { dia ->
                    val previo = diasLocales[dia.fecha]
                    if (previo != null) {
                        previo.copy(
                            serverId = dia.id,
                            montoEnteros = dia.montoEnteros,
                            syncState = SyncState.SYNCED,
                            updatedAtLocal = ahora,
                        )
                    } else {
                        DiaTrabajadoEntity(
                            localId = RemoteMappers.serverLocalId(dia.id),
                            serverId = dia.id,
                            pagoLocalId = localId,
                            fecha = dia.fecha,
                            montoEnteros = dia.montoEnteros,
                            syncState = SyncState.SYNCED,
                            updatedAtLocal = ahora,
                        )
                    }
                }
                if (diasLocales.keys != dto.diasTrabajados.map { it.fecha }.toSet()) {
                    pagoDao.reemplazarDias(localId, dias)
                } else {
                    pagoDao.upsertDias(dias)
                }
            }

            descargados += remoto.size
            if (descargados >= total) {
                paginaCompleta = true
                break
            }
            pagina++
        }

        // Solo se marca como eliminado si se descargaron **todos** los pagos del servidor.
        if (paginaCompleta && descargados >= total) {
            locales
                .filter { it.serverId != null && it.serverId !in idsRemotos && !it.syncState.isPending }
                .forEach { pagoDao.marcarEliminado(it.localId, ahora, SyncState.SYNCED, ahora) }
        } else {
            android.util.Log.w(
                TAG,
                "Pull de pagos incompleto ($descargados de $total en el servidor): no se borra nada",
            )
        }
    }

    private suspend fun pullSplits(api: AbysApi) {
        val remoto = api.listarSplits().data ?: return
        val ahora = System.currentTimeMillis()
        val pagosPorServerId = pagoDao.getAll().associateBy { it.serverId }
        val locales = splitDao.getAll()
        val porServerId = locales.mapNotNull { s -> s.serverId?.let { it to s } }.toMap()
        val idsRemotos = mutableSetOf<Long>()

        for (dto in remoto) {
            idsRemotos += dto.id
            val pago = pagosPorServerId[dto.pagoId] ?: continue // el pago aún no está en local
            val entidad = dto.toEntity(pago.localId)
            val existente = porServerId[dto.id]
            if (existente != null && existente.syncState.isPending) continue
            val localId = existente?.localId ?: entidad.localId
            splitDao.upsert(entidad.copy(localId = localId))
            // Las transacciones del servidor reemplazan a las locales (conservando su `localId`).
            splitTransactionsSync.aplicar(localId, dto)
        }

        locales
            .filter { it.serverId != null && it.serverId !in idsRemotos && !it.syncState.isPending }
            .forEach { splitDao.borrar(it.localId) }
    }

    private suspend fun pullSettings(api: AbysApi) {
        val remoto = api.obtenerSplitSettings().data ?: return
        val existente = settingDao.get(CLAVE_MODO_DEFAULT)
        if (existente != null && existente.syncState.isPending) return
        settingDao.upsert(
            AppSettingEntity(
                clave = CLAVE_MODO_DEFAULT,
                valor = remoto.modoDefault,
                updatedAt = System.currentTimeMillis(),
                syncState = SyncState.SYNCED,
            ),
        )
    }

    private suspend fun registrarEstado(error: String?) {
        val estado = syncStateDao.get()
        syncStateDao.upsert(
            com.mikylab.abys.data.local.entity.SyncStateEntity(
                id = 1,
                ultimoSyncOk = if (error == null) System.currentTimeMillis() else estado?.ultimoSyncOk,
                ultimoIntento = System.currentTimeMillis(),
                ultimoError = error,
                pendientes = estado?.pendientes ?: 0,
            ),
        )
    }

    companion object {
        const val CLAVE_MODO_DEFAULT = "split_modo_default"

        /** Máximo de pagos que se descargan en un pull (el backend admite hasta 100 por página). */
        const val PAGINA_MAXIMA = 500
        private const val TAG = "AbysSync"
    }
}
