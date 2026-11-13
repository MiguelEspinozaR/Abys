package com.mikylab.abys.presentation.ingresos

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.background
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.mikylab.abys.core.money.formatBs
import com.mikylab.abys.core.time.DateFormats
import com.mikylab.abys.domain.model.MetodoPago
import com.mikylab.abys.domain.model.Pago
import com.mikylab.abys.presentation.components.EstadoVacio

/**
 * Pantalla "Ingresos" (equivalente a `/ingresos` del web): lista agrupada por año,
 * filtros (Desde/Hasta/Fuente/Método) y detalle expandible de cada pago.
 */
@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
fun IngresosScreen(
    modifier: Modifier = Modifier,
    viewModel: IngresosViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val fuentes by viewModel.fuentes.collectAsStateWithLifecycle()

    LazyColumn(
        modifier = modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            Text("Ingresos", style = MaterialTheme.typography.headlineSmall)
            Text(
                text = "${state.totalPagos} pagos registrados",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        item {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text("Filtros", style = MaterialTheme.typography.titleSmall)

                    OutlinedTextField(
                        value = state.fechaInicio?.toString().orEmpty(),
                        onValueChange = { texto ->
                            viewModel.cambiarFechaInicio(
                                texto.takeIf { it.isNotBlank() }?.let {
                                    runCatching { java.time.LocalDate.parse(it) }.getOrNull()
                                },
                            )
                        },
                        label = { Text("Desde") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = state.fechaFin?.toString().orEmpty(),
                        onValueChange = { texto ->
                            viewModel.cambiarFechaFin(
                                texto.takeIf { it.isNotBlank() }?.let {
                                    runCatching { java.time.LocalDate.parse(it) }.getOrNull()
                                },
                            )
                        },
                        label = { Text("Hasta") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )

                    Text("Fuente", style = MaterialTheme.typography.labelMedium)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(
                            selected = state.fuenteLocalId == null,
                            onClick = { viewModel.cambiarFuente(null) },
                            label = { Text("Todas") },
                        )
                        fuentes.forEach { fuente ->
                            FilterChip(
                                selected = state.fuenteLocalId == fuente.localId,
                                onClick = { viewModel.cambiarFuente(fuente.localId) },
                                label = { Text(fuente.alias) },
                            )
                        }
                    }

                    Text("Método", style = MaterialTheme.typography.labelMedium)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(
                            selected = state.metodoPago == null,
                            onClick = { viewModel.cambiarMetodo(null) },
                            label = { Text("Todos") },
                        )
                        MetodoPago.entries.forEach { metodo ->
                            FilterChip(
                                selected = state.metodoPago == metodo,
                                onClick = { viewModel.cambiarMetodo(metodo) },
                                label = { Text(metodo.label) },
                            )
                        }
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        TextButton(onClick = viewModel::aplicarFiltros) { Text("Aplicar") }
                        TextButton(onClick = viewModel::limpiarFiltros) { Text("Limpiar") }
                    }
                }
            }
        }

        if (state.pagosPorAnio.isEmpty() && !state.cargando) {
            item {
                EstadoVacio(
                    titulo = "No hay pagos que coincidan con los criterios.",
                    mensaje = "Ajusta los filtros o registra un nuevo pago.",
                )
            }
        }

        state.pagosPorAnio.forEach { (anio, pagos) ->
            item(key = "anio-$anio") {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("$anio", style = MaterialTheme.typography.titleMedium)
                    AssistChip(onClick = {}, label = { Text("${pagos.size}") })
                }
            }

            items(pagos, key = { it.localId }) { pago ->
                FilaPago(
                    pago = pago,
                    expandido = pago.localId in state.expanded,
                    onToggle = { viewModel.toggleExpandido(pago.localId) },
                )
            }
        }
    }
}

@Composable
private fun FilaPago(
    pago: Pago,
    expandido: Boolean,
    onToggle: () -> Unit,
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth().clickable { onToggle() },
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Icon(
                    imageVector = if (expandido) Icons.Filled.ExpandMore else Icons.Filled.ChevronRight,
                    contentDescription = if (expandido) "Ocultar detalle" else "Ver detalle",
                )
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .background(
                            color = runCatching {
                                Color(android.graphics.Color.parseColor(pago.fuente.color))
                            }.getOrDefault(Color.Gray),
                            shape = CircleShape,
                        ),
                )
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = pago.fuente.alias,
                        style = MaterialTheme.typography.titleSmall,
                    )
                    Text(
                        text = DateFormats.fechaCorta(pago.fechaPago) +
                            (pago.notas?.let { " · $it" } ?: ""),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                AssistChip(onClick = {}, label = { Text(pago.metodoPago.label) })
                Text(
                    text = pago.monto.centavos.formatBs(),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                )
            }

            if (expandido) {
                Column(
                    modifier = Modifier.padding(top = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text(
                        text = "Días trabajados (${pago.diasTrabajados.size})",
                        style = MaterialTheme.typography.labelMedium,
                    )
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        pago.diasTrabajados.forEach { dia ->
                            AssistChip(
                                onClick = {},
                                label = {
                                    Text("${DateFormats.diaSemana(dia.fecha)} · ${dia.fecha}")
                                },
                            )
                        }
                    }
                    Text(
                        text = if (pago.imagenRuta != null) "Comprobante" else "Sin comprobante",
                        style = MaterialTheme.typography.labelMedium,
                    )
                    Text(
                        text = "ID #${pago.serverId ?: "-"}" +
                            (pago.splitModo?.let { " · Split: $it (#${pago.splitId})" } ?: ""),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    if (pago.syncState != com.mikylab.abys.domain.model.SyncState.SYNCED) {
                        Text(
                            text = "Pendiente de sincronizar" +
                                (pago.lastError?.let { " · $it" } ?: ""),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error,
                        )
                    }
                }
            }
        }
    }
}
