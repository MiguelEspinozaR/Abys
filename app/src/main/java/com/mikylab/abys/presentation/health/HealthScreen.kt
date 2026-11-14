package com.mikylab.abys.presentation.health

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Dns
import androidx.compose.material.icons.filled.Layers
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Storage
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.mikylab.abys.core.time.DateFormats
import com.mikylab.abys.presentation.components.ErrorState
import com.mikylab.abys.presentation.components.KpiCard
import com.mikylab.abys.presentation.components.LoadingState

/**
 * Pantalla "Salud del sistema" (equivalente a `/health` del web).
 * Lee **siempre** del servidor: es una comprobación en vivo, no se cachea.
 */
@Composable
fun HealthScreen(
    modifier: Modifier = Modifier,
    viewModel: HealthViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    LazyColumn(
        modifier = modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {

                    Text(
                        text = state.ultimaComprobacion?.let {
                            "Última comprobación: ${DateFormats.horaLocal(it)}"
                        } ?: "Métricas en vivo de la base de datos del backend.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                IconButton(onClick = viewModel::refrescar, enabled = !state.cargando) {
                    Icon(Icons.Filled.Refresh, contentDescription = "Refrescar")
                }
            }
        }

        if (state.cargando && state.info == null) {
            item { LoadingState(texto = "Comprobando el backend…") }
        }

        state.error?.let { mensaje ->
            item { ErrorState(mensaje = mensaje, onReintentar = viewModel::refrescar) }
        }

        state.info?.let { info ->
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    KpiCard(
                        titulo = "Conexión",
                        valor = info.conexion,
                        icon = Icons.Filled.Storage,
                        modifier = Modifier.weight(1f),
                    )
                    KpiCard(
                        titulo = "Latencia",
                        valor = "${info.latenciaMs} ms",
                        icon = Icons.Filled.Timer,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    KpiCard(
                        titulo = "Versión PostgreSQL",
                        valor = info.versionPg.split(" ").firstOrNull() ?: info.versionPg,
                        icon = Icons.Filled.Layers,
                        modifier = Modifier.weight(1f),
                    )
                    KpiCard(
                        titulo = "Tamaño de la DB",
                        valor = info.tamanoDb,
                        icon = Icons.Filled.Storage,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
            item {
                Text(
                    text = "Tablas (${info.tablas.size})",
                    style = MaterialTheme.typography.titleSmall,
                )
            }
            items(info.tablas, key = { it.nombre }) { tabla ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(
                            text = tabla.nombre,
                            style = MaterialTheme.typography.bodyMedium,
                            fontFamily = FontFamily.Monospace,
                        )
                        Text(
                            text = tabla.registros.toString(),
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                }
            }
            item {
                AssistChip(
                    onClick = {},
                    label = { Text("PostgreSQL ${info.versionPg}") },
                )
            }
        }
    }
}
