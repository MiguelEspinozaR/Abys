package com.mikylab.abys.presentation.registrar

import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
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
import com.mikylab.abys.core.money.Money
import com.mikylab.abys.core.time.DateFormats
import com.mikylab.abys.domain.model.MetodoPago
import com.mikylab.abys.domain.model.ModoDistribucion
import com.mikylab.abys.domain.model.ModoRegistro
import com.mikylab.abys.domain.registrar.FuentesPorDia
import com.mikylab.abys.domain.registrar.fuentesParaLeyenda
import com.mikylab.abys.domain.registrar.top3Fuentes
import com.mikylab.abys.presentation.components.ErrorState
import com.mikylab.abys.presentation.theme.AbysColors
import java.time.LocalDate
import java.time.YearMonth

/**
 * Pantalla "Registrar pago" (equivalente a `/registrar` del web v0.3.0).
 *
 * Registro **híbrido** de montos por día: calendario con 3 herramientas (Trabajo / Pago / Quitar),
 * modo Detallado (monto por día) o Distribuido (total repartido equitativamente).
 * Sin OCR: el comprobante no extrae datos (R: v0.3.0 sin OCR); la subida es una mejora posterior.
 */
@OptIn(
    ExperimentalMaterial3Api::class,
    ExperimentalFoundationApi::class,
    androidx.compose.foundation.layout.ExperimentalLayoutApi::class,
)
@Composable
fun RegistrarScreen(    modifier: Modifier = Modifier,
    viewModel: RegistrarViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            text = "Registrar pago",
            style = MaterialTheme.typography.titleLarge,
        )
        Text(
            text = "Marca los días trabajados en el calendario y elige cómo cargar los montos.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        // ── Calendario ────────────────────────────────────────────────────────
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
                    yaFechasPago = state.yaFechasPago,
                    fuentesPorDia = state.fuentesPorDia,
                    onMarcar = viewModel::marcarDia,
                    onQuitar = viewModel::quitarDia,
                    onFechaPago = viewModel::cambiarFechaPago,
                )

                // Leyenda y contador (CalendarioDias del web).
                Column(modifier = Modifier.padding(top = 8.dp)) {
                    LeyendaCalendario(AbysColors.DiaNuevo, "día trabajado (nuevo)")
                    LeyendaCalendario(AbysColors.FechaPago, "fecha de pago ya registrada")
                    val fuentesLeyenda = fuentesParaLeyenda(state.fuentesPorDia)
                    if (fuentesLeyenda.isNotEmpty()) {
                        FlowRow(
                            modifier = Modifier.padding(top = 4.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp),
                        ) {
                            Text(
                                text = "Fuentes",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            fuentesLeyenda.forEach { fuente ->
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        modifier = Modifier
                                            .padding(end = 4.dp)
                                            .size(8.dp)
                                            .background(
                                                com.mikylab.abys.presentation.theme
                                                    .colorDesdeHex(fuente.color, Color.Gray),
                                                CircleShape,
                                            ),
                                    )
                                    Text(
                                        text = fuente.alias,
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }
                    }
                }
                Text(
                    text = "${state.diasTrabajados.size} día(s) · " +
                        (state.fechaPago.takeIf { it != LocalDate.MIN }?.toString() ?: "sin fecha de pago"),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
        }

        // ── Datos del pago ───────────────────────────────────────────────────
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
                                text = {
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Box(
                                            modifier = Modifier
                                                .padding(top = 6.dp, end = 0.dp)
                                                .size(10.dp)
                                                .background(
                                                    com.mikylab.abys.presentation.theme
                                                        .colorDesdeHex(fuente.color),
                                                    CircleShape,
                                                ),
                                        )
                                        Text(fuente.alias)
                                    }
                                },
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

                Text("Modo de registro", style = MaterialTheme.typography.labelMedium)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    ModoRegistro.entries.forEach { modo ->
                        FilterChip(
                            selected = state.modoRegistro == modo,
                            onClick = { viewModel.seleccionarModoRegistro(modo) },
                            label = { Text(modo.label) },
                        )
                    }
                }
                Text(
                    text = if (state.modoRegistro == ModoRegistro.DETALLADO) {
                        "Ingresa el monto de cada día; el total se calcula solo."
                    } else {
                        "Ingresa el total y el sistema lo reparte entre los días."
                    },
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )

                // ── Montos ───────────────────────────────────────────────────
                Text(
                    text = if (state.modoRegistro == ModoRegistro.DETALLADO) {
                        "Monto por día (Bs)"
                    } else {
                        "Total a distribuir (Bs)"
                    },
                    style = MaterialTheme.typography.labelMedium,
                )

                if (state.diasOrdenados.isEmpty()) {
                    Text(
                        text = "Selecciona al menos un día en el calendario.",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                } else if (state.modoRegistro == ModoRegistro.DETALLADO) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        state.diasOrdenados.forEach { fecha ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    text = DateFormats.fechaCorta(fecha),
                                    style = MaterialTheme.typography.bodyMedium,
                                    modifier = Modifier.weight(1f),
                                )
                                OutlinedTextField(
                                    value = state.montosDia[fecha].orEmpty(),
                                    onValueChange = { viewModel.cambiarMontoDia(fecha, it) },
                                    placeholder = { Text("0,00") },
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(
                                        keyboardType = KeyboardType.Decimal,
                                    ),
                                    isError = state.errorMontos != null,
                                    modifier = Modifier.padding(start = 8.dp).widthMonto(),
                                )
                            }
                        }
                    }
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = state.totalDistribuidoTexto,
                            onValueChange = viewModel::cambiarTotalDistribuido,
                            label = { Text("Total (Bs)") },
                            placeholder = { Text("Ej: 1.234,56") },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            isError = state.errorMontos != null,
                            modifier = Modifier.fillMaxWidth(),
                        )

                        var expandidoRedondeo by remember { mutableStateOf(false) }
                        ExposedDropdownMenuBox(
                            expanded = expandidoRedondeo,
                            onExpandedChange = { expandidoRedondeo = it },
                        ) {
                            OutlinedTextField(
                                value = state.modoRedondeo.label,
                                onValueChange = {},
                                readOnly = true,
                                label = { Text("Redondeo") },
                                trailingIcon = {
                                    ExposedDropdownMenuDefaults.TrailingIcon(expandidoRedondeo)
                                },
                                modifier = Modifier.menuAnchor(
                                    androidx.compose.material3.MenuAnchorType.PrimaryNotEditable,
                                ).fillMaxWidth(),
                            )
                            ExposedDropdownMenu(
                                expanded = expandidoRedondeo,
                                onDismissRequest = { expandidoRedondeo = false },
                            ) {
                                ModoDistribucion.entries.forEach { modo ->
                                    DropdownMenuItem(
                                        text = { Text(modo.label) },
                                        onClick = {
                                            viewModel.cambiarModoRedondeo(modo)
                                            expandidoRedondeo = false
                                        },
                                    )
                                }
                            }
                        }
                        Text(
                            text = "El sobrante se asigna al último día.",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )

                        // Vista previa de la distribución equitativa.
                        state.montosDistribuidos?.let { montos ->
                            Text(
                                text = "VISTA PREVIA",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            state.diasOrdenados.forEachIndexed { indice, fecha ->
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Text(
                                        text = DateFormats.fechaCorta(fecha),
                                        style = MaterialTheme.typography.bodyMedium,
                                    )
                                    Text(
                                        text = Money.format(montos[indice]),
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Medium,
                                    )
                                }
                            }
                        } ?: Text(
                            text = "Ingresa un total válido para ver la vista previa.",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }

                state.errorMontos?.let { error ->
                    Text(
                        text = error,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.error,
                    )
                }

                // Total del pago (derivado).
                Card(colors = androidx.compose.material3.CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant,
                )) {
                    Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp)) {
                        Text(
                            text = "Total del pago: ",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            text = Money.format(state.totalCentavos),
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
                Text(
                    text = if (state.modoRegistro == ModoRegistro.DETALLADO) {
                        "El total es la suma de los montos por día."
                    } else {
                        "El total se reparte equitativamente entre los días seleccionados."
                    },
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    text = "Usa coma decimal y punto para miles: 1.234,56.",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
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

private fun Modifier.widthMonto(): Modifier = this.then(
    Modifier.defaultMinSize(minWidth = 120.dp),
)
@Composable
private fun LeyendaCalendario(color: Color, texto: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            modifier = Modifier
                .padding(end = 6.dp)
                .size(8.dp)
                .background(color, CircleShape),
        )
        Text(
            text = texto,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

/**
 * Calendario mensual con las 3 herramientas del web:
 * toque corto = trabajo/pago según la herramienta, toque largo = quitar.
 *
 * v0.4.0: puntos por día (verde = día nuevo, ámbar = fecha de pago ya registrada y hasta
 * 3 fuentes del día cuando no es un día seleccionado).
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun CalendarioMes(
    mes: YearMonth,
    diasTrabajados: Set<LocalDate>,
    fechaPago: LocalDate,
    yaFechasPago: Set<LocalDate>,
    fuentesPorDia: FuentesPorDia,
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
                            val esYaPago = fecha in yaFechasPago
                            // El límite de 3 es solo de fuentes; verde/ámbar se añaden por su regla.
                            val fuentesDelDia = if (esTrabajado) {
                                emptyList()
                            } else {
                                top3Fuentes(fuentesPorDia, fecha)
                            }
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(1.dp),
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(32.dp)
                                        .background(
                                            color = when {
                                                esPago -> MaterialTheme.colorScheme.primary
                                                esTrabajado ->
                                                    AbysColors.DiaNuevo.copy(alpha = 0.25f)

                                                esYaPago ->
                                                    MaterialTheme.colorScheme.primary.copy(alpha = 0.10f)

                                                else -> Color.Transparent
                                            },
                                            shape = CircleShape,
                                        )
                                        .combinedClickable(
                                            onClick = { onMarcar(fecha) },
                                            onLongClick = { onQuitar(fecha) },
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
                                if (esTrabajado || esYaPago || fuentesDelDia.isNotEmpty()) {
                                    Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                                        if (esTrabajado) PuntoCalendario(AbysColors.DiaNuevo)
                                        if (esYaPago) PuntoCalendario(AbysColors.FechaPago)
                                        fuentesDelDia.forEach { fuente ->
                                            PuntoCalendario(
                                                com.mikylab.abys.presentation.theme
                                                    .colorDesdeHex(fuente.color, Color.Gray),
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PuntoCalendario(color: Color) {
    Box(
        modifier = Modifier
            .size(4.dp)
            .background(color, CircleShape),
    )
}
