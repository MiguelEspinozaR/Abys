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

/**
 * Día trabajado (pertenece a un único pago, fecha única por pago).
 *
 * Desde la v0.3.0 del API cada día lleva su **monto en centavos** (`monto_enteros`);
 * el monto del pago es **derivado**: Σ de los días.
 */
data class DiaTrabajado(
    val localId: String,
    val serverId: Long?,
    val fecha: LocalDate,
    val monto: Money,
)

/** Día trabajado de un borrador (entrada de la UI): fecha + monto en centavos. */
data class DiaTrabajadoDraft(
    val fecha: LocalDate,
    val monto: Money,
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
    /** Id del split **en el servidor** (`null` si el split es local y aún no se ha subido). */
    val splitId: Long?,
    val splitModo: ModoCalculo?,
    /**
     * El pago tiene un split **local** (BR-030: como máximo uno por pago).
     *
     * No se deduce de [splitId]: un split creado en el dispositivo y todavía no sincronizado
     * no tiene `serverId`, pero el pago ya está "bloqueado" para nuevas operaciones.
     */
    val tieneSplit: Boolean,
    val syncState: SyncState = SyncState.SYNCED,
    val lastError: String? = null,
) {
    val esPendienteDeSync: Boolean get() = syncState.isPending || syncState == SyncState.FAILED
}

/** Borrador de pago (entrada de la UI para crear/editar). */
data class PagoDraft(
    val fuenteLocalId: String,
    val fechaPago: LocalDate,
    val metodoPago: MetodoPago,
    val notas: String?,
    /** Días con su monto; el total del pago es **derivado** (Σ de los días, v0.3.0). */
    val diasTrabajados: List<DiaTrabajadoDraft>,
) {
    /** Σ de los montos por día: el total del pago. */
    val monto: Money get() = Money(diasTrabajados.sumOf { it.monto.centavos })
}

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

/**
 * Resumen del dashboard (v0.3.0, `GET /dashboard/summary` **sin parámetros**).
 *
 * Se calcula **localmente** sobre Room y se contrasta con el servidor: si el total de los
 * últimos 30 días del servidor es mayor, al espejo local le faltan pagos por sincronizar.
 */
data class DashboardSummary(
    /** Σ de los montos por día de los últimos 30 días calendario (incluye hoy, zona La Paz). */
    val totalUltimos30Dias: Money,
    /** Σ histórica de los días trabajados. */
    val totalHistorico: Money,
)

/** Desglose por fuente del weekly y de las distribuciones (v0.3.0). */
data class FuenteTotal(
    val fuenteServerId: Long?,
    val alias: String,
    val color: String,
    val total: Money,
)

/** Punto del histórico mensual. */
data class PuntoHistorial(
    val anio: Int,
    val mes: Int,
    val total: Money,
)

/** Barras del gráfico semanal (siempre 7 días, apiladas por fuente). */
data class BarraDia(
    val fecha: LocalDate,
    val total: Money,
    /** Desglose por fuente del día (ordenado por total descendente, luego `fuente_id`). */
    val porFuente: List<FuenteTotal>,
)

/** Bloques del gráfico mensual (v0.3.0): 1–7, 8–14, 15–21, 22–28 y 29–fin de mes. */
data class BloqueMes(
    val bloque: Int,
    val inicio: LocalDate,
    val fin: LocalDate,
    val total: Money,
)

/** Barras del gráfico anual (siempre 12 meses). */
data class BarraMes(
    val mes: Int,
    val total: Money,
)

/** Distribución por fuente (mensual o anual, v0.3.0). */
data class Distribucion(
    val total: Money,
    /** Ordenado por total descendente y `fuente_id`. */
    val porFuente: List<FuenteTotal>,
)
