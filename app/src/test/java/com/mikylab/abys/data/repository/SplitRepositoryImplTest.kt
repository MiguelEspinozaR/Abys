package com.mikylab.abys.data.repository

import com.mikylab.abys.core.result.AppResult
import com.mikylab.abys.data.local.TransactionRunner
import com.mikylab.abys.data.local.dao.CuentaDao
import com.mikylab.abys.data.local.dao.PagoDao
import com.mikylab.abys.data.local.dao.SplitDao
import com.mikylab.abys.data.local.entity.CuentaEntity
import com.mikylab.abys.data.local.entity.PagoEntity
import com.mikylab.abys.data.local.entity.SplitEntity
import com.mikylab.abys.data.local.entity.TransaccionEntity
import com.mikylab.abys.data.sync.Operations
import com.mikylab.abys.domain.model.SyncState
import io.mockk.Runs
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.just
import io.mockk.mockk
import io.mockk.slot
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Tests del repositorio de splits (flujo **Splits**): cálculo local, un split por pago,
 * congelación de realizadas (BR-021/060) y encolado de la realización (BR-072).
 */
class SplitRepositoryImplTest {

    private lateinit var splitDao: SplitDao
    private lateinit var pagoDao: PagoDao
    private lateinit var cuentaDao: CuentaDao
    private lateinit var pendingWriter: PendingWriter
    private lateinit var repo: SplitRepositoryImpl

    private val transactions = object : TransactionRunner {
        override suspend fun <R> run(block: suspend () -> R): R = block()
    }

    private val general = CuentaEntity(
        localId = "cuenta-general",
        serverId = 1L,
        alias = "General",
        numero = null,
        banco = null,
        qrRuta = null,
        esGeneral = true,
        tasaBps = 0L,
        createdAt = 0L,
        updatedAt = 0L,
        deletedAt = null,
        syncState = SyncState.SYNCED,
        updatedAtLocal = 0L,
        updatedAtServer = 0L,
        lastError = null,
    )

    private val otra = CuentaEntity(
        localId = "cuenta-2",
        serverId = 2L,
        alias = "Socia",
        numero = null,
        banco = null,
        qrRuta = null,
        esGeneral = false,
        tasaBps = 2_000L, // 20 %
        createdAt = 0L,
        updatedAt = 0L,
        deletedAt = null,
        syncState = SyncState.SYNCED,
        updatedAtLocal = 0L,
        updatedAtServer = 0L,
        lastError = null,
    )

    private val pago = PagoEntity(
        localId = "pago-1",
        serverId = 42L,
        fuenteLocalId = "fuente-1",
        fechaPago = "2026-08-27",
        montoEnteros = 26_500L,
        metodoPago = "efectivo",
        notas = null,
        imagenRuta = null,
        createdAt = 0L,
        updatedAt = 0L,
        deletedAt = null,
        syncState = SyncState.SYNCED,
        updatedAtLocal = 0L,
        updatedAtServer = 0L,
        lastError = null,
    )

    @Before
    fun setUp() {
        splitDao = mockk(relaxed = true)
        pagoDao = mockk(relaxed = true)
        cuentaDao = mockk(relaxed = true)
        pendingWriter = mockk(relaxed = true)

        coEvery { pagoDao.getPorId("pago-1") } returns pago
        coEvery { cuentaDao.getAll() } returns listOf(general, otra)
        coEvery { splitDao.getPorPago(any()) } returns null

        repo = SplitRepositoryImpl(splitDao, pagoDao, cuentaDao, pendingWriter, transactions)
    }

    private fun transaccion(
        localId: String = "tx-1",
        splitLocalId: String = "split-1",
        cuentaLocalId: String? = "cuenta-2",
        monto: Long = 5_300L,
        tasa: Long = 2_000L,
        alias: String = "Socia",
        realizado: Boolean = false,
    ) = TransaccionEntity(
        localId = localId,
        serverId = null,
        splitLocalId = splitLocalId,
        cuentaLocalId = cuentaLocalId,
        montoEnteros = monto,
        tasaBps = tasa,
        aliasSnapshot = alias,
        realizado = realizado,
        fechaRealizacion = null,
        createdAt = 0L,
        updatedAt = 0L,
        syncState = SyncState.SYNCED,
        updatedAtLocal = 0L,
        lastError = null,
    )

    @Test
    fun `generarSplit calcula en local y encola la operacion`() = runTest {
        val slotSplit = slot<SplitEntity>()
        val slotTxs = slot<List<TransaccionEntity>>()
        coEvery { splitDao.upsert(capture(slotSplit)) } returns Unit
        coEvery { splitDao.upsertTransacciones(capture(slotTxs)) } returns Unit

        val resultado = repo.generarSplit("pago-1", "preciso")

        assertTrue(resultado is AppResult.Success)
        // 20 % de 265,00 Bs = 53,00 Bs; General se queda con el resto (212,00 Bs).
        assertEquals(5_300L, slotTxs.captured.first { it.cuentaLocalId == "cuenta-2" }.montoEnteros)
        assertEquals(21_200L, slotTxs.captured.first { it.cuentaLocalId == "cuenta-general" }.montoEnteros)
        // Invariante BR-081: Σ transacciones = monto del pago.
        assertEquals(pago.montoEnteros, slotTxs.captured.sumOf { it.montoEnteros })
        // v0.4.0: el pendiente persistido excluye la cuenta General (reserva de redondeo).
        assertEquals(5_300L, slotSplit.captured.totalPendiente)
        assertEquals(0L, slotSplit.captured.totalRealizado)
        coVerify {
            pendingWriter.encolar(
                Operations.TIPO_SPLIT,
                slotSplit.captured.localId,
                Operations.OP_UPSERT,
                null,
                null,
            )
        }
    }

    @Test
    fun `generarSplit falla si el pago ya tiene split`() = runTest {
        coEvery { splitDao.getPorPago("pago-1") } returns SplitEntity(
            localId = "split-existente",
            serverId = 5L,
            pagoLocalId = "pago-1",
            modoCalculo = "preciso",
            totalPendiente = 26_500L,
            totalRealizado = 0L,
            createdAt = 0L,
            updatedAt = 0L,
            syncState = SyncState.SYNCED,
            updatedAtLocal = 0L,
            updatedAtServer = 0L,
            lastError = null,
        )

        val resultado = repo.generarSplit("pago-1", "preciso")

        assertTrue(resultado is AppResult.Failure)
        assertEquals(
            "el pago ya tiene un split (máximo 1 por pago)",
            (resultado as AppResult.Failure).error.message,
        )
    }

    @Test
    fun `marcarRealizada congela la transaccion y encola por su localId`() = runTest {
        val tx = transaccion()
        coEvery { splitDao.getTransaccion("tx-1") } returns tx
        coEvery { splitDao.marcarRealizada(any(), any(), any(), any(), any()) } returns Unit

        val resultado = repo.marcarRealizada("tx-1")

        assertTrue(resultado is AppResult.Success)
        assertTrue((resultado as AppResult.Success).data.realizado)
        coVerify { splitDao.marcarRealizada("tx-1", true, any(), SyncState.PENDING_UPDATE, any()) }
        // La operación apunta a la **transacción** (no al split) para poder resolver su
        // `serverId` en el momento del push.
        coVerify { pendingWriter.encolar(Operations.TIPO_TRANSACCION, "tx-1", Operations.OP_REALIZE, null, null) }
    }

    @Test
    fun `recalcularSplit congela las realizadas y recalcula las pendientes`() = runTest {
        val split = SplitEntity(
            localId = "split-1",
            serverId = 5L,
            pagoLocalId = "pago-1",
            modoCalculo = "preciso",
            totalPendiente = 26_500L,
            totalRealizado = 5_300L,
            createdAt = 0L,
            updatedAt = 0L,
            syncState = SyncState.SYNCED,
            updatedAtLocal = 0L,
            updatedAtServer = 0L,
            lastError = null,
        )
        val realizada = transaccion(
            localId = "tx-realizada",
            monto = 5_300L,
            tasa = 2_000L,
            alias = "Socia",
            realizado = true,
        )
        val pendiente = transaccion(localId = "tx-pendiente", monto = 5_300L, alias = "Socia")
        val generalTx = transaccion(
            localId = "tx-general",
            cuentaLocalId = "cuenta-general",
            monto = 21_200L,
            tasa = 0L,
            alias = "General",
        )
        coEvery { splitDao.getPorId("split-1") } returns split
        coEvery { splitDao.getTransacciones("split-1") } returns listOf(realizada, pendiente, generalTx)
        coEvery { splitDao.upsert(any()) } returns Unit
        coEvery { splitDao.reemplazarTransacciones(any(), any()) } just Runs

        val resultado = repo.recalcularSplit("split-1")

        assertTrue(resultado is AppResult.Success)
        val txs = (resultado as AppResult.Success).data.transacciones
        // La realizada conserva su monto (BR-021: inmutable).
        assertEquals(5_300L, txs.first { it.localId == "tx-realizada" }.monto.centavos)
        // La pendiente de la cuenta no General se recalcula con la tasa vigente.
        assertEquals(5_300L, txs.first { it.localId == "tx-pendiente" }.monto.centavos)
        // General absorbe el resto: 26.500 − 5.300 (realizada) − 5.300 (Socia).
        assertEquals(15_900L, txs.first { it.localId == "tx-general" }.monto.centavos)
        // Σ = monto del pago (BR-081).
        assertEquals(pago.montoEnteros, txs.sumOf { it.monto.centavos })
        coVerify { pendingWriter.encolar(Operations.TIPO_SPLIT, "split-1", Operations.OP_UPSERT, null, 5L) }
    }

    @Test
    fun `eliminarSplit con realizadas se rechaza`() = runTest {
        coEvery { splitDao.getPorId("split-1") } returns SplitEntity(
            localId = "split-1",
            serverId = 5L,
            pagoLocalId = "pago-1",
            modoCalculo = "preciso",
            totalPendiente = 0L,
            totalRealizado = 26_500L,
            createdAt = 0L,
            updatedAt = 0L,
            syncState = SyncState.SYNCED,
            updatedAtLocal = 0L,
            updatedAtServer = 0L,
            lastError = null,
        )
        coEvery { splitDao.getTransacciones("split-1") } returns listOf(
            transaccion(realizado = true),
        )

        val resultado = repo.eliminarSplit("split-1")

        assertTrue(resultado is AppResult.Failure)
        assertEquals(
            "no se puede eliminar un split con transacciones realizadas",
            (resultado as AppResult.Failure).error.message,
        )
    }
}
