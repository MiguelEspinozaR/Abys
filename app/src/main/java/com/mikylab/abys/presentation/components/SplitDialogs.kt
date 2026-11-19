package com.mikylab.abys.presentation.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.selectable
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BrokenImage
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.mikylab.abys.core.money.formatBs
import com.mikylab.abys.core.money.formatTasaBps
import com.mikylab.abys.domain.model.Cuenta
import com.mikylab.abys.domain.model.ModoCalculo
import com.mikylab.abys.domain.model.Pago
import com.mikylab.abys.domain.model.Transaccion

/**
 * Diálogos de **Splits** reutilizables por las pantallas Ingresos y Splits.
 *
 * Réplica de los diálogos del web:
 * `features/splits/GenerarSplitDialog.tsx`, `RealizarTxDialog.tsx` y `CuentaDetalleDialog.tsx`.
 */

/** Modos de cálculo con su descripción literal (idéntica a la del web). */
private val MODOS: List<Pair<ModoCalculo, String>> = listOf(
    ModoCalculo.PRECISO to "Preciso — reparte centavos exactos, residuo a General",
    ModoCalculo.REDONDEADO to "Redondeado — montos redondeados al entero",
    ModoCalculo.ENTEROS to "Enteros — distribuye solo montos enteros",
)

/**
 * "Generar split — pago #{id}".
 *
 * El split se **calcula localmente** (offline-first) y el servidor es la autoridad final
 * cuando se sincroniza.
 */
@Composable
fun GenerarSplitDialog(
    pago: Pago,
    onConfirm: (ModoCalculo) -> Unit,
    onDismiss: () -> Unit,
) {
    var modo by remember(pago.localId) { mutableStateOf(ModoCalculo.PRECISO) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Generar split — pago #${pago.serverId ?: "-"}") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = "Crea un split para repartir ${pago.monto.centavos.formatBs()} " +
                        "entre las cuentas con las tasas vigentes.",
                    style = MaterialTheme.typography.bodyMedium,
                )
                Text(
                    text = "Modo de cálculo",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                MODOS.forEach { (valor, descripcion) ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .selectable(
                                selected = modo == valor,
                                onClick = { modo = valor },
                            )
                            .padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        RadioButton(selected = modo == valor, onClick = { modo = valor })
                        Text(text = descripcion, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = { onConfirm(modo) }) { Text("Generar split") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar") }
        },
    )
}

/**
 * "Transferir a {alias}": confirma la transferencia y **congela** la transacción (BR-072).
 *
 * Muestra los datos de la cuenta (banco/número) y el QR para escanear desde la app bancaria.
 */
@Composable
fun RealizarTransaccionDialog(
    transaccion: Transaccion,
    cuenta: Cuenta?,
    qrUrl: String?,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    val esGeneral = cuenta?.esGeneral == true
    val subtitulo = when {
        esGeneral -> "Cuenta General · reserva de redondeo"
        cuenta != null -> "${cuenta.banco ?: "Banco"} · ${cuenta.numero ?: "—"}"
        else -> "Cuenta"
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Transferir a ${transaccion.aliasSnapshot}") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = "Confirma la transferencia realizada desde tu banca para congelar " +
                        "la transacción.",
                    style = MaterialTheme.typography.bodyMedium,
                )

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant,
                    ),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = transaccion.aliasSnapshot,
                                style = MaterialTheme.typography.titleSmall,
                            )
                            Text(
                                text = subtitulo,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Text(
                            text = transaccion.monto.centavos.formatBs(),
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "Tasa aplicada (snapshot)",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                    Text(
                        text = transaccion.tasa.bps.formatTasaBps(),
                        style = MaterialTheme.typography.labelLarge,
                    )
                }

                if (qrUrl != null) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        AsyncImage(
                            model = qrUrl,
                            contentDescription = "QR de la cuenta ${transaccion.aliasSnapshot}",
                            modifier = Modifier.size(160.dp),
                        )
                        Text(
                            text = "Escanea el QR desde tu app bancaria y transfiere " +
                                "exactamente ${transaccion.monto.centavos.formatBs()}.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                } else {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Icon(
                            imageVector = Icons.Filled.BrokenImage,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(18.dp),
                        )
                        Text(
                            text = "Esta cuenta no tiene QR cargado. Transfiere con los " +
                                "datos del banco.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onConfirm) {
                Icon(
                    imageVector = Icons.Filled.CheckCircle,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                )
                Text(text = "Marcar realizada", modifier = Modifier.padding(start = 4.dp))
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar") }
        },
    )
}

/** "{alias}": datos de la cuenta (banco, número, tasa) y su QR. */
@Composable
fun CuentaDetalleDialog(
    cuenta: Cuenta,
    pendiente: Long,
    qrUrl: String?,
    onDismiss: () -> Unit,
) {
    val titulo = if (cuenta.esGeneral) "${cuenta.alias} · reserva" else cuenta.alias
    val descripcion = if (cuenta.esGeneral) {
        "Cuenta General usada para la reserva de redondeo."
    } else {
        "Datos de la cuenta para transferir el monto pendiente."
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(titulo) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = descripcion,
                    style = MaterialTheme.typography.bodyMedium,
                )

                DatoCuenta("Banco", cuenta.banco ?: "—")
                DatoCuenta("Número de cuenta", cuenta.numero ?: "—")
                DatoCuenta("Tasa vigente", cuenta.tasa.bps.formatTasaBps())
                DatoCuenta("Pendiente", pendiente.formatBs(), destacado = true)

                if (qrUrl != null) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        AsyncImage(
                            model = qrUrl,
                            contentDescription = "QR de la cuenta ${cuenta.alias}",
                            modifier = Modifier.size(176.dp),
                        )
                        Text(
                            text = "Escanea el QR desde tu app bancaria.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                } else {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Icon(
                            imageVector = Icons.Filled.BrokenImage,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(18.dp),
                        )
                        Text(
                            text = "Esta cuenta no tiene QR cargado.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) { Text("Cerrar") }
        },
    )
}

@Composable
private fun DatoCuenta(etiqueta: String, valor: String, destacado: Boolean = false) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = etiqueta,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            text = valor,
            style = if (destacado) {
                MaterialTheme.typography.titleSmall
            } else {
                MaterialTheme.typography.bodyMedium
            },
            fontWeight = if (destacado) FontWeight.SemiBold else FontWeight.Normal,
        )
    }
}
