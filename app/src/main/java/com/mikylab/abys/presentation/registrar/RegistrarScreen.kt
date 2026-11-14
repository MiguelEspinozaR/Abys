package com.mikylab.abys.presentation.registrar

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.Button
import androidx.compose.material3.Card
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
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.text.KeyboardOptions
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.mikylab.abys.core.time.DateFormats
import com.mikylab.abys.domain.model.MetodoPago
import com.mikylab.abys.presentation.components.ErrorState
import com.mikylab.abys.presentation.theme.AbysColors
import java.time.LocalDate
import java.time.YearMonth

/**
 * Pantalla "Registrar pago" (equivalente a `/registrar` del web).
 *
 * Fase 1: calendario mensual con las 3 herramientas (Trabajo / Pago / Quitar), selección de
 * fuente, método de pago, monto y notas. El comprobante (subida + OCR) es Fase 2.
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun RegistrarScreen(
    modifier: Modifier = Modifier,
    viewModel: RegistrarViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    LazyColumn(
        modifier = modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {

            Text(
                text = "Marca los días trabajados en el calendario y completa el resto del formulario.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        item {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        IconButton(onClick = { viewModel.cambiarMes(-1) }) {
                            Icon(Icons.Filled.ChevronLeft, contentDescription = "Mes anterior")
                        }
                        Text(
                            text = DateFormats.mesAnio(
                                LocalDate.of(state.mesCalendario.year, state.mesCalendario.monthValue, 1),
                            ).replaceFirstChar { it.uppercase() },
                            style = MaterialTheme.typography.titleSmall,
                        )
                        IconButton(onClick = { viewModel.cambiarMes(1) }) {
                            Icon(Icons.Filled.ChevronRight, contentDescription = "Mes siguiente")
                        }
                    }

                    CalendarioMes(
                        mes = state.mesCalendario,
                        diasTrabajados = state.diasTrabajados,
                        fechaPago = state.fechaPago,
                        onMarcar = viewModel::marcarDia,
                        onQuitar = viewModel::quitarDia,
                        onFechaPago = viewModel::cambiarFechaPago,
                    )

                    Text(
                        text = "${state.diasTrabajados.size} día(s) · ${state.fechaPago}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                }
            }
        }

        item {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Text("Datos del pago", style = MaterialTheme.typography.titleSmall)

                    var expandido by remember { mutableStateOf(false) }
                    ExposedDropdownMenuBox(
                        expanded = expandido,
                        onExpandedChange = { expandido = it },
                    ) {
                        OutlinedTextField(
                            value = state.fuenteSeleccionada?.alias.orEmpty(),
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Fuente") },
                            placeholder = { Text("Selecciona la fuente") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expandido) },
                            modifier = Modifier.menuAnchor(androidx.compose.material3.MenuAnchorType.PrimaryNotEditable)
                                .fillMaxWidth(),
                        )
                        ExposedDropdownMenu(expanded = expandido, onDismissRequest = { expandido = false }) {
                            state.fuentes.forEach { fuente ->
                                DropdownMenuItem(
                                    text = { Text(fuente.alias) },
                                    onClick = {
                                        viewModel.seleccionarFuente(fuente.localId)
                                        expandido = false
                                    },
                                )
                            }
                        }
                    }

                    Text("Método de pago", style = MaterialTheme.typography.labelMedium)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        MetodoPago.entries.forEach { metodo ->
                            FilterChip(
                                selected = state.metodoPago == metodo,
                                onClick = { viewModel.seleccionarMetodo(metodo) },
                                label = { Text(metodo.label) },
                            )
                        }
                    }

                    OutlinedTextField(
                        value = state.montoTexto,
                        onValueChange = viewModel::cambiarMonto,
                        label = { Text("Monto (Bs)") },
                        placeholder = { Text("Ej: 1.234,56") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        supportingText = { Text(state.montoAuxiliar) },
                        modifier = Modifier.fillMaxWidth(),
                    )

                    OutlinedTextField(
                        value = state.notas,
                        onValueChange = viewModel::cambiarNotas,
                        label = { Text("Notas") },
                        placeholder = { Text("Referencia, período pagado, observaciones…") },
                        minLines = 2,
                        modifier = Modifier.fillMaxWidth(),
                    )

                    state.error?.let { mensaje ->
                        ErrorState(mensaje = mensaje)
                    }
                    state.exito?.let { mensaje ->
                        Text(
                            text = mensaje,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }

                    Button(
                        onClick = viewModel::guardar,
                        enabled = state.puedeGuardar,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("Guardar pago")
                    }
                }
            }
        }
    }
}

/**
 * Calendario mensual simplified con las 3 herramientas del web:
 * toque corto = trabajar, toque largo = quitar; un botón fija la fecha de pago.
 */
@Composable
private fun CalendarioMes(
    mes: YearMonth,
    diasTrabajados: Set<LocalDate>,
    fechaPago: LocalDate,
    onMarcar: (LocalDate) -> Unit,
    onQuitar: (LocalDate) -> Unit,
    onFechaPago: (LocalDate) -> Unit,
) {
    val diasCabecera = listOf("lu", "ma", "mi", "ju", "vi", "sá", "do")
    val primerDia = mes.atDay(1)
    val desplazamiento = primerDia.dayOfWeek.value - 1
    val celdas = remember(mes) {
        buildList<LocalDate?> {
            repeat(desplazamiento) { add(null) }
            for (dia in 1..mes.lengthOfMonth()) add(mes.atDay(dia))
            while (size % 7 != 0) add(null)
        }
    }

    Column(modifier = Modifier.fillMaxWidth()) {
        Row(modifier = Modifier.fillMaxWidth()) {
            diasCabecera.forEach { dia ->
                Text(
                    text = dia,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.weight(1f),
                )
            }
        }
        celdas.chunked(7).forEach { semana ->
            Row(modifier = Modifier.fillMaxWidth()) {
                semana.forEach { fecha ->
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .aspectRatio(1f)
                            .padding(2.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        if (fecha != null) {
                            val esTrabajado = fecha in diasTrabajados
                            val esPago = fecha == fechaPago
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .background(
                                        color = when {
                                            esPago -> MaterialTheme.colorScheme.primary
                                            esTrabajado -> AbysColors.DiaNuevo.copy(alpha = 0.25f)
                                            else -> Color.Transparent
                                        },
                                        shape = CircleShape,
                                    )
                                    .combinedClickable(
                                        onClick = { onMarcar(fecha) },
                                        onLongClick = { onFechaPago(fecha) },
                                    ),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    text = fecha.dayOfMonth.toString(),
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = if (esPago || esTrabajado) {
                                        FontWeight.Bold
                                    } else {
                                        FontWeight.Normal
                                    },
                                    color = if (esPago) {
                                        MaterialTheme.colorScheme.onPrimary
                                    } else {
                                        MaterialTheme.colorScheme.onSurface
                                    },
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
