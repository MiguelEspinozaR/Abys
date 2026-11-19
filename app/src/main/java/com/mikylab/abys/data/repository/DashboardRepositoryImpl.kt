package com.mikylab.abys.data.repository

import com.mikylab.abys.core.money.Money
import com.mikylab.abys.core.result.AppResult
import com.mikylab.abys.core.time.LaPaz
import com.mikylab.abys.data.local.dao.DashboardDao
import com.mikylab.abys.data.local.dao.FilaDiaFuente
import com.mikylab.abys.data.remote.AbysApiProvider
import com.mikylab.abys.data.remote.safeApiCall
import com.mikylab.abys.domain.model.BarraDia
import com.mikylab.abys.domain.model.BarraMes
import com.mikylab.abys.domain.model.BloqueMes
import com.mikylab.abys.domain.model.DashboardSummary
import com.mikylab.abys.domain.model.Distribucion
import com.mikylab.abys.domain.model.FuenteTotal
import com.mikylab.abys.domain.model.PuntoHistorial
import com.mikylab.abys.domain.repository.DashboardRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import java.time.LocalDate
import java.time.YearMonth
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Dashboard **v0.3.0**: se calcula **localmente** sobre Room.
 *
 * Replica la semántica de los endpoints de dashboard del backend (`dashboard_service.go`):
 * - todo se agrupa por `dias_trabajados.fecha` (no por `fechaPago`), sumando
 *   `dias_trabajados.monto_enteros` de pagos **activos**;
 * - `por_fuente` incluye fuentes **soft-deleted** para preservar alias/color históricos (D15),
 *   ordenado por total descendente y `fuente_id`;
 * - `summary`: 30 días calendario (incluye hoy, zona La Paz) + Σ histórica;
 * - `weekly`: lunes–domingo de la semana que contiene la fecha, 7 días rellenados;
 * - `monthly`: bloques 1–7, 8–14, 15–21, 22–28 y 29–fin de mes;
 * - `yearly`: 12 meses rellenados con ceros;
 * - `history`: totales mensuales, sin tendencia;
 * - `distribution/monthly|yearly`: Σ por fuente del período.
 *
 * Así el dashboard funciona **sin conexión**; [consultarServidor] permite contrastar los
 * totales locales con los del backend para detectar que al espejo local le faltan pagos.
 */
@Singleton
class DashboardRepositoryImpl @Inject constructor(
    private val dashboardDao: DashboardDao,
    private val apiProvider: AbysApiProvider,
) : DashboardRepository {

    override fun observeResumen(): Flow<DashboardSummary> =
        combine(
            dashboardDao.observeTotalDias(ultimo30dInicio().toString(), LaPaz.hoy().toString()),
            dashboardDao.observeTotalHistorico(),
        ) { ultimos30d, historico ->
            DashboardSummary(
                totalUltimos30Dias = Money(ultimos30d),
                totalHistorico = Money(historico),
            )
        }

    override fun observeHistorial(): Flow<List<PuntoHistorial>> =
        dashboardDao.observeHistorial().map { filas ->
            filas.mapNotNull { fila ->
                val anio = fila.anio.toIntOrNull() ?: return@mapNotNull null
                val mes = fila.mes.toIntOrNull() ?: return@mapNotNull null
                PuntoHistorial(anio = anio, mes = mes, total = Money(fila.total))
            }
        }

    override fun observeSemana(fecha: LocalDate): Flow<List<BarraDia>> {
        val lunes = fecha.minusDays((fecha.dayOfWeek.value - 1).toLong()) // lunes = 1 → 0
        return dashboardDao
            .observeFilasPorDiaFuente(lunes.toString(), lunes.plusDays(6).toString())
            .map { filas -> diasConPorFuente(filas, lunes, lunes.plusDays(6)) }
    }

    override fun observeMes(mes: Int, anio: Int): Flow<List<BloqueMes>> {
        val ym = YearMonth.of(anio, mes)
        return ym.bloques().let { bloques ->
            val inicio = bloques.first().inicio
            val fin = bloques.last().fin
            dashboardDao.observeFilasPorDiaFuente(inicio.toString(), fin.toString())
                .map { filas ->
                    val porFecha = filas.groupBy { it.fecha }
                    bloques.map { bloque ->
                        var total = 0L
                        var fecha = bloque.inicio
                        while (!fecha.isAfter(bloque.fin)) {
                            total += porFecha[fecha.toString()].orEmpty().sumOf { it.total }
                            fecha = fecha.plusDays(1)
                        }
                        bloque.copy(total = Money(total))
                    }
                }
        }
    }

    override fun observeAnio(anio: Int): Flow<List<BarraMes>> =
        dashboardDao
            .observeFilasPorDiaFuente("$anio-01-01", "$anio-12-31")
            .map { filas ->
                val porMes = filas.groupBy { it.fecha.substring(5, 7).toIntOrNull() ?: 0 }
                (1..12).map { mes ->
                    BarraMes(
                        mes = mes,
                        total = Money(porMes[mes].orEmpty().sumOf { it.total }),
                    )
                }
            }

    override fun observeDistribucionMes(mes: Int, anio: Int): Flow<Distribucion> {
        val ym = YearMonth.of(anio, mes)
        return distribucion(ym.atDay(1), ym.atEndOfMonth())
    }

    override fun observeDistribucionAnio(anio: Int): Flow<Distribucion> =
        distribucion(LocalDate.of(anio, 1, 1), LocalDate.of(anio, 12, 31))

    /**
     * Totales del **servidor** (`GET /dashboard/summary`, sin parámetros desde 0.3.0).
     *
     * Se usa para contrastar con el resumen local: si el total de los últimos 30 días del
     * servidor es mayor, al espejo local le faltan pagos (habitual tras instalar la app en
     * otro dispositivo o tras un push fallido) y conviene avisar al usuario.
     */
    override suspend fun consultarServidor(): AppResult<DashboardSummary> =
        safeApiCall {
            val dto = apiProvider.api().dashboardSummary().data
                ?: throw com.mikylab.abys.core.result.AppErrorException(
                    code = com.mikylab.abys.core.result.AppError.CODE_UNKNOWN,
                    message = "El servidor no devolvió el resumen del dashboard",
                )
            DashboardSummary(
                totalUltimos30Dias = Money(dto.total30dCentavos),
                totalHistorico = Money(dto.totalHistoricoCentavos),
            )
        }

    // ── Agregaciones ────────────────────────────────────────────────────────

    /**
     * Construye los 7 días de la semana a partir de las filas `(día, fuente)`.
     *
     * `porFuente` queda ordenado por total descendente y luego `fuente_id` (quirk del backend:
     * orden determinista independiente de la inserción).
     */
    private fun diasConPorFuente(
        filas: List<FilaDiaFuente>,
        desde: LocalDate,
        hasta: LocalDate,
    ): List<BarraDia> {
        val porFecha = filas.groupBy { it.fecha }
        val resultado = mutableListOf<BarraDia>()
        var fecha = desde
        while (!fecha.isAfter(hasta)) {
            val delDia = porFecha[fecha.toString()].orEmpty()
            resultado += BarraDia(
                fecha = fecha,
                total = Money(delDia.sumOf { it.total }),
                porFuente = porFuenteDe(delDia),
            )
            fecha = fecha.plusDays(1)
        }
        return resultado
    }

    private fun distribucion(desde: LocalDate, hasta: LocalDate): Flow<Distribucion> =
        dashboardDao.observeFilasPorDiaFuente(desde.toString(), hasta.toString())
            .map { filas ->
                Distribucion(
                    total = Money(filas.sumOf { it.total }),
                    porFuente = porFuenteDe(filas),
                )
            }

    /** Desglose por fuente, deduplicado por `fuenteLocalId` y orden determinista. */
    private fun porFuenteDe(filas: List<FilaDiaFuente>): List<FuenteTotal> =
        filas
            .groupBy { it.fuenteLocalId }
            .map { (_, grupo) ->
                val primera = grupo.first()
                FuenteTotal(
                    fuenteServerId = primera.fuenteServerId,
                    alias = primera.alias,
                    color = primera.color,
                    total = Money(grupo.sumOf { it.total }),
                )
            }
            .sortedWith(
                compareByDescending<FuenteTotal> { it.total.centavos }
                    .thenBy { it.fuenteServerId ?: Long.MAX_VALUE },
            )

    /** Bloques del mes (v0.3.0): 1–7, 8–14, 15–21, 22–28 y 29–fin. */
    private fun YearMonth.bloques(): List<BloqueMes> {
        val resultado = mutableListOf<BloqueMes>()
        var inicio = 1
        var bloque = 1
        while (inicio <= lengthOfMonth()) {
            val fin = minOf(inicio + 6, lengthOfMonth())
            resultado += BloqueMes(
                bloque = bloque,
                inicio = atDay(inicio),
                fin = atDay(fin),
                total = Money.ZERO,
            )
            inicio = fin + 1
            bloque++
        }
        return resultado
    }

    /** Inicio del rango de 30 días que incluye hoy (backend: `America/La_Paz`). */
    private fun ultimo30dInicio(): LocalDate = LaPaz.hoy().minusDays(29)
}
