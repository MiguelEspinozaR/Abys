package com.mikylab.abys.presentation.configuracion

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Checkbox
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import com.mikylab.abys.core.money.formatTasaBps
import com.mikylab.abys.core.time.DateFormats
import com.mikylab.abys.domain.model.Cuenta
import com.mikylab.abys.domain.model.Fuente
import com.mikylab.abys.domain.model.HistorialTasa
import com.mikylab.abys.domain.model.ModoCalculo
import com.mikylab.abys.domain.usecase.ValidarCuentaUseCase
import com.mikylab.abys.presentation.theme.colorDesdeHex
import java.math.BigDecimal

/** Paleta rápida del selector de color de fuentes (el web usa `input type=color`). */
private val COLORES_FUENTE = listOf(
    "#3b82f6", "#14b8a6", "#e4c852", "#f472b6",
    "#8b5cf6", "#ef4444", "#10b981", "#f59e0b",
)

/**
 * Diálogo de alta/edición de cuenta (web `CuentasTab` → "Nueva cuenta" / "Editar cuenta").
 * Los límites de longitud replican el `binding` del backend v1.0.0.
 */
@Composable
fun DialogoCuenta(
    cuenta: Cuenta?,
    guardando: Boolean,
    error: String?,
    onCerrar: () -> Unit,
    onGuardar: (alias: String, banco: String?, numero: String?) -> Unit,
) {
    var alias by remember(cuenta?.localId) { mutableStateOf(cuenta?.alias.orEmpty()) }
    var banco by remember(cuenta?.localId) { mutableStateOf(cuenta?.banco.orEmpty()) }
    var numero by remember(cuenta?.localId) { mutableStateOf(cuenta?.numero.orEmpty()) }

    val aliasLargo = alias.trim().length > ValidarCuentaUseCase.MAX_ALIAS
    val bancoLargo = banco.trim().length > ValidarCuentaUseCase.MAX_BANCO
    val numeroLargo = numero.trim().length > ValidarCuentaUseCase.MAX_NUMERO
    val valido = alias.isNotBlank() && !aliasLargo && !bancoLargo && !numeroLargo

    AlertDialog(
        onDismissRequest = { if (!guardando) onCerrar() },
        title = {
            Text(
                if (cuenta == null) {
                    "Nueva cuenta"
                } else {
                    "Editar cuenta \"${cuenta.alias}\""
                },
            )
        },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                OutlinedTextField(
                    value = alias,
                    onValueChange = { alias = it },
                    label = { Text("Alias (obligatorio)") },
                    singleLine = true,
                    isError = aliasLargo,
                    supportingText = {
                        Text(
                            if (aliasLargo) {
                                "Máximo ${ValidarCuentaUseCase.MAX_ALIAS} caracteres"
                            } else {
                                "${alias.trim().length}/${ValidarCuentaUseCase.MAX_ALIAS}"
                            },
                        )
                    },
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = banco,
                    onValueChange = { banco = it },
                    label = { Text("Banco") },
                    singleLine = true,
                    isError = bancoLargo,
                    supportingText = if (bancoLargo) {
                        { Text("Máximo ${ValidarCuentaUseCase.MAX_BANCO} caracteres") }
                    } else {
                        null
                    },
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = numero,
                    onValueChange = { numero = it },
                    label = { Text("Número") },
                    singleLine = true,
                    isError = numeroLargo,
                    supportingText = if (numeroLargo) {
                        { Text("Máximo ${ValidarCuentaUseCase.MAX_NUMERO} caracteres") }
                    } else {
                        null
                    },
                    modifier = Modifier.fillMaxWidth(),
                )
                error?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    onGuardar(
                        alias.trim(),
                        banco.trim().ifBlank { null },
                        numero.trim().ifBlank { null },
                    )
                },
                enabled = valido && !guardando,
            ) {
                Text(if (cuenta == null) "Crear cuenta" else "Guardar cambios")
            }
        },
        dismissButton = {
            TextButton(onClick = onCerrar, enabled = !guardando) { Text("Cancelar") }
        },
    )
}

/** Diálogo de alta/edición de fuente (web `FuentesTab`). */
@Composable
fun DialogoFuente(
    fuente: Fuente?,
    guardando: Boolean,
    error: String?,
    onCerrar: () -> Unit,
    onGuardar: (alias: String, color: String, splitAuto: Boolean, splitAutoModo: String?) -> Unit,
) {
    var alias by remember(fuente?.localId) { mutableStateOf(fuente?.alias.orEmpty()) }
    var color by remember(fuente?.localId) { mutableStateOf(fuente?.color ?: "#3b82f6") }
    var splitAuto by remember(fuente?.localId) { mutableStateOf(fuente?.splitAuto ?: false) }
    var modo by remember(fuente?.localId) { mutableStateOf(fuente?.splitAutoModo?.wire) }

    val colorValido = Regex("^#[0-9a-fA-F]{6}$").matches(color.trim())
    val valido = alias.isNotBlank() && colorValido

    AlertDialog(
        onDismissRequest = { if (!guardando) onCerrar() },
        title = {
            Text(
                if (fuente == null) {
                    "Nueva fuente"
                } else {
                    "Editar fuente \"${fuente.alias}\""
                },
            )
        },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(
                    text = "Las fuentes identifican el origen de tus pagos (plataforma, cliente, etc.).",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                OutlinedTextField(
                    value = alias,
                    onValueChange = { alias = it },
                    label = { Text("Alias (obligatorio)") },
                    placeholder = { Text("Ej: Athena") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = color,
                    onValueChange = { color = it },
                    label = { Text("Color (hexadecimal)") },
                    singleLine = true,
                    isError = !colorValido,
                    supportingText = {
                        Text(
                            if (colorValido) {
                                "Se usa en los gráficos y en los puntos del calendario."
                            } else {
                                "Ingresa un color hexadecimal válido, p. ej. #3b82f6"
                            },
                        )
                    },
                    modifier = Modifier.fillMaxWidth(),
                )
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    COLORES_FUENTE.forEach { hex ->
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .clip(CircleShape)
                                .background(colorDesdeHex(hex))
                                .border(
                                    width = 2.dp,
                                    color = if (color.equals(hex, ignoreCase = true)) {
                                        MaterialTheme.colorScheme.onSurface
                                    } else {
                                        Color.Transparent
                                    },
                                    shape = CircleShape,
                                )
                                .clickable { color = hex },
                        )
                    }
                }
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Checkbox(
                        checked = splitAuto,
                        onCheckedChange = { marcado ->
                            splitAuto = marcado
                            if (!marcado) modo = null
                        },
                    )
                    Column {
                        Text("Split automático", style = MaterialTheme.typography.bodyMedium)
                        Text(
                            text = "Genera el split al registrar un pago de esta fuente.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                if (splitAuto) {
                    Text("Modo de cálculo", style = MaterialTheme.typography.labelMedium)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(
                            selected = modo == null,
                            onClick = { modo = null },
                            label = { Text("Usar el modo por defecto") },
                        )
                        ModoCalculo.entries.forEach { opcion ->
                            FilterChip(
                                selected = modo == opcion.wire,
                                onClick = { modo = opcion.wire },
                                label = { Text(opcion.label) },
                            )
                        }
                    }
                }
                error?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onGuardar(alias.trim(), color.trim(), splitAuto, modo) },
                enabled = valido && !guardando,
            ) {
                Text(if (fuente == null) "Crear fuente" else "Guardar cambios")
            }
        },
        dismissButton = {
            TextButton(onClick = onCerrar, enabled = !guardando) { Text("Cancelar") }
        },
    )
}

/** Diálogo "Tasa de {alias}" (web `TasaDialog`). */
@Composable
fun DialogoTasa(
    cuenta: Cuenta,
    guardando: Boolean,
    error: String?,
    onCerrar: () -> Unit,
    onGuardar: (tasaPorcentaje: Double, aplicarPendientes: Boolean) -> Unit,
) {
    var tasa by remember(cuenta.localId) {
        mutableStateOf(
            BigDecimal.valueOf(cuenta.tasa.bps, 2).stripTrailingZeros().toPlainString(),
        )
    }
    var aplicarPendientes by remember(cuenta.localId) { mutableStateOf(false) }

    val numero = tasa.trim().replace(',', '.').toDoubleOrNull()
    val tasaValida = numero != null && numero >= 0 && numero <= 100

    AlertDialog(
        onDismissRequest = { if (!guardando) onCerrar() },
        title = { Text("Tasa de ${cuenta.alias}") },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(
                    text = "Actual: ${cuenta.tasa.bps.formatTasaBps()}. La suma de tasas de " +
                        "cuentas ≠ General no puede superar 100% (lo valida el servidor).",
                    style = MaterialTheme.typography.bodySmall,
                )
                OutlinedTextField(
                    value = tasa,
                    onValueChange = { tasa = it },
                    label = { Text("Tasa en % (100% = 10000 bps)") },
                    placeholder = { Text("Ej: 25") },
                    singleLine = true,
                    isError = !tasaValida,
                    supportingText = if (!tasaValida) {
                        { Text("La tasa debe estar entre 0 y 100") }
                    } else {
                        null
                    },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.fillMaxWidth(),
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(
                        checked = aplicarPendientes,
                        onCheckedChange = { aplicarPendientes = it },
                    )
                    Column {
                        Text(
                            "Aplicar a transacciones pendientes",
                            style = MaterialTheme.typography.bodyMedium,
                        )
                        Text(
                            text = "Recalcula los splits con transacciones pendientes " +
                                "usando esta nueva tasa.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                error?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = { numero?.let { onGuardar(it, aplicarPendientes) } },
                enabled = tasaValida && !guardando,
            ) {
                Text("Guardar tasa")
            }
        },
        dismissButton = {
            TextButton(onClick = onCerrar, enabled = !guardando) { Text("Cancelar") }
        },
    )
}

/** Diálogo "Historial de tasas — {alias}". */
@Composable
fun DialogoHistorial(
    cuenta: Cuenta,
    historial: List<HistorialTasa>,
    onCerrar: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onCerrar,
        title = { Text("Historial de tasas — ${cuenta.alias}") },
        text = {
            Column(
                modifier = Modifier
                    .heightIn(max = 320.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    text = "Cada cambio queda registrado; los splits conservan el snapshot " +
                        "de ese momento.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (historial.isEmpty()) {
                    Text("Sin registros todavía.", style = MaterialTheme.typography.bodySmall)
                }
                historial.forEach { entrada ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(
                            text = entrada.tasa.bps.formatTasaBps(),
                            style = MaterialTheme.typography.bodyMedium,
                        )
                        Text(
                            text = entrada.aplicadaDesde?.let {
                                DateFormats.instanteLegible(it.toString())
                            } ?: "—",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = onCerrar) { Text("Cerrar") } },
    )
}

/** Confirmación de borrado (cuentas y fuentes usan soft delete). */
@Composable
fun DialogoEliminar(
    titulo: String,
    mensaje: String,
    onConfirmar: () -> Unit,
    onCerrar: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onCerrar,
        title = { Text(titulo) },
        text = { Text(mensaje) },
        confirmButton = {
            TextButton(onClick = onConfirmar) {
                Text("Eliminar", color = MaterialTheme.colorScheme.error)
            }
        },
        dismissButton = { TextButton(onClick = onCerrar) { Text("Cancelar") } },
    )
}
