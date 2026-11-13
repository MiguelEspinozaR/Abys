package com.mikylab.abys.data.repository

import androidx.room.withTransaction
import com.mikylab.abys.core.result.AppError
import com.mikylab.abys.core.result.AppResult
import com.mikylab.abys.data.local.AbysDatabase
import com.mikylab.abys.data.local.dao.CuentaDao
import com.mikylab.abys.data.local.entity.CuentaEntity
import com.mikylab.abys.data.mapper.DomainMappers.toDomain
import com.mikylab.abys.data.sync.GeneralRateHelper
import com.mikylab.abys.data.sync.Operations
import com.mikylab.abys.domain.model.Cuenta
import com.mikylab.abys.domain.model.HistorialTasa
import com.mikylab.abys.domain.model.SyncState
import com.mikylab.abys.domain.repository.CuentaRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/** Repositorio de cuentas (local-first). */
@Singleton
class CuentaRepositoryImpl @Inject constructor(
    private val db: AbysDatabase,
    private val cuentaDao: CuentaDao,
    private val pendingWriter: PendingWriter,
    private val generalRateHelper: GeneralRateHelper,
) : CuentaRepository {

    override fun observeCuentas(): Flow<List<Cuenta>> =
        cuentaDao.observeActivas().map { lista -> lista.map { it.toDomain() } }

    override fun observeCuenta(localId: String): Flow<Cuenta?> =
        cuentaDao.observePorId(localId).map { it?.toDomain() }

    override fun observeHistorial(cuentaLocalId: String): Flow<List<HistorialTasa>> =
        cuentaDao.observeHistorial(cuentaLocalId).map { lista -> lista.map { it.toDomain() } }

    override suspend fun crearCuenta(alias: String, banco: String?, numero: String?): AppResult<Cuenta> {
        if (alias.isBlank()) {
            return AppResult.Failure(
                AppError(AppError.CODE_VALIDATION, "el alias de la cuenta es obligatorio"),
            )
        }
        val localId = UUID.randomUUID().toString()
        val ahora = System.currentTimeMillis()
        val entidad = CuentaEntity(
            localId = localId,
            serverId = null,
            alias = alias.trim(),
            numero = numero?.takeIf { it.isNotBlank() },
            banco = banco?.takeIf { it.isNotBlank() },
            qrRuta = null,
            esGeneral = false,
            tasaBps = 0L,
            createdAt = ahora,
            updatedAt = ahora,
            deletedAt = null,
            syncState = SyncState.PENDING_CREATE,
            updatedAtLocal = ahora,
            updatedAtServer = null,
            lastError = null,
        )
        db.withTransaction {
            cuentaDao.upsert(entidad)
            pendingWriter.encolar(Operations.TIPO_CUENTA, localId, Operations.OP_UPSERT)
        }
        return AppResult.Success(entidad.toDomain())
    }

    override suspend fun actualizarCuenta(
        localId: String,
        alias: String,
        banco: String?,
        numero: String?,
    ): AppResult<Unit> {
        val existente = cuentaDao.getPorId(localId)
            ?: return AppResult.Failure(AppError(AppError.CODE_NOT_FOUND, "cuenta no encontrada"))
        if (alias.isBlank()) {
            return AppResult.Failure(
                AppError(AppError.CODE_VALIDATION, "el alias de la cuenta es obligatorio"),
            )
        }
        val actualizada = existente.copy(
            alias = alias.trim(),
            banco = banco?.takeIf { it.isNotBlank() },
            numero = numero?.takeIf { it.isNotBlank() },
            updatedAt = System.currentTimeMillis(),
            syncState = SyncState.PENDING_UPDATE,
            updatedAtLocal = System.currentTimeMillis(),
            lastError = null,
        )
        db.withTransaction {
            cuentaDao.upsert(actualizada)
            pendingWriter.encolar(Operations.TIPO_CUENTA, localId, Operations.OP_UPSERT)
        }
        return AppResult.Success(Unit)
    }

    override suspend fun eliminarCuenta(localId: String): AppResult<Unit> {
        val existente = cuentaDao.getPorId(localId)
            ?: return AppResult.Failure(AppError(AppError.CODE_NOT_FOUND, "cuenta no encontrada"))
        if (existente.esGeneral) {
            return AppResult.Failure(
                AppError(
                    AppError.CODE_CONFLICT,
                    "la cuenta General no puede eliminarse",
                ),
            )
        }
        val ahora = System.currentTimeMillis()
        db.withTransaction {
            if (existente.serverId == null) {
                cuentaDao.marcarSincronizado(localId, SyncState.SYNCED, null, null, null, null, null)
            } else {
                cuentaDao.marcarEliminado(localId, ahora, SyncState.PENDING_DELETE, ahora)
                pendingWriter.encolar(
                    Operations.TIPO_CUENTA,
                    localId,
                    Operations.OP_DELETE,
                    serverId = existente.serverId,
                )
            }
        }
        return AppResult.Success(Unit)
    }

    override suspend fun subirQr(localId: String, rutaArchivo: String): AppResult<String> {
        val existente = cuentaDao.getPorId(localId)
            ?: return AppResult.Failure(AppError(AppError.CODE_NOT_FOUND, "cuenta no encontrada"))
        val payload = """{"${Operations.PAYLOAD_ARCHIVO}":"$rutaArchivo"}"""
        db.withTransaction {
            cuentaDao.upsert(
                existente.copy(qrRuta = rutaArchivo, updatedAtLocal = System.currentTimeMillis()),
            )
            pendingWriter.encolar(
                Operations.TIPO_CUENTA,
                localId,
                Operations.OP_UPLOAD,
                payloadJson = payload,
                serverId = existente.serverId,
            )
        }
        return AppResult.Success(rutaArchivo)
    }

    override suspend fun eliminarQr(localId: String): AppResult<Unit> {
        val existente = cuentaDao.getPorId(localId)
            ?: return AppResult.Failure(AppError(AppError.CODE_NOT_FOUND, "cuenta no encontrada"))
        db.withTransaction {
            cuentaDao.upsert(existente.copy(qrRuta = null, updatedAtLocal = System.currentTimeMillis()))
            pendingWriter.encolar(
                Operations.TIPO_CUENTA,
                localId,
                Operations.OP_UPLOAD,
                serverId = existente.serverId,
            )
        }
        return AppResult.Success(Unit)
    }

    override suspend fun cambiarTasa(
        localId: String,
        tasaPorcentaje: Double,
        aplicarPendientes: Boolean,
    ): AppResult<Unit> {
        val existente = cuentaDao.getPorId(localId)
            ?: return AppResult.Failure(AppError(AppError.CODE_NOT_FOUND, "cuenta no encontrada"))
        if (existente.esGeneral) {
            return AppResult.Failure(
                AppError(
                    AppError.CODE_VALIDATION,
                    "la tasa de la cuenta General es derivada (100% − Σ otras) y no es configurable",
                ),
            )
        }
        if (tasaPorcentaje < 0 || tasaPorcentaje > 100) {
            return AppResult.Failure(
                AppError(AppError.CODE_VALIDATION, "la tasa debe estar entre 0 y 100"),
            )
        }
        // Quirk Q1: el backend rechaza `tasa = 0` (binding "required" sobre float64).
        if (tasaPorcentaje == 0.0) {
            return AppResult.Failure(
                AppError(
                    AppError.CODE_VALIDATION,
                    "El backend no admite una tasa de 0 %; usa un valor mayor que 0.",
                ),
            )
        }
        val sumaOtras = generalRateHelper.sumaTasasNoGeneral() - existente.tasaBps
        val nuevaBps = Math.round(tasaPorcentaje * 100)
        if (sumaOtras + nuevaBps > 10_000) {
            return AppResult.Failure(
                AppError(AppError.CODE_CONFLICT, "la suma de tasas superaría 100%"),
            )
        }

        val payload = """{"${Operations.PAYLOAD_TASA}":$tasaPorcentaje,""" +
            """"${Operations.PAYLOAD_APLICAR}":$aplicarPendientes}"""
        db.withTransaction {
            cuentaDao.upsert(
                existente.copy(
                    tasaBps = nuevaBps,
                    syncState = SyncState.PENDING_UPDATE,
                    updatedAtLocal = System.currentTimeMillis(),
                    lastError = null,
                ),
            )
            pendingWriter.encolar(
                Operations.TIPO_CUENTA,
                localId,
                Operations.OP_SET_RATE,
                payloadJson = payload,
                serverId = existente.serverId,
            )
        }
        return AppResult.Success(Unit)
    }
}
