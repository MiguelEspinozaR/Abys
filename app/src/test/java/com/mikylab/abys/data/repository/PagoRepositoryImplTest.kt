package com.mikylab.abys.data.repository

import com.mikylab.abys.core.money.Money
import com.mikylab.abys.core.result.AppResult
import com.mikylab.abys.data.local.TransactionRunner
import com.mikylab.abys.data.local.dao.FuenteDao
import com.mikylab.abys.data.local.dao.PagoDao
import com.mikylab.abys.data.local.dao.SplitDao
import com.mikylab.abys.data.local.entity.DiaTrabajadoEntity
import com.mikylab.abys.data.local.entity.FuenteEntity
import com.mikylab.abys.data.local.entity.PagoEntity
import com.mikylab.abys.data.local.entity.SplitEntity
import com.mikylab.abys.data.sync.Operations
import com.mikylab.abys.domain.model.MetodoPago
import com.mikylab.abys.domain.model.PagoDraft
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
import java.time.LocalDate

/**
 * Tests del repositorio de pagos (flujo **Ingresos**): escritura local-first, cola de
 * pendientes y reglas de negocio comprobadas **sin red**.
 */
class PagoRepositoryImplTest {

    private lateinit var pagoDao: PagoDao
    private lateinit var fuenteDao: FuenteDao
    private lateinit var splitDao: SplitDao
    private lateinit var pendingWriter: PendingWriter
    private lateinit var repo: PagoRepositoryImpl

    /** Transacciones reales en el tests (el bloque se ejecuta tal cual). */
    private val transactions = object : TransactionRunner {
        override suspend fun <R> run(block: suspend () -> R): R = block()
    }

    private val fuente = FuenteEntity(
        localId = "fuente-1",
        serverId = 10L,
        alias = "Principal",
        color = "#3b82f6",
        logoRuta = null,
        splitAuto = false,
        splitAutoModo = null,
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
        pagoDao = mockk(relaxed = true)
        fuenteDao = mockk(relaxed = true)
        splitDao = mockk(relaxed = true)
        pendingWriter = mockk(relaxed = true)

        coEvery { fuenteDao.getPorId("fuente-1") } returns fuente
        coEvery { splitDao.getPorPago(any()) } returns null
        coEvery { splitDao.contarTransaccionesRealizadas(any()) } returns 0

        repo = PagoRepositoryImpl(pagoDao, fuenteDao, splitDao, pendingWriter, transactions)
    }

    private fun pago(
        localId: String = "pago-1",
        serverId: Long? = 42L,
        monto: Long = 26_500L,
        syncState: SyncState = SyncState.SYNCED,
    ) = PagoEntity(
        localId = localId,
        serverId = serverId,
        fuenteLocalId = "fuente-1",
        fechaPago = "2026-08-27",
        montoEnteros = monto,
        metodoPago = "efectivo",
        notas = null,
        imagenRuta = null,
        createdAt = 0L,
        updatedAt = 0L,
        deletedAt = null,
        syncState = syncState,
        updatedAtLocal = 0L,
        updatedAtServer = 0L,
        lastError = null,
    )

    private fun draft(
        monto: Long = 26_500L,
        dias: List<LocalDate> = listOf(LocalDate.of(2026, 8, 27)),
    ) = PagoDraft(
        fuenteLocalId = "fuente-1",
        fechaPago = LocalDate.of(2026, 8, 27),
        monto = Money(monto),
        metodoPago = MetodoPago.EFECTIVO,
        notas = null,
        diasTrabajados = dias,
    )

    @Test
    fun `crearPago escribe en Room y encola la operacion`() = runTest {
        val slotPago = slot<PagoEntity>()
        val slotDias = slot<List<DiaTrabajadoEntity>>()
        coEvery { pagoDao.upsert(capture(slotPago)) } returns Unit
        coEvery { pagoDao.upsertDias(capture(slotDias)) } returns Unit

        val resultado = repo.crearPago(draft())

        assertTrue(resultado is AppResult.Success)
        assertEquals(SyncState.PENDING_CREATE, slotPago.captured.syncState)
        assertEquals(26_500L, slotPago.captured.montoEnteros)
        assertEquals(1, slotDias.captured.size)
        assertEquals("2026-08-27", slotDias.captured.first().fecha)
        coVerify { pendingWriter.encolar(Operations.TIPO_PAGO, slotPago.captured.localId, Operations.OP_UPSERT) }
    }

    @Test
    fun `crearPago con draft invalido no escribe nada`() = runTest {
        val resultado = repo.crearPago(draft(dias = emptyList()))

        assertTrue(resultado is AppResult.Failure)
        assertEquals(
            "un pago debe tener al menos un día trabajado",
            (resultado as AppResult.Failure).error.message,
        )
        coVerify(exactly = 0) { pagoDao.upsert(any()) }
        coVerify(exactly = 0) { pendingWriter.encolar(any(), any(), any(), any(), any()) }
    }

    @Test
    fun `actualizarPago conserva los dias que no cambian`() = runTest {
        val existente = pago(syncState = SyncState.SYNCED)
        val diaExistente = DiaTrabajadoEntity(
            localId = "dia-1",
            serverId = 77L,
            pagoLocalId = "pago-1",
            fecha = "2026-08-27",
            syncState = SyncState.SYNCED,
            updatedAtLocal = 0L,
        )
        coEvery { pagoDao.getPorId("pago-1") } returns existente
        coEvery { pagoDao.getDias("pago-1") } returns listOf(diaExistente)
        val slotDias = slot<List<DiaTrabajadoEntity>>()
        coEvery { pagoDao.reemplazarDias("pago-1", capture(slotDias)) } just Runs

        val resultado = repo.actualizarPago(
            "pago-1",
            draft(dias = listOf(LocalDate.of(2026, 8, 27), LocalDate.of(2026, 8, 28))),
        )

        assertTrue(resultado is AppResult.Success)
        assertEquals(2, slotDias.captured.size)
        // El día que no cambia conserva su fila local (y su `serverId`).
        val conservado = slotDias.captured.first { it.fecha == "2026-08-27" }
        assertEquals("dia-1", conservado.localId)
        assertEquals(77L, conservado.serverId)
        // El día nuevo se inserta con `serverId = null` (lo asigna el servidor).
        val nuevo = slotDias.captured.first { it.fecha == "2026-08-28" }
        assertEquals(null, nuevo.serverId)
    }

    @Test
    fun `eliminarPago con transacciones realizadas se rechaza sin red`() = runTest {
        coEvery { pagoDao.getPorId("pago-1") } returns pago()
        coEvery { splitDao.contarTransaccionesRealizadas("pago-1") } returns 1

        val resultado = repo.eliminarPago("pago-1")

        assertTrue(resultado is AppResult.Failure)
        assertEquals(
            "no se puede eliminar un pago con transacciones realizadas",
            (resultado as AppResult.Failure).error.message,
        )
        coVerify(exactly = 0) { pendingWriter.encolar(any(), any(), any(), any(), any()) }
    }

    @Test
    fun `eliminarPago pendiente se borra solo en local`() = runTest {
        coEvery { pagoDao.getPorId("pago-1") } returns pago(serverId = null)
        coEvery { pagoDao.borrarDiasDe("pago-1") } returns Unit

        val resultado = repo.eliminarPago("pago-1")

        assertTrue(resultado is AppResult.Success)
        coVerify { pagoDao.borrarDiasDe("pago-1") }
        coVerify { pagoDao.marcarEliminado("pago-1", any(), SyncState.SYNCED, any()) }
        coVerify(exactly = 0) { pendingWriter.encolar(any(), any(), any(), any(), any()) }
    }

    @Test
    fun `eliminarPago sincronizado encola el borrado en el servidor`() = runTest {
        coEvery { pagoDao.getPorId("pago-1") } returns pago(serverId = 42L)

        val resultado = repo.eliminarPago("pago-1")

        assertTrue(resultado is AppResult.Success)
        coVerify { pagoDao.marcarEliminado("pago-1", any(), SyncState.PENDING_DELETE, any()) }
        coVerify { pendingWriter.encolar(Operations.TIPO_PAGO, "pago-1", Operations.OP_DELETE, null, 42L) }
    }

    @Test
    fun `no se puede cambiar el monto de un pago con split`() = runTest {
        val existente = pago(monto = 26_500L)
        coEvery { pagoDao.getPorId("pago-1") } returns existente
        coEvery { splitDao.getPorPago("pago-1") } returns SplitEntity(
            localId = "split-1",
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

        val resultado = repo.actualizarPago("pago-1", draft(monto = 30_000L))

        assertTrue(resultado is AppResult.Failure)
        assertTrue((resultado as AppResult.Failure).error.isImmutable)
        coVerify(exactly = 0) { pagoDao.upsert(any()) }
    }
}
