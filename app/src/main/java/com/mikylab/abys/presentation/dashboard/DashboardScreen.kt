package com.mikylab.abys.presentation.dashboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Layers
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Schedule
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
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.mikylab.abys.core.money.formatBs
import com.mikylab.abys.core.time.DateFormats
import com.mikylab.abys.core.time.mesesAbrev
import com.mikylab.abys.presentation.components.BarChart
import com.mikylab.abys.presentation.components.KpiCard
import com.mikylab.abys.presentation.components.LineChart
import com.mikylab.abys.presentation.theme.AbysColors

/**
 * Dashboard. Replica la pantalla `/` del web:
 * 4 KPIs, gráfico semanal, mensual, anual e histórico.
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
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Resumen del mes de ${DateFormats.mesAnioTitulo(java.time.LocalDate.of(state.anio, state.mes, 1))}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
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
                                    "${state.resumenServidor?.total?.centavos?.formatBs() ?: "—"} " +
                                    "en este mes y la app tiene menos.",
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                        TextButton(onClick = viewModel::refrescar) { Text("Reintentar") }
                    }
                }
            }
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                KpiCard(
                    titulo = "Total del mes",
                    valor = state.resumen?.total?.centavos?.formatBs() ?: "—",
                    detalle = "${diasDelMes(state.mes, state.anio)} días en el período",
                    icon = Icons.Filled.Payments,
                    modifier = Modifier.weight(1f),
                )
                KpiCard(
                    titulo = "Pagos",
                    valor = (state.resumen?.cantidadPagos ?: 0).toString(),
                    detalle = "Pagos registrados en el mes",
                    icon = Icons.Filled.Layers,
                    modifier = Modifier.weight(1f),
                )
            }
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                KpiCard(
                    titulo = "Días trabajados",
                    valor = (state.resumen?.diasTrabajados ?: 0).toString(),
                    detalle = "Suma de días pagados",
                    icon = Icons.Filled.CalendarMonth,
                    modifier = Modifier.weight(1f),
                )
                KpiCard(
                    titulo = "Total histórico",
                    valor = state.totalHistorico.formatBs(),
                    detalle = "${state.mesesActividad} meses de actividad",
                    icon = Icons.Filled.Schedule,
                    modifier = Modifier.weight(1f),
                )
            }
        }

        item {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column {
                            Text("Semanal", style = MaterialTheme.typography.titleSmall)
                            Text(
                                text = state.semana.firstOrNull()?.fecha?.let { inicio ->
                                    "${DateFormats.fechaCorta(inicio)} – " +
                                        DateFormats.fechaCorta(state.semana.last().fecha)
                                } ?: "",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Row {
                            IconButton(onClick = viewModel::semanaAnterior) {
                                Icon(Icons.Filled.ChevronLeft, contentDescription = "Anterior: Semanal")
                            }
                            IconButton(onClick = viewModel::semanaSiguiente) {
                                Icon(Icons.Filled.ChevronRight, contentDescription = "Siguiente: Semanal")
                            }
                        }
                    }
                    BarChart(
                        data = state.semana.map {
                            DateFormats.diaSemana(it.fecha).take(3) to it.total.centavos
                        },
                        color = AbysColors.Chart1,
                    )
                }
            }
        }

        item {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column {
                            Text("Mensual", style = MaterialTheme.typography.titleSmall)
                            Text(
                                text = "Distribución por semana · ${
                                    DateFormats.mesAnioTitulo(java.time.LocalDate.of(state.anio, state.mes, 1))
                                }",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Row {
                            IconButton(onClick = viewModel::mesAnterior) {
                                Icon(Icons.Filled.ChevronLeft, contentDescription = "Anterior: Mensual")
                            }
                            IconButton(onClick = viewModel::mesSiguiente) {
                                Icon(Icons.Filled.ChevronRight, contentDescription = "Siguiente: Mensual")
                            }
                        }
                    }
                    BarChart(
                        data = state.semanasDelMes.map { "Sem ${it.semana}" to it.total.centavos },
                        color = AbysColors.Chart2,
                    )
                }
            }
        }

        item {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text("Anual", style = MaterialTheme.typography.titleSmall)
                    Text(
                        text = "Distribución por mes · ${state.anio}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    BarChart(
                        data = state.mesesDelAnio.map { mesesAbrev[it.mes - 1] to it.total.centavos },
                        color = AbysColors.Chart3,
                    )
                }
            }
        }

        item {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text("Histórico", style = MaterialTheme.typography.titleSmall)
                    Text(
                        text = "Evolución mensual con tendencia",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    val puntos = state.historial.map {
                        "${it.anio % 100} ${mesesAbrev[(it.mes - 1).coerceIn(0, 11)]}" to
                            it.total.centavos
                    }
                    val tendencia = state.historial.map { punto ->
                        val indice = state.historial.indexOf(punto)
                        val ventana = state.historial
                            .subList(maxOf(0, indice - 2), indice + 1)
                        ventana.map { it.total.centavos }.average().toLong()
                    }
                    LineChart(points = puntos, trend = tendencia)
                }
            }
        }
    }
}

private fun diasDelMes(mes: Int, anio: Int): Int =
    java.time.YearMonth.of(anio, mes).lengthOfMonth()
