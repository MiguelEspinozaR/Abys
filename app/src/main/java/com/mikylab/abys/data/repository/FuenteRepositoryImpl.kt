package com.mikylab.abys.data.repository

import com.mikylab.abys.core.result.AppError
import com.mikylab.abys.core.result.AppResult
import com.mikylab.abys.data.local.TransactionRunner
import com.mikylab.abys.data.local.dao.FuenteDao
import com.mikylab.abys.data.local.entity.FuenteEntity
import com.mikylab.abys.data.mapper.DomainMappers.toDomain
import com.mikylab.abys.data.sync.Operations
import com.mikylab.abys.domain.model.Fuente
import com.mikylab.abys.domain.model.SyncState
import com.mikylab.abys.domain.repository.FuenteRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/** Repositorio de fuentes (local-first). */
@Singleton
class FuenteRepositoryImpl @Inject constructor(
    private val fuenteDao: FuenteDao,
    private val pendingWriter: PendingWriter,
    private val transactions: TransactionRunner,
) : FuenteRepository {

    override fun observeFuentes(): Flow<List<Fuente>> =
        fuenteDao.observeActivas().map { lista -> lista.map { it.toDomain() } }

    override fun observeFuente(localId: String): Flow<Fuente?> =
        fuenteDao.observePorId(localId).map { it?.toDomain() }

    override suspend fun crearFuente(
        alias: String,
        color: String,
        splitAuto: Boolean,
        splitAutoModo: String?,
    ): AppResult<Fuente> {
        if (alias.isBlank()) {
            return AppResult.Failure(
                AppError(AppError.CODE_VALIDATION, "el alias de la fuente es obligatorio"),
            )
        }
        val localId = UUID.randomUUID().toString()
        val ahora = System.currentTimeMillis()
        val entidad = FuenteEntity(
            localId = localId,
            serverId = null,
            alias = alias.trim(),
            color = color.ifBlank { "#3b82f6" },
            logoRuta = null,
            splitAuto = splitAuto,
            splitAutoModo = splitAutoModo,
            createdAt = ahora,
            updatedAt = ahora,
            deletedAt = null,
            syncState = SyncState.PENDING_CREATE,
            updatedAtLocal = ahora,
            updatedAtServer = null,
            lastError = null,
        )
        transactions.run {
            fuenteDao.upsert(entidad)
            pendingWriter.encolar(Operations.TIPO_FUENTE, localId, Operations.OP_UPSERT)
        }
        return AppResult.Success(entidad.toDomain())
    }

    override suspend fun actualizarFuente(
        localId: String,
        alias: String,
        color: String,
        splitAuto: Boolean,
        splitAutoModo: String?,
    ): AppResult<Unit> {
        val existente = fuenteDao.getPorId(localId)
            ?: return AppResult.Failure(AppError(AppError.CODE_NOT_FOUND, "fuente no encontrada"))
        if (alias.isBlank()) {
            return AppResult.Failure(
                AppError(AppError.CODE_VALIDATION, "el alias de la fuente es obligatorio"),
            )
        }
        val actualizada = existente.copy(
            alias = alias.trim(),
            color = color.ifBlank { "#3b82f6" },
            splitAuto = splitAuto,
            splitAutoModo = splitAutoModo,
            updatedAt = System.currentTimeMillis(),
            syncState = SyncState.PENDING_UPDATE,
            updatedAtLocal = System.currentTimeMillis(),
            lastError = null,
        )
        transactions.run {
            fuenteDao.upsert(actualizada)
            pendingWriter.encolar(Operations.TIPO_FUENTE, localId, Operations.OP_UPSERT)
        }
        return AppResult.Success(Unit)
    }

    override suspend fun eliminarFuente(localId: String): AppResult<Unit> {
        val existente = fuenteDao.getPorId(localId)
            ?: return AppResult.Failure(AppError(AppError.CODE_NOT_FOUND, "fuente no encontrada"))
        val ahora = System.currentTimeMillis()
        transactions.run {
            if (existente.serverId == null) {
                fuenteDao.marcarSincronizado(localId, SyncState.SYNCED, null, null, null)
            } else {
                fuenteDao.marcarEliminado(localId, ahora, SyncState.PENDING_DELETE, ahora)
                pendingWriter.encolar(
                    Operations.TIPO_FUENTE,
                    localId,
                    Operations.OP_DELETE,
                    serverId = existente.serverId,
                )
            }
        }
        return AppResult.Success(Unit)
    }

    override suspend fun subirLogo(localId: String, rutaArchivo: String): AppResult<String> {
        val existente = fuenteDao.getPorId(localId)
            ?: return AppResult.Failure(AppError(AppError.CODE_NOT_FOUND, "fuente no encontrada"))
        val payload = """{"${Operations.PAYLOAD_ARCHIVO}":"$rutaArchivo"}"""
        transactions.run {
            fuenteDao.upsert(
                existente.copy(
                    logoRuta = rutaArchivo,
                    syncState = SyncState.PENDING_UPDATE,
                    updatedAtLocal = System.currentTimeMillis(),
                    lastError = null,
                ),
            )
            pendingWriter.encolar(
                Operations.TIPO_FUENTE,
                localId,
                Operations.OP_UPLOAD,
                payloadJson = payload,
                serverId = existente.serverId,
            )
        }
        return AppResult.Success(rutaArchivo)
    }

    override suspend fun eliminarLogo(localId: String): AppResult<Unit> {
        val existente = fuenteDao.getPorId(localId)
            ?: return AppResult.Failure(AppError(AppError.CODE_NOT_FOUND, "fuente no encontrada"))
        transactions.run {
            fuenteDao.upsert(
                existente.copy(
                    logoRuta = null,
                    syncState = SyncState.PENDING_UPDATE,
                    updatedAtLocal = System.currentTimeMillis(),
                    lastError = null,
                ),
            )
            pendingWriter.encolar(
                Operations.TIPO_FUENTE,
                localId,
                Operations.OP_DELETE_LOGO,
                serverId = existente.serverId,
            )
        }
        return AppResult.Success(Unit)
    }
}
