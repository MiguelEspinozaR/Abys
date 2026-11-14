package com.mikylab.abys.domain.model

import com.mikylab.abys.core.money.Money
import com.mikylab.abys.core.money.Percent
import java.time.Instant
import java.time.LocalDate

/**
 * Fuente de ingreso (entidad independiente y reutilizable, BR-020).
 */
data class Fuente(
    val localId: String,
    val serverId: Long?,
    val alias: String,
    val color: String,
    val logoRuta: String?,
    val splitAuto: Boolean,
    val splitAutoModo: ModoCalculo?,
    val syncState: SyncState = SyncState.SYNCED,
    val lastError: String? = null,
)

/** Día trabajado (pertenece a un único pago, fecha única por pago). */
data class DiaTrabajado(
    val localId: String,
    val serverId: Long?,
    val fecha: LocalDate,
)

/**
 * Pago (ingreso laboral) con sus días trabajados.
 */
data class Pago(
    val localId: String,
    val serverId: Long?,
    val fuente: Fuente,
    val fechaPago: LocalDate,
    val monto: Money,
    val metodoPago: MetodoPago,
    val notas: String?,
    val imagenRuta: String?,
    val diasTrabajados: List<DiaTrabajado>,
    val splitId: Long?,
    val splitModo: ModoCalculo?,
    val syncState: SyncState = SyncState.SYNCED,
    val lastError: String? = null,
) {
    val tieneSplit: Boolean get() = splitId != null
    val esPendienteDeSync: Boolean get() = syncState.isPending || syncState == SyncState.FAILED
}

/** Borrador de pago (entrada de la UI para crear/editar). */
data class PagoDraft(
    val fuenteLocalId: String,
    val fechaPago: LocalDate,
    val monto: Money,
    val metodoPago: MetodoPago,
    val notas: String?,
    val diasTrabajados: List<LocalDate>,
)

/** Cuenta de distribución (BR-040..043). */
data class Cuenta(
    val localId: String,
    val serverId: Long?,
    val alias: String,
    val numero: String?,
    val banco: String?,
    val qrRuta: String?,
    val esGeneral: Boolean,
    val tasa: Percent,
    val syncState: SyncState = SyncState.SYNCED,
    val lastError: String? = null,
)

/** Entrada del historial de tasas (la vigente es la última registrada). */
data class HistorialTasa(
    val localId: String,
    val serverId: Long?,
    val cuentaLocalId: String,
    val tasa: Percent,
    val aplicadaDesde: Instant?,
)

/** Transacción (snapshot congelado de alias y tasa). */
data class Transaccion(
    val localId: String,
    val serverId: Long?,
    val splitLocalId: String,
    val cuentaLocalId: String?,
    val monto: Money,
    val tasa: Percent,
    val aliasSnapshot: String,
    val realizado: Boolean,
    val fechaRealizacion: Instant?,
    val syncState: SyncState = SyncState.SYNCED,
)

/** Split de un pago (0..1 por pago, BR-030). */
data class Split(
    val localId: String,
    val serverId: Long?,
    val pagoLocalId: String,
    val modoCalculo: ModoCalculo,
    val transacciones: List<Transaccion>,
    val totalPendiente: Money,
    val totalRealizado: Money,
    val syncState: SyncState = SyncState.SYNCED,
) {
    val tieneRealizadas: Boolean get() = transacciones.any { it.realizado }
}

/** Configuración global: modo de split por defecto. */
data class SplitSettings(
    val modoDefault: ModoCalculo = ModoCalculo.DEFAULT,
    val syncState: SyncState = SyncState.SYNCED,
)

/** Estado de salud del backend. */
data class HealthInfo(
    val conexion: String,
    val latenciaMs: Double,
    val versionPg: String,
    val tamanoDb: String,
    val tablas: List<TablaInfo>,
)

data class TablaInfo(val nombre: String, val registros: Long)

/** Filtros de listado de pagos (mismo contrato que `GET /pagos`). */
data class FiltroPagos(
    val fechaInicio: LocalDate? = null,
    val fechaFin: LocalDate? = null,
    val fuenteLocalId: String? = null,
    val metodoPago: MetodoPago? = null,
    val page: Int = 1,
    val pageSize: Int = 20,
)

/** Resumen del dashboard (calculado localmente sobre Room). */
data class DashboardSummary(
    val mes: Int,
    val anio: Int,
    val total: Money,
    val cantidadPagos: Int,
    val diasTrabajados: Int,
)

/** Punto del histórico mensual. */
data class PuntoHistorial(
    val anio: Int,
    val mes: Int,
    val total: Money,
    val cantidadPagos: Int,
)

/**
 * Resumen del mes calculado por el **servidor** (`GET /dashboard/summary`).
 *
 * Se usa para contrastar el resumen local (calculado sobre Room): si difieren, significa que
 * al espejo local le faltan pagos → la app avisa de que hay datos por sincronizar.
 */
data class DashboardResumenServidor(
    val mes: Int,
    val anio: Int,
    val total: Money,
    val cantidadPagos: Int,
    val diasTrabajados: Int,
)

/** Barras del gráfico semanal (siempre 7 días). */
data class BarraDia(
    val fecha: LocalDate,
    val total: Money,
    val cantidadPagos: Int,
)

/** Barras del gráfico mensual (semanas de 7 días desde el día 1). */
data class BarraSemana(
    val semana: Int,
    val inicio: LocalDate,
    val fin: LocalDate,
    val total: Money,
    val cantidadPagos: Int,
)

/** Barras del gráfico anual (siempre 12 meses). */
data class BarraMes(
    val mes: Int,
    val total: Money,
    val cantidadPagos: Int,
)
