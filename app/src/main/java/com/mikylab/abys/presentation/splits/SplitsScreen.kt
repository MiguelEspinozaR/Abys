package com.mikylab.abys.presentation.splits

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.material.icons.automirrored.filled.CallSplit
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.mikylab.abys.core.money.formatBs
import com.mikylab.abys.core.money.formatTasaBps
import com.mikylab.abys.core.time.DateFormats
import com.mikylab.abys.domain.model.Pago
import com.mikylab.abys.domain.model.Split
import com.mikylab.abys.domain.model.Transaccion
import com.mikylab.abys.presentation.components.CuentaDetalleDialog
import com.mikylab.abys.presentation.components.EstadoVacio
import com.mikylab.abys.presentation.components.GenerarSplitDialog
import com.mikylab.abys.presentation.components.KpiCard
import com.mikylab.abys.presentation.components.RealizarTransaccionDialog

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

    /** Split pendiente de confirmar el borrado. */
    var splitAEliminar by remember { mutableStateOf<Split?>(null) }
    /** Transacción pendiente de confirmar la transferencia. */
    var transaccionARealizar by remember { mutableStateOf<Transaccion?>(null) }
    /** Cuenta de la que se quiere ver los datos. */
    var cuentaAVer by remember { mutableStateOf<Pair<com.mikylab.abys.domain.model.Cuenta, Long>?>(null) }
    /** Pago pendiente de generar split. */
    var pagoParaSplit by remember { mutableStateOf<Pago?>(null) }

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

        state.error?.let { error ->
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer,
                    ),
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = error,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onErrorContainer,
                        )
                        TextButton(onClick = viewModel::limpiarError) { Text("Entendido") }
                    }
                }
            }
        }

        state.mensaje?.let { mensaje ->
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.secondaryContainer,
                    ),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = mensaje,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSecondaryContainer,
                        )
                        TextButton(onClick = viewModel::limpiarMensaje) { Text("Ok") }
                    }
                }
            }
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
                Column(modifier = Modifier.padding(12.dp)) {
                    Text("Pendiente por cuenta", style = MaterialTheme.typography.titleSmall)
                    Text(
                        text = "Total por transferir agrupado por cuenta de destino. " +
                            "Usa «Ver datos» para el QR y el número de cuenta.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    if (state.cuentas.isEmpty()) {
                        Text(
                            text = "No hay cuentas configuradas.",
                            style = MaterialTheme.typography.bodySmall,
                        )
                    } else {
                        state.cuentas.forEach { cuentaConQr ->
                            val cuenta = cuentaConQr.cuenta
                            val pendiente = state.pendientePorCuenta[cuenta.localId] ?: 0L
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
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
                                TextButton(onClick = { cuentaAVer = cuenta to pendiente }) {
                                    Text("Ver datos")
                                }
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

        // Pagos sin split: se ofrece generarlos (como en el web, desde Ingresos).
        if (state.pagosSinSplit.isNotEmpty()) {
            item {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Text(
                            text = "Pagos sin split (${state.pagosSinSplit.size})",
                            style = MaterialTheme.typography.titleSmall,
                        )
                        Text(
                            text = "Genera el split para repartir el pago entre las cuentas.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        state.pagosSinSplit.take(MAX_PAGOS_SIN_SPLIT).forEach { pago ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
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
                                        text = "Pago #${pago.serverId ?: "-"} · ${pago.fuente.alias}",
                                        style = MaterialTheme.typography.bodyMedium,
                                    )
                                    Text(
                                        text = "${DateFormats.fechaCorta(pago.fechaPago)} · " +
                                            "${pago.diasTrabajados.size} día(s)",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                                Text(
                                    text = pago.monto.centavos.formatBs(),
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.SemiBold,
                                )
                                IconButton(onClick = { pagoParaSplit = pago }) {
                                    Icon(
                                        imageVector = Icons.AutoMirrored.Filled.CallSplit,
                                        contentDescription = "Generar split",
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        if (state.splits.isEmpty() && !state.cargando) {
            item { EstadoVacio(titulo = "No hay splits generados.") }
        }

        items(state.splits, key = { it.split.localId }) { item ->
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { viewModel.toggleExpandido(item.split.localId) },
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Icon(
                            imageVector = if (item.split.localId in state.expandidos) {
                                Icons.Filled.ExpandMore
                            } else {
                                Icons.Filled.ChevronRight
                            },
                            contentDescription = "Ver split",
                        )
                        val pago = item.pago
                        if (pago != null) {
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
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Pago #${pago?.serverId ?: "-"}" +
                                    (pago?.let { " · ${it.fuente.alias}" } ?: ""),
                                style = MaterialTheme.typography.titleSmall,
                            )
                            Text(
                                text = pago?.let {
                                    "${DateFormats.fechaCorta(it.fechaPago)} · " +
                                        "${it.diasTrabajados.size} día(s)"
                                } ?: "",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        if (pago != null) {
                            Text(
                                text = pago.monto.centavos.formatBs(),
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                        AssistChip(
                            onClick = {},
                            label = {
                                Text(
                                    if (item.split.totalPendiente.centavos == 0L) {
                                        "Completo"
                                    } else {
                                        "${item.split.totalPendiente.centavos.formatBs()} pend."
                                    },
                                )
                            },
                        )
                    }

                    if (item.split.localId in state.expandidos) {
                        Column(
                            modifier = Modifier.padding(top = 8.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column {
                                    Text(
                                        text = "modo ${item.split.modoCalculo.label}",
                                        style = MaterialTheme.typography.labelMedium,
                                    )
                                    Text(
                                        text = "Pendiente: ${item.split.totalPendiente.centavos.formatBs()} · " +
                                            "Realizado: ${item.split.totalRealizado.centavos.formatBs()}",
                                        style = MaterialTheme.typography.bodySmall,
                                    )
                                }
                                TextButton(
                                    onClick = { splitAEliminar = item.split },
                                    enabled = !item.split.tieneRealizadas,
                                ) {
                                    Icon(
                                        imageVector = Icons.Filled.Delete,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp),
                                    )
                                    Text(
                                        text = "Eliminar split",
                                        modifier = Modifier.padding(start = 4.dp),
                                    )
                                }
                            }

                            item.split.transacciones.forEach { transaccion ->
                                FilaTransaccion(
                                    transaccion = transaccion,
                                    esGeneral = state.cuentaDe(transaccion.cuentaLocalId)
                                        ?.cuenta?.esGeneral == true,
                                    onRealizar = { transaccionARealizar = transaccion },
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // ── Diálogo: eliminar split ─────────────────────────────────────────────
    val aEliminar = splitAEliminar
    if (aEliminar != null) {
        val pagoId = state.splits.firstOrNull { it.split.localId == aEliminar.localId }
            ?.pago?.serverId ?: "-"
        AlertDialog(
            onDismissRequest = { splitAEliminar = null },
            title = { Text("¿Eliminar el split del pago #$pagoId?") },
            text = {
                Text(
                    text = "Se eliminarán las ${aEliminar.transacciones.size} transacciones " +
                        "pendientes y el pago quedará disponible para generar un nuevo split.",
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.eliminarSplit(aEliminar.localId)
                        splitAEliminar = null
                    },
                ) {
                    Text("Eliminar split")
                }
            },
            dismissButton = {
                TextButton(onClick = { splitAEliminar = null }) { Text("Cancelar") }
            },
        )
    }

    // ── Diálogo: transferir a la cuenta ─────────────────────────────────────
    val aRealizar = transaccionARealizar
    if (aRealizar != null) {
        val cuentaConQr = state.cuentaDe(aRealizar.cuentaLocalId)
        RealizarTransaccionDialog(
            transaccion = aRealizar,
            cuenta = cuentaConQr?.cuenta,
            qrUrl = cuentaConQr?.qrUrl,
            onConfirm = {
                viewModel.marcarRealizada(aRealizar.localId)
                transaccionARealizar = null
            },
            onDismiss = { transaccionARealizar = null },
        )
    }

    // ── Diálogo: datos de la cuenta ─────────────────────────────────────────
    val aVer = cuentaAVer
    if (aVer != null) {
        val cuentaConQr = state.cuentas.firstOrNull { it.cuenta.localId == aVer.first.localId }
        CuentaDetalleDialog(
            cuenta = aVer.first,
            pendiente = aVer.second,
            qrUrl = cuentaConQr?.qrUrl,
            onDismiss = { cuentaAVer = null },
        )
    }

    // ── Diálogo: generar split ──────────────────────────────────────────────
    val paraSplit = pagoParaSplit
    if (paraSplit != null) {
        GenerarSplitDialog(
            pago = paraSplit,
            onConfirm = { modo ->
                viewModel.generarSplit(paraSplit.localId, modo)
                pagoParaSplit = null
            },
            onDismiss = { pagoParaSplit = null },
        )
    }
}

@Composable
private fun FilaTransaccion(
    transaccion: Transaccion,
    esGeneral: Boolean,
    onRealizar: () -> Unit,
) {
    val esCero = transaccion.monto.centavos == 0L
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
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
                        text = transaccion.tasa.bps.formatTasaBps() +
                            if (esGeneral) " · reserva" else "",
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
                    Button(onClick = onRealizar) { Text("Realizar") }
                }
            }
            if (esCero && !esGeneral) {
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

/** Máximo de pagos sin split listados en la tarjeta de generación. */
private const val MAX_PAGOS_SIN_SPLIT = 10
