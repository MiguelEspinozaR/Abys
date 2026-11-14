package com.mikylab.abys.domain.repository

import com.mikylab.abys.core.result.AppResult
import com.mikylab.abys.domain.model.BarraDia
import com.mikylab.abys.domain.model.BarraMes
import com.mikylab.abys.domain.model.BarraSemana
import com.mikylab.abys.domain.model.Cuenta
import com.mikylab.abys.domain.model.DashboardResumenServidor
import com.mikylab.abys.domain.model.DashboardSummary
import com.mikylab.abys.domain.model.FiltroPagos
import com.mikylab.abys.domain.model.Fuente
import com.mikylab.abys.domain.model.HealthInfo
import com.mikylab.abys.domain.model.HistorialTasa
import com.mikylab.abys.domain.model.Pago
import com.mikylab.abys.domain.model.PagoDraft
import com.mikylab.abys.domain.model.PuntoHistorial
import com.mikylab.abys.domain.model.Split
import com.mikylab.abys.domain.model.SplitSettings
import com.mikylab.abys.domain.model.Transaccion
import kotlinx.coroutines.flow.Flow

/**
 * Repositorios de dominio. **Todas** las lecturas exponen `Flow` desde Room (offline-first)
 * y todas las escrituras son locales primero; la red se encarga el worker de sincronización.
 */
interface PagoRepository {
    fun observePagos(filtro: FiltroPagos): Flow<List<Pago>>
    fun observePago(localId: String): Flow<Pago?>
    fun observePagosPorAnio(): Flow<Map<Int, List<Pago>>>

    /** Total de pagos que cumplen el filtro (paginación de Ingresos). */
    suspend fun contarPagos(filtro: FiltroPagos): Int

    suspend fun crearPago(draft: PagoDraft): AppResult<Pago>
    suspend fun actualizarPago(localId: String, draft: PagoDraft): AppResult<Pago>
    suspend fun eliminarPago(localId: String): AppResult<Unit>
    suspend fun subirComprobante(localId: String, rutaArchivo: String): AppResult<String>
}

interface FuenteRepository {
    fun observeFuentes(): Flow<List<Fuente>>
    fun observeFuente(localId: String): Flow<Fuente?>
    suspend fun crearFuente(
        alias: String,
        color: String,
        splitAuto: Boolean,
        splitAutoModo: String?,
    ): AppResult<Fuente>
    suspend fun actualizarFuente(
        localId: String,
        alias: String,
        color: String,
        splitAuto: Boolean,
        splitAutoModo: String?,
    ): AppResult<Unit>
    suspend fun eliminarFuente(localId: String): AppResult<Unit>
    suspend fun subirLogo(localId: String, rutaArchivo: String): AppResult<String>
    suspend fun eliminarLogo(localId: String): AppResult<Unit>
}

interface CuentaRepository {
    fun observeCuentas(): Flow<List<Cuenta>>
    fun observeCuenta(localId: String): Flow<Cuenta?>
    fun observeHistorial(cuentaLocalId: String): Flow<List<HistorialTasa>>
    suspend fun crearCuenta(alias: String, banco: String?, numero: String?): AppResult<Cuenta>
    suspend fun actualizarCuenta(
        localId: String,
        alias: String,
        banco: String?,
        numero: String?,
    ): AppResult<Unit>
    suspend fun eliminarCuenta(localId: String): AppResult<Unit>
    suspend fun subirQr(localId: String, rutaArchivo: String): AppResult<String>
    suspend fun eliminarQr(localId: String): AppResult<Unit>
    suspend fun cambiarTasa(
        localId: String,
        tasaPorcentaje: Double,
        aplicarPendientes: Boolean,
    ): AppResult<Unit>
}

interface SplitRepository {
    fun observeSplits(): Flow<List<Split>>
    fun observeSplitPorPago(pagoLocalId: String): Flow<Split?>
    fun observeTransacciones(splitLocalId: String): Flow<List<Transaccion>>
    suspend fun generarSplit(pagoLocalId: String, modo: String): AppResult<Split>
    suspend fun recalcularSplit(splitLocalId: String): AppResult<Split>
    suspend fun eliminarSplit(splitLocalId: String): AppResult<Unit>
    suspend fun marcarRealizada(transaccionLocalId: String): AppResult<Transaccion>
}

interface SettingsRepository {
    fun observeSplitSettings(): Flow<SplitSettings>
    suspend fun setModoDefault(modo: String): AppResult<Unit>
}

interface HealthRepository {
    suspend fun consultarHealth(): AppResult<HealthInfo>
}

/**
 * Dashboard. Se calcula **localmente** sobre Room con la misma semántica que los endpoints
 * `dashboard` del backend, de modo que funciona sin conexión.
 *
 * [consultarServidor] permite contrastar el total local con el del backend para detectar que
 * al espejo local le faltan datos (p. ej. tras instalar la app en otro dispositivo).
 */
interface DashboardRepository {
    fun observeResumen(mes: Int, anio: Int): Flow<DashboardSummary>
    fun observeHistorial(): Flow<List<PuntoHistorial>>
    fun observeSemana(fecha: java.time.LocalDate): Flow<List<BarraDia>>
    fun observeMes(mes: Int, anio: Int): Flow<List<BarraSemana>>
    fun observeAnio(anio: Int): Flow<List<BarraMes>>

    /** Resumen del mes según el servidor (`GET /dashboard/summary`). */
    suspend fun consultarServidor(mes: Int, anio: Int): AppResult<DashboardResumenServidor>
}

/** Estado de la sincronización (cola de pendientes y último error). */
data class SyncEstado(
    val ultimoSyncOk: Long? = null,
    val ultimoIntento: Long? = null,
    val ultimoError: String? = null,
    val pendientes: Int = 0,
)

interface SyncStatusRepository {
    fun observeEstado(): Flow<SyncEstado>
    suspend fun sincronizarAhora()
}
