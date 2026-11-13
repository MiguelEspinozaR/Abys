package com.mikylab.abys.data.repository

import com.mikylab.abys.core.money.Money
import com.mikylab.abys.data.local.dao.DashboardDao
import com.mikylab.abys.data.local.dao.PagoDao
import com.mikylab.abys.domain.model.BarraDia
import com.mikylab.abys.domain.model.BarraMes
import com.mikylab.abys.domain.model.BarraSemana
import com.mikylab.abys.domain.model.DashboardSummary
import com.mikylab.abys.domain.model.PuntoHistorial
import com.mikylab.abys.domain.repository.DashboardRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.time.LocalDate
import java.time.YearMonth
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Dashboard calculado localmente sobre Room.
 *
 * Replica la semántica de los endpoints de dashboard:
 * - `summary`: Σ montos y nº de pagos con `fecha_pago` en el mes + nº de **días distintos**
 *   trabajados en el mes (de pagos activos);
 * - `weekly`: 7 días (lunes→domingo) de la semana que contiene la fecha, rellenados con ceros;
 * - `monthly`: semanas de 7 días desde el día 1, la última recortada al final del mes;
 * - `yearly`: 12 meses rellenados con ceros;
 * - `history`: agrupación `(anio, mes)` de pagos activos.
 */
@Singleton
class DashboardRepositoryImpl @Inject constructor(
    private val dashboardDao: DashboardDao,
    private val pagoDao: PagoDao,
) : DashboardRepository {

    override fun observeResumen(mes: Int, anio: Int): Flow<DashboardSummary> {
        val inicio = YearMonth.of(anio, mes).atDay(1).toString()
        val fin = YearMonth.of(anio, mes).atEndOfMonth().toString()
        return kotlinx.coroutines.flow.combine(
            dashboardDao.observeTotales(inicio, fin),
            dashboardDao.observeDiasTrabajados(inicio, fin),
        ) { totales, dias ->
            DashboardSummary(
                mes = mes,
                anio = anio,
                total = Money(totales.total),
                cantidadPagos = totales.cantidad,
                diasTrabajados = dias,
            )
        }
    }

    override fun observeHistorial(): Flow<List<PuntoHistorial>> =
        dashboardDao.observeHistorial().map { filas ->
            filas.map { fila ->
                PuntoHistorial(
                    anio = fila.anio.toIntOrNull() ?: 0,
                    mes = fila.mes.toIntOrNull() ?: 0,
                    total = Money(fila.total),
                    cantidadPagos = fila.cantidad,
                )
            }
        }

    override fun observeSemana(fecha: LocalDate): Flow<List<BarraDia>> {
        val offset = (fecha.dayOfWeek.value - 1) // lunes = 1 → offset 0
        val lunes = fecha.minusDays(offset.toLong())
        val domingo = lunes.plusDays(6)
        return pagoDao
            .observePagos(lunes.toString(), domingo.toString(), null, null)
            .map { pagos ->
                val porFecha = pagos.groupBy { it.fechaPago }
                (0L..6L).map { offsetDia ->
                    val fechaDia = lunes.plusDays(offsetDia)
                    val delDia = porFecha[fechaDia.toString()].orEmpty()
                    BarraDia(
                        fecha = fechaDia,
                        total = Money(delDia.sumOf { it.montoEnteros }),
                        cantidadPagos = delDia.size,
                    )
                }
            }
    }

    override fun observeMes(mes: Int, anio: Int): Flow<List<BarraSemana>> {
        val ym = YearMonth.of(anio, mes)
        val inicio = ym.atDay(1)
        val fin = ym.atEndOfMonth()
        return pagoDao
            .observePagos(inicio.toString(), fin.toString(), null, null)
            .map { pagos ->
                val grupos = pagos.groupBy { it.fechaPago }
                val numSemanas = ((fin.dayOfMonth - 1) / 7) + 1
                (1..numSemanas).map { semana ->
                    val desde = inicio.plusDays(((semana - 1) * 7).toLong())
                    val hasta = minOf(inicio.plusDays((semana * 7 - 1).toLong()), fin)
                    val delRango = grupos.filter { (_, lista) ->
                        lista.any { pago -> pago.fechaPago in desde.toString()..hasta.toString() }
                    }.values.flatten()
                    BarraSemana(
                        semana = semana,
                        inicio = desde,
                        fin = hasta,
                        total = Money(delRango.sumOf { it.montoEnteros }),
                        cantidadPagos = delRango.size,
                    )
                }
            }
    }

    override fun observeAnio(anio: Int): Flow<List<BarraMes>> =
        pagoDao.observePagos("$anio-01-01", "$anio-12-31", null, null).map { pagos ->
            val porMes = pagos.groupBy { it.fechaPago.substring(5, 7).toIntOrNull() ?: 0 }
            (1..12).map { mes ->
                val delMes = porMes[mes].orEmpty()
                BarraMes(
                    mes = mes,
                    total = Money(delMes.sumOf { it.montoEnteros }),
                    cantidadPagos = delMes.size,
                )
            }
        }
}
