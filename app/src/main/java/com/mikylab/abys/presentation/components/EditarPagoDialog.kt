package com.mikylab.abys.presentation.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.text.KeyboardOptions
import com.mikylab.abys.core.money.Money
import com.mikylab.abys.core.money.parseBsToCents
import com.mikylab.abys.core.time.DateFormats
import com.mikylab.abys.domain.model.DiaTrabajadoDraft
import com.mikylab.abys.domain.model.Fuente
import com.mikylab.abys.domain.model.MetodoPago
import com.mikylab.abys.domain.model.Pago
import com.mikylab.abys.domain.model.PagoDraft
import java.time.LocalDate
import java.time.format.DateTimeParseException

/** Estado interno de un día editable del diálogo. */
private data class DiaEditable(
    val fechaTexto: String,
    val montoTexto: String,
)

/**
 * Diálogo "Editar pago" (equivalente a `EditarPagoDialog` del web, v0.3.0).
 *
 * Edita fuente, método, notas, fecha de pago y los días trabajados **con su monto**;
 * el total del pago es derivado (Σ de los días). BR-081: si el pago tiene split, los
 * montos/días/fecha no se pueden cambiar (el backend responde 422 `IMMUTABLE_DATA`).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditarPagoDialog(
    pago: Pago,
    fuentes: List<Fuente>,
    onGuardar: (PagoDraft) -> Unit,
    onDismiss: () -> Unit,
) {
    var fuenteLocalId by remember { mutableStateOf(pago.fuente.localId) }
    var metodo by remember { mutableStateOf(pago.metodoPago) }
    var notas by remember { mutableStateOf(pago.notas.orEmpty()) }
    var fechaPagoTexto by remember { mutableStateOf(pago.fechaPago.toString()) }
    var dias by remember {
        mutableStateOf(
            pago.diasTrabajados.map { dia ->
                DiaEditable(dia.fecha.toString(), centsToTexto(dia.monto.centavos))
            },
        )
    }
    val bloqueado = pago.tieneSplit

    val errores = validar(fechaPagoTexto, dias, fuentes.any { it.localId == fuenteLocalId })
    val diasValidos = dias.mapNotNull { dia ->
        val fecha = parsearFecha(dia.fechaTexto) ?: return@mapNotNull null
        val monto = parseBsToCents(dia.montoTexto) ?: return@mapNotNull null
        fecha to monto
    }
    val totalCentavos = if (diasValidos.size == dias.size) diasValidos.sumOf { it.second } else 0L
    val puedeGuardar = errores == null && diasValidos.size == dias.size && totalCentavos > 0

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Editar pago #${pago.serverId ?: "-"}") },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                if (bloqueado) {
                    Text(
                        text = "El monto del pago está bloqueado porque tiene un split; " +
                            "elimina o recalcula el split primero.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                    )
                }

                var expandido by remember { mutableStateOf(false) }
                ExposedDropdownMenuBox(
                    expanded = expandido,
                    onExpandedChange = { if (!bloqueado) expandido = it },
                ) {
                    OutlinedTextField(
                        value = fuentes.firstOrNull { it.localId == fuenteLocalId }?.alias.orEmpty(),
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Fuente") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expandido) },
                        modifier = Modifier.menuAnchor(
                            androidx.compose.material3.MenuAnchorType.PrimaryNotEditable,
                        ).fillMaxWidth(),
                    )
                    ExposedDropdownMenu(expanded = expandido, onDismissRequest = { expandido = false }) {
                        fuentes.forEach { fuente ->
                            DropdownMenuItem(
                                text = { Text(fuente.alias) },
                                onClick = {
                                    fuenteLocalId = fuente.localId
                                    expandido = false
                                },
                            )
                        }
                    }
                }

                Text("Método de pago", style = MaterialTheme.typography.labelMedium)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    MetodoPago.entries.forEach { candidato ->
                        FilterChip(
                            selected = metodo == candidato,
                            onClick = { metodo = candidato },
                            label = { Text(candidato.label) },
                        )
                    }
                }

                OutlinedTextField(
                    value = fechaPagoTexto,
                    onValueChange = { if (!bloqueado) fechaPagoTexto = it },
                    label = { Text("Fecha de pago (AAAA-MM-DD)") },
                    isError = !bloqueado && errores?.contains("fecha de pago") == true,
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )

                Text("Días trabajados y montos (Bs)", style = MaterialTheme.typography.labelMedium)
                dias.forEachIndexed { indice, dia ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        OutlinedTextField(
                            value = dia.fechaTexto,
                            onValueChange = { nuevo ->
                                if (!bloqueado) {
                                    dias = dias.toMutableList().apply {
                                        this[indice] = dia.copy(fechaTexto = nuevo)
                                    }
                                }
                            },
                            label = { Text("Fecha") },
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                        )
                        OutlinedTextField(
                            value = dia.montoTexto,
                            onValueChange = { nuevo ->
                                if (!bloqueado) {
                                    dias = dias.toMutableList().apply {
                                        this[indice] = dia.copy(montoTexto = nuevo)
                                    }
                                }
                            },
                            label = { Text("Bs") },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            modifier = Modifier.weight(1f),
                        )
                        IconButton(
                            onClick = { if (!bloqueado && dias.size > 1) dias = dias - dia },
                            enabled = !bloqueado && dias.size > 1,
                        ) {
                            Icon(
                                imageVector = Icons.Filled.Delete,
                                contentDescription = "Quitar día",
                                tint = MaterialTheme.colorScheme.error,
                            )
                        }
                    }
                }
                Button(
                    onClick = { dias = dias + DiaEditable(LocalDate.now().toString(), "") },
                    enabled = !bloqueado,
                ) {
                    Icon(Icons.Filled.Add, contentDescription = null)
                    Text("Agregar día")
                }

                Text(
                    text = "Total del pago: ${Money.format(totalCentavos)}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                )

                OutlinedTextField(
                    value = notas,
                    onValueChange = { notas = it },
                    label = { Text("Notas") },
                    minLines = 2,
                    modifier = Modifier.fillMaxWidth(),
                )

                errores?.let { mensaje ->
                    Text(
                        text = mensaje,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val fechaPago = parsearFecha(fechaPagoTexto) ?: return@Button
                    val diasDraft = dias.mapNotNull { dia ->
                        val fecha = parsearFecha(dia.fechaTexto) ?: return@mapNotNull null
                        val monto = parseBsToCents(dia.montoTexto) ?: return@mapNotNull null
                        DiaTrabajadoDraft(fecha, Money(monto))
                    }
                    onGuardar(
                        PagoDraft(
                            fuenteLocalId = fuenteLocalId,
                            fechaPago = fechaPago,
                            metodoPago = metodo,
                            notas = notas.trim().takeIf { it.isNotEmpty() },
                            diasTrabajados = diasDraft,
                        ),
                    )
                },
                enabled = puedeGuardar,
            ) { Text("Guardar") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar") }
        },
    )
}

/** Mensajes de validación (literal del backend, `validations.go` v0.3.0). */
private fun validar(
    fechaPagoTexto: String,
    dias: List<DiaEditable>,
    fuenteValida: Boolean,
): String? {
    if (!fuenteValida) return "la fuente indicada no existe"
    if (parsearFecha(fechaPagoTexto) == null) return "fecha de pago inválida"
    if (dias.isEmpty()) return "un pago debe tener al menos un día trabajado"
    val fechas = dias.map { parsearFecha(it.fechaTexto) }
    if (fechas.any { it == null }) return "fecha inválida en los días trabajados"
    val duplicada = fechas.groupingBy { it }.eachCount().entries.firstOrNull { it.value > 1 }
    if (duplicada != null) {
        return "fechas de trabajo duplicadas dentro del mismo pago: ${duplicada.key}"
    }
    if (dias.any { parseBsToCents(it.montoTexto)?.let { m -> m < 0 } ?: true }) {
        return "el monto de un día no puede ser negativo"
    }
    return null
}

private fun parsearFecha(texto: String): LocalDate? = try {
    LocalDate.parse(texto.trim())
} catch (_: DateTimeParseException) {
    null
}

private fun centsToTexto(centavos: Long): String = Money.format(centavos).removeSuffix(" Bs")
