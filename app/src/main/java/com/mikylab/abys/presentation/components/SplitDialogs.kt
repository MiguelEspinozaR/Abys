package com.mikylab.abys.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BrokenImage
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
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

/** Resultado de "Realizar masivo" que la pantalla entrega al diálogo para reintentar. */
data class ResultadoMasivo(
    val fallidos: List<String>,
    val mensaje: String?,
)

/**
 * "{alias}": datos de la cuenta (banco, número, tasa), QR ampliable y **Realizar masivo**
 * de las transferencias pendientes (v0.4.1).
 *
 * Réplica de `Abys/web/src/features/splits/CuentaDetalleDialog.tsx`:
 * - selección múltiple con subtotal en vivo,
 * - confirmación inline (`Marcar N transferencias por Bs X?`),
 * - una operación por transacción (no hay endpoint bulk),
 * - reintento **solo** de los ids fallidos,
 * - la cuenta General es informativa y no permite marcar transferencias.
 */
@Composable
fun CuentaDetalleDialog(
    cuenta: Cuenta,
    pendiente: Long,
    qrUrl: String?,
    transacciones: List<Transaccion>,
    resultado: ResultadoMasivo?,
    onConfirmar: (List<String>) -> Unit,
    onLimpiarResultado: () -> Unit,
    onDismiss: () -> Unit,
) {
    val titulo = if (cuenta.esGeneral) "${cuenta.alias} · reserva" else cuenta.alias
    val descripcion = if (cuenta.esGeneral) {
        "Cuenta General usada para la reserva de redondeo."
    } else {
        "Datos de la cuenta para transferir el monto pendiente."
    }

    var seleccionadas by remember(cuenta.localId) { mutableStateOf<Set<String>>(emptySet()) }
    var paso by remember(cuenta.localId) { mutableStateOf(PasoRealizar.SELECCION) }
    var zoom by remember(cuenta.localId) { mutableStateOf(false) }
    var mensaje by remember(cuenta.localId) { mutableStateOf<String?>(null) }

    // Reintento: si quedaron fallidos, se vuelve al paso de confirmación solo con ellos.
    LaunchedEffect(resultado) {
        val actual = resultado ?: return@LaunchedEffect
        if (actual.fallidos.isEmpty()) {
            onDismiss()
        } else {
            seleccionadas = actual.fallidos.toSet()
            paso = PasoRealizar.CONFIRMAR
            mensaje = actual.mensaje
        }
        onLimpiarResultado()
    }

    val subtotal = transacciones
        .filter { it.localId in seleccionadas }
        .sumOf { it.monto.centavos }
    val habilitado = seleccionadas.isNotEmpty() && !cuenta.esGeneral

    fun alternar(localId: String, marcado: Boolean) {
        seleccionadas = if (marcado) seleccionadas + localId else seleccionadas - localId
        mensaje = null
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(titulo) },
        text = {
            Column(
                modifier = Modifier
                    .heightIn(max = 460.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
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
                            modifier = Modifier
                                .size(176.dp)
                                .clickable { zoom = true },
                        )
                        Text(
                            text = "Escanea el QR desde tu app bancaria o pulsa la imagen " +
                                "para ampliarla.",
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

                Text(
                    text = "Transferencias pendientes",
                    style = MaterialTheme.typography.titleSmall,
                )
                if (transacciones.isEmpty()) {
                    Text(
                        text = "Esta cuenta no tiene transferencias pendientes.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                } else {
                    transacciones.forEach { transaccion ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { alternar(transaccion.localId, transaccion.localId !in seleccionadas) }
                                .padding(vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Checkbox(
                                checked = transaccion.localId in seleccionadas,
                                onCheckedChange = { alternar(transaccion.localId, it) },
                            )
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = transaccion.aliasSnapshot,
                                    style = MaterialTheme.typography.bodyMedium,
                                )
                                Text(
                                    text = transaccion.serverId?.let { "Transacción #$it" }
                                        ?: "Pendiente de sincronizar",
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
                }

                if (cuenta.esGeneral) {
                    Text(
                        text = "La cuenta General es informativa (reserva de redondeo): " +
                            "no se pueden marcar transferencias desde aquí.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "${seleccionadas.size} seleccionadas",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        text = subtotal.formatBs(),
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                    )
                }

                if (paso == PasoRealizar.SELECCION) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.End),
                    ) {
                        TextButton(onClick = onDismiss) { Text("Cancelar") }
                        Button(
                            onClick = { mensaje = null; paso = PasoRealizar.CONFIRMAR },
                            enabled = habilitado,
                        ) {
                            Text("Realizar (${seleccionadas.size})")
                        }
                    }
                } else {
                    Text(
                        text = "Marcar ${seleccionadas.size} transferencias por " +
                            subtotal.formatBs() + "?",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.End),
                    ) {
                        TextButton(onClick = { mensaje = null; paso = PasoRealizar.SELECCION }) {
                            Text("Volver")
                        }
                        Button(
                            onClick = {
                                val ids = seleccionadas.toList()
                                if (ids.isNotEmpty()) onConfirmar(ids)
                            },
                            enabled = seleccionadas.isNotEmpty(),
                        ) {
                            Text("Confirmar")
                        }
                    }
                }

                mensaje?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        },
        confirmButton = {},
    )

    // Lightbox del QR (equivalente al zoom del web).
    if (zoom && qrUrl != null) {
        Dialog(onDismissRequest = { zoom = false }) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.9f))
                    .clickable { zoom = false },
                contentAlignment = Alignment.Center,
            ) {
                AsyncImage(
                    model = qrUrl,
                    contentDescription = "QR ampliado de la cuenta ${cuenta.alias}",
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                )
            }
        }
    }
}

private enum class PasoRealizar { SELECCION, CONFIRMAR }

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
