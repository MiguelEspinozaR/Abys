package com.mikylab.abys.presentation.splits

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.Icon
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
import com.mikylab.abys.core.money.formatTasaBps
import com.mikylab.abys.domain.model.Split
import com.mikylab.abys.domain.model.Transaccion
import com.mikylab.abys.presentation.components.EstadoVacio
import com.mikylab.abys.presentation.components.KpiCard

/**
 * Pantalla "Splits" (equivalente a `/splits` del web):
 * KPIs, pendiente por cuenta, lista de splits con sus transacciones y acción "Realizar".
 */
@Composable
fun SplitsScreen(
    modifier: Modifier = Modifier,
    viewModel: SplitsViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    LazyColumn(
        modifier = modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {

            Text(
                text = "Distribución de cada pago entre cuentas según sus tasas. " +
                    "Los splits pendientes se congelan al marcar cada transferencia como realizada.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                KpiCard(
                    titulo = "Splits generados",
                    valor = state.splits.size.toString(),
                    modifier = Modifier.weight(1f),
                )
                KpiCard(
                    titulo = "Pendiente total",
                    valor = state.totalPendiente.formatBs(),
                    modifier = Modifier.weight(1f),
                )
                KpiCard(
                    titulo = "Realizado total",
                    valor = state.totalRealizado.formatBs(),
                    modifier = Modifier.weight(1f),
                )
            }
        }

        item {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text("Pendiente por cuenta", style = MaterialTheme.typography.titleSmall)
                    Text(
                        text = "Total por transferir agrupado por cuenta de destino.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    if (state.cuentas.isEmpty()) {
                        Text(
                            text = "No hay cuentas configuradas.",
                            style = MaterialTheme.typography.bodySmall,
                        )
                    } else {
                        state.cuentas.forEach { cuenta ->
                            val pendiente = state.pendientePorCuenta[cuenta.localId] ?: 0L
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = cuenta.alias +
                                            if (cuenta.esGeneral) " · reserva" else "",
                                        style = MaterialTheme.typography.bodyMedium,
                                    )
                                    Text(
                                        text = "${cuenta.banco ?: "—"} · ${cuenta.numero ?: "—"}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                                Text(
                                    text = pendiente.formatBs(),
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.SemiBold,
                                )
                            }
                        }
                        Text(
                            text = "Total pendiente: ${state.totalPendiente.formatBs()}",
                            style = MaterialTheme.typography.titleSmall,
                            modifier = Modifier.padding(top = 4.dp),
                        )
                    }
                }
            }
        }

        state.error?.let { mensaje ->
            item {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = mensaje,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.error,
                        )
                        TextButton(onClick = viewModel::limpiarError) { Text("Entendido") }
                    }
                }
            }
        }

        if (state.splits.isEmpty() && !state.cargando) {
            item { EstadoVacio(titulo = "No hay splits generados.") }
        }

        items(state.splits, key = { it.localId }) { split ->
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Icon(
                            imageVector = if (split.localId in state.expandidos) {
                                Icons.Filled.ExpandMore
                            } else {
                                Icons.Filled.ChevronRight
                            },
                            contentDescription = "Ver split",
                        )
                        Text(
                            text = "Pago #${split.pagoLocalId.take(8)}",
                            style = MaterialTheme.typography.titleSmall,
                            modifier = Modifier.weight(1f),
                        )
                        AssistChip(
                            onClick = {},
                            label = {
                                Text(
                                    if (split.totalPendiente.centavos == 0L) {
                                        "Completo"
                                    } else {
                                        "${split.totalPendiente.centavos.formatBs()} pend."
                                    },
                                )
                            },
                        )
                    }

                    if (split.localId in state.expandidos) {
                        Column(
                            modifier = Modifier.padding(top = 8.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            Text(
                                text = "modo ${split.modoCalculo.label}",
                                style = MaterialTheme.typography.labelMedium,
                            )
                            Text(
                                text = "Pendiente: ${split.totalPendiente.centavos.formatBs()} · " +
                                    "Realizado: ${split.totalRealizado.centavos.formatBs()}",
                                style = MaterialTheme.typography.bodySmall,
                            )
                            split.transacciones.forEach { transaccion ->
                                FilaTransaccion(
                                    transaccion = transaccion,
                                    onRealizar = { viewModel.marcarRealizada(transaccion.localId) },
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FilaTransaccion(
    transaccion: Transaccion,
    onRealizar: () -> Unit,
) {
    val esCero = transaccion.monto.centavos == 0L
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = androidx.compose.material3.CardDefaults.cardColors(
            containerColor = if (esCero) {
                MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.25f)
            } else {
                MaterialTheme.colorScheme.surfaceVariant
            },
        ),
    ) {
        Column(modifier = Modifier.padding(8.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = transaccion.aliasSnapshot,
                        style = MaterialTheme.typography.titleSmall,
                    )
                    Text(
                        text = transaccion.tasa.bps.formatTasaBps(),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Text(
                    text = transaccion.monto.centavos.formatBs(),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                )
                AssistChip(
                    onClick = {},
                    label = { Text(if (transaccion.realizado) "Realizada" else "Pendiente") },
                )
                if (!transaccion.realizado) {
                    TextButton(onClick = onRealizar) { Text("Realizar") }
                }
            }
            if (esCero) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Filled.Warning,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.error,
                    )
                    Text(
                        text = "0 Bs en cuenta no General",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            }
        }
    }
}
