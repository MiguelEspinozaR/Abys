package com.mikylab.abys.presentation.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.SyncProblem
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.mikylab.abys.core.money.formatBs
import com.mikylab.abys.core.time.DateFormats
import com.mikylab.abys.domain.model.BarraDia
import com.mikylab.abys.domain.model.Distribucion
import com.mikylab.abys.domain.model.FuenteTotal
import com.mikylab.abys.presentation.components.BarChart
import com.mikylab.abys.presentation.components.DistributionPieChart
import com.mikylab.abys.presentation.components.FilaApilada
import com.mikylab.abys.presentation.components.KpiCard
import com.mikylab.abys.presentation.components.LineChart
import com.mikylab.abys.presentation.components.StackedBarChart
import com.mikylab.abys.presentation.components.SyncStatusChip
import com.mikylab.abys.presentation.components.etiquetaMes
import com.mikylab.abys.presentation.theme.colorDesdeHex
import java.time.LocalDate
import java.time.YearMonth

/**
 * Dashboard v0.3.0. Replica la pantalla `/` del web (dashboard v2):
 * cards "Total últimos 30 días" e "Histórico" + 6 charts (Semanal apilado por fuente,
 * Mensual por bloques, Anual, Histórico, Distribución del mes y del año).
 *
 * Todos los datos se calculan **localmente** sobre Room (ver `DashboardRepositoryImpl`),
 * por lo que funciona sin conexión.
 */
@Composable
fun DashboardScreen(
    modifier: Modifier = Modifier,
    viewModel: DashboardViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    LazyColumn(
        modifier = modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Column {
                Text(
                    text = "Dashboard",
                    style = MaterialTheme.typography.titleLarge,
                )
                Text(
                    text = "Montos por día trabajado y su distribución por fuente.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                SyncStatusChip(
                    pendientes = state.pendientesSync,
                    ultimoError = state.errorSync,
                )
                IconButton(onClick = viewModel::refrescar, enabled = !state.consultandoServidor) {
                    if (state.consultandoServidor) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            strokeWidth = 2.dp,
                        )
                    } else {
                        Icon(Icons.Filled.Refresh, contentDescription = "Contrastar con el servidor")
                    }
                }
            }
        }

        state.errorSync?.let { errorSync ->
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer,
                    ),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(12.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            imageVector = Icons.Filled.SyncProblem,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onErrorContainer,
                        )
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Error de sincronización",
                                style = MaterialTheme.typography.titleSmall,
                                color = MaterialTheme.colorScheme.onErrorContainer,
                            )
                            Text(
                                text = errorSync,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onErrorContainer,
                            )
                        }
                    }
                }
            }
        }

        if (state.faltanDatos) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.tertiaryContainer,
                    ),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(12.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Filled.Warning, contentDescription = null)
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Faltan datos por sincronizar", style = MaterialTheme.typography.titleSmall)
                            Text(
                                text = "El servidor tiene " +
                                    "${state.total30dServidor.formatBs()} en los últimos 30 días " +
                                    "y la app tiene menos.",
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                        TextButton(onClick = viewModel::refrescar) { Text("Reintentar") }
                    }
                }
            }
        }

        // Cards resumen: sólo 30 días e histórico (R2), sin mes/año.
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                KpiCard(
                    titulo = "Total últimos 30 días",
                    valor = state.resumen?.totalUltimos30Dias?.centavos?.formatBs() ?: "—",
                    detalle = "Incluye hoy · zona La Paz",
                    icon = Icons.Filled.Payments,
                    modifier = Modifier.weight(1f),
                )
                KpiCard(
                    titulo = "Total histórico",
                    valor = state.resumen?.totalHistorico?.centavos?.formatBs() ?: "—",
                    detalle = "Todo el historial registrado",
                    icon = Icons.Filled.Schedule,
                    modifier = Modifier.weight(1f),
                )
            }
        }

        item {
            ChartCardSemanal(state.semana, viewModel)
        }

        item {
            ChartCard(
                titulo = "Mensual",
                subtitulo = "Bloques del mes · ${mesTitulo(state.mes, state.anio)}",
                onPrev = viewModel::mesAnterior,
                onNext = viewModel::mesSiguiente,
            ) {
                BarChart(
                    data = state.bloquesDelMes.map { bloque ->
                        "${bloque.inicio.dayOfMonth}–${bloque.fin.dayOfMonth}" to bloque.total.centavos
                    },
                )
            }
        }

        item {
            ChartCard(
                titulo = "Anual",
                subtitulo = "Totales por mes · ${state.anioGrafico}",
                onPrev = viewModel::anioAnterior,
                onNext = viewModel::anioSiguiente,
            ) {
                BarChart(
                    data = state.mesesDelAnio.map { mes ->
                        etiquetaMes(mes.mes) to mes.total.centavos
                    },
                )
            }
        }

        item {
            ChartCard(
                titulo = "Histórico",
                subtitulo = state.rangoHistorial?.let { rango ->
                    "${mesTitulo(rango.desde.monthValue, rango.desde.year)} – " +
                        mesTitulo(rango.hasta.monthValue, rango.hasta.year)
                } ?: "Evolución mensual de los totales",
                onPrev = viewModel::historialAnterior,
                onNext = viewModel::historialSiguiente,
            ) {
                LineChart(
                    points = state.historial.map { punto ->
                        "${punto.anio % 100} ${etiquetaMes(punto.mes)}" to punto.total.centavos
                    },
                )
            }
        }

        item {
            ChartCard(
                titulo = "Distribución del mes",
                subtitulo = "Distribución por fuente · ${mesTitulo(state.mes, state.anio)}",
                onPrev = viewModel::mesAnterior,
                onNext = viewModel::mesSiguiente,
            ) {
                ChartDistribucion(state.distribucionMes)
            }
        }

        item {
            ChartCard(
                titulo = "Distribución del año",
                subtitulo = "Distribución por fuente · ${state.anioGrafico}",
                onPrev = viewModel::anioAnterior,
                onNext = viewModel::anioSiguiente,
            ) {
                ChartDistribucion(state.distribucionAnio)
            }
        }
    }
}

@Composable
private fun ChartCardSemanal(semana: List<BarraDia>, viewModel: DashboardViewModel) {
    val subtitulo = if (semana.isNotEmpty()) {
        "${DateFormats.fechaCorta(semana.first().fecha)} – " +
            DateFormats.fechaCorta(semana.last().fecha)
    } else {
        ""
    }
    ChartCard(
        titulo = "Semanal",
        subtitulo = subtitulo,
        onPrev = viewModel::semanaAnterior,
        onNext = viewModel::semanaSiguiente,
    ) {
        // Serie única por fuente (dedup por alias, como `fuentesUnicas` del web).
        val fuentes = semana.flatMap { it.porFuente }
            .distinctBy { it.alias }
        val coloresPorSerie = fuentes.associate { it.alias to colorDesdeHex(it.color) }
        StackedBarChart(
            filas = semana.map { dia ->
                FilaApilada(
                    etiqueta = diaSemanaCorto(dia.fecha),
                    series = fuentes.map { fuente ->
                        fuente.alias to (
                            dia.porFuente
                                .firstOrNull { it.alias == fuente.alias }?.total?.centavos ?: 0L
                            )
                    },
                    totalCentavos = dia.total.centavos,
                )
            },
            coloresPorSerie = coloresPorSerie,
        )
        LeyendaFuentes(fuentes)
    }
}

@Composable
private fun ChartDistribucion(distribucion: Distribucion?) {
    if (distribucion == null) return
    val coloresPorSerie = distribucion.porFuente.associate {
        it.alias to colorDesdeHex(it.color)
    }
    DistributionPieChart(
        porFuente = distribucion.porFuente,
        coloresPorSerie = coloresPorSerie,
    )
    LeyendaFuentes(distribucion.porFuente, conMontos = true)
}

/** Leyenda: color + alias (+ monto y porcentaje en distribuciones). */
@Composable
private fun LeyendaFuentes(fuentes: List<FuenteTotal>, conMontos: Boolean = false) {
    val total = fuentes.sumOf { it.total.centavos }
    Column(modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
        fuentes.take(6).forEach { fuente ->
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(vertical = 2.dp),
            ) {
                Box(
                    modifier = Modifier
                        .padding(end = 6.dp)
                        .size(10.dp)
                        .background(colorDesdeHex(fuente.color), CircleShape),
                )
                Text(
                    text = if (conMontos && total > 0) {
                        val porcentaje = fuente.total.centavos * 100.0 / total
                        "${fuente.alias} · %.1f %%".format(porcentaje).replace('.', ',')
                    } else {
                        fuente.alias
                    },
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Medium,
                )
            }
        }
    }
}

/** Card con título, subtítulo y navegación ‹ › (equivale a `ChartCard` del web). */
@Composable
private fun ChartCard(
    titulo: String,
    subtitulo: String,
    onPrev: () -> Unit,
    onNext: () -> Unit,
    contenido: @Composable () -> Unit,
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(titulo, style = MaterialTheme.typography.titleSmall)
                    if (subtitulo.isNotEmpty()) {
                        Text(
                            text = subtitulo,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                Row {
                    IconButton(onClick = onPrev) {
                        Icon(Icons.Filled.ChevronLeft, contentDescription = "Anterior: $titulo")
                    }
                    IconButton(onClick = onNext) {
                        Icon(Icons.Filled.ChevronRight, contentDescription = "Siguiente: $titulo")
                    }
                }
            }
            contenido()
        }
    }
}

private fun diaSemanaCorto(fecha: LocalDate): String =
    DateFormats.diaSemana(fecha).take(3) + " " + fecha.dayOfMonth

private fun mesTitulo(mes: Int, anio: Int): String =
    DateFormats.mesAnioTitulo(YearMonth.of(anio, mes).atDay(1))
