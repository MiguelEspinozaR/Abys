package com.mikylab.abys.data.local

import androidx.room.withTransaction
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Frontera transaccional de Room.
 *
 * Los repositorios offline-first necesitan que la fila modificada y su operación en la cola de
 * pendientes se escriban **en la misma transacción** (nunca queda un cambio local sin operación).
 *
 * Se abstrae `RoomDatabase.withTransaction` detrás de una interfaz para que los repositorios
 * sean **testeables sin Android** (tests JVM con MockK): en producción se inyecta
 * [RoomTransactionRunner]; en los tests, un doble que ejecuta el bloque directamente.
 */
interface TransactionRunner {

    /** Ejecuta [block] dentro de una transacción de Room. */
    suspend fun <R> run(block: suspend () -> R): R
}

/** Implementación real sobre Room. */
@Singleton
class RoomTransactionRunner @Inject constructor(
    private val db: AbysDatabase,
) : TransactionRunner {

    override suspend fun <R> run(block: suspend () -> R): R = db.withTransaction { block() }
}
