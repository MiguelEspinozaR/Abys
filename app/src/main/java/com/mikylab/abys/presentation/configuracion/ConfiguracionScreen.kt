package com.mikylab.abys.presentation.configuracion

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.mikylab.abys.core.money.formatTasaBps
import com.mikylab.abys.domain.model.ModoCalculo
import com.mikylab.abys.presentation.components.EstadoVacio

/**
 * Pantalla "Configuración" (equivalente a `/configuracion` del web) con las pestañas
 * Cuentas · Fuentes · Splits, más la sección **Ajustes de la app** (URL del backend y sync).
 */
@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
fun ConfiguracionScreen(
    modifier: Modifier = Modifier,
    viewModel: ConfiguracionViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    var tab by remember { mutableIntStateOf(0) }
    var urlTexto by remember(state.baseUrl) { mutableStateOf(state.baseUrl) }

    LazyColumn(
        modifier = modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Text("Configuración", style = MaterialTheme.typography.headlineSmall)
            Text(
                text = "Administra fuentes de ingreso, cuentas de distribución y splits.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        item {
            TabRow(selectedTabIndex = tab) {
                listOf("Cuentas", "Fuentes", "Splits").forEachIndexed { index, titulo ->
                    Tab(
                        selected = tab == index,
                        onClick = { tab = index },
                        text = { Text(titulo) },
                    )
                }
            }
        }

        state.mensaje?.let { mensaje ->
            item {
                Text(
                    text = mensaje,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
        }

        when (tab) {
            0 -> {
                if (state.sumaTasasNoGeneral > 10_000) {
                    item {
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(
                                    text = "Suma de tasas > 100%",
                                    style = MaterialTheme.typography.titleSmall,
                                    color = MaterialTheme.colorScheme.error,
                                )
                                Text(
                                    text = "La suma de tasas de las cuentas " +
                                        "(${state.sumaTasasNoGeneral.formatTasaBps()}) supera el 100%. " +
                                        "La API rechazará nuevos splits hasta corregirlo.",
                                    style = MaterialTheme.typography.bodySmall,
                                )
                            }
                        }
                    }
                }
                item {
                    Text(
                        text = "Cuentas (${state.cuentas.size}) · suma otras: " +
                            state.sumaTasasNoGeneral.formatTasaBps(),
                        style = MaterialTheme.typography.titleSmall,
                    )
                }
                if (state.cuentas.isEmpty()) {
                    item { EstadoVacio(titulo = "No hay cuentas configuradas.") }
                }
                items(state.cuentas, key = { it.localId }) { cuenta ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(cuenta.alias, style = MaterialTheme.typography.titleSmall)
                                    Text(
                                        text = "${cuenta.banco ?: "—"}" +
                                            (cuenta.numero?.let { " · $it" } ?: ""),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                                Column(horizontalAlignment = androidx.compose.ui.Alignment.End) {
                                    Text(
                                        text = cuenta.tasa.bps.formatTasaBps(),
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                    if (cuenta.esGeneral) {
                                        AssistChip(onClick = {}, label = { Text("Residual (derivada)") })
                                        Text(
                                            text = "= 100% − otras · no configurable",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            1 -> {
                item { Text("Fuentes (${state.fuentes.size})", style = MaterialTheme.typography.titleSmall) }
                if (state.fuentes.isEmpty()) {
                    item { EstadoVacio(titulo = "No hay fuentes configuradas.") }
                }
                items(state.fuentes, key = { it.localId }) { fuente ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                        ) {
                            Column {
                                Text(fuente.alias, style = MaterialTheme.typography.titleSmall)
                                Text(
                                    text = fuente.color,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            AssistChip(
                                onClick = {},
                                label = {
                                    Text(
                                        if (fuente.splitAuto) {
                                            "Auto · ${fuente.splitAutoModo?.wire ?: "por defecto"}"
                                        } else {
                                            "Manual"
                                        },
                                    )
                                },
                            )
                        }
                    }
                }
            }

            else -> {
                item {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Text("Modo de cálculo por defecto", style = MaterialTheme.typography.titleSmall)
                            Text(
                                text = "Se usa al generar un split cuando la fuente no define un modo propio.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                ModoCalculo.entries.forEach { modo ->
                                    FilterChip(
                                        selected = state.modoDefault == modo,
                                        onClick = { viewModel.cambiarModoDefault(modo) },
                                        label = {
                                            Text(
                                                when (modo) {
                                                    ModoCalculo.PRECISO -> "preciso (truncado al centavo)"
                                                    ModoCalculo.REDONDEADO -> "redondeado (half-up a 1 Bs)"
                                                    ModoCalculo.ENTEROS -> "enteros (truncado a 1 Bs)"
                                                },
                                            )
                                        },
                                    )
                                }
                            }
                        }
                    }
                }

                item {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Text("Ajustes de la app", style = MaterialTheme.typography.titleSmall)
                            OutlinedTextField(
                                value = urlTexto,
                                onValueChange = { urlTexto = it },
                                label = { Text("URL del backend") },
                                supportingText = { Text("Se guarda cifrada en el dispositivo") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth(),
                            )
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                TextButton(onClick = { viewModel.actualizarBaseUrl(urlTexto) }) {
                                    Text("Guardar URL")
                                }
                                TextButton(onClick = {
                                    viewModel.restaurarBaseUrl()
                                    urlTexto = state.baseUrl
                                }) {
                                    Text("Restaurar")
                                }
                                TextButton(onClick = viewModel::sincronizarAhora) { Text("Sincronizar ahora") }
                            }
                            Text(
                                text = "Pendientes de sincronizar: ${state.pendientesSync}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            state.errorSync?.let { error ->
                                Text(
                                    text = "Último error: $error",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.error,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
