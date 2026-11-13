package com.mikylab.abys.presentation.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.unit.dp
import kotlin.math.max

/**
 * Gráfico de barras dibujado con `Canvas` (sin librerías externas).
 *
 * Equivale a los `BarChart` de Recharts del web: barras con `radius` superior,
 * eje Y en Bs (sin decimales) y etiqueta X configurable.
 */
@Composable
fun BarChart(
    data: List<Pair<String, Long>>,
    modifier: Modifier = Modifier,
    color: Color = MaterialTheme.colorScheme.primary,
    emptyText: String = "Sin datos en el rango seleccionado",
) {
    if (data.isEmpty() || data.all { it.second == 0L }) {
        Box(
            modifier = modifier.fillMaxWidth().height(200.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = emptyText,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        return
    }

    val maxValue = max(1L, data.maxOf { it.second })
    val gridColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.25f)
    val labelColor = MaterialTheme.colorScheme.onSurfaceVariant

    Column(modifier = modifier.fillMaxWidth()) {
        Canvas(modifier = Modifier.fillMaxWidth().height(200.dp)) {
            val anchoTotal = size.width
            val altoUtil = size.height - 24.dp.toPx()
            val hueco = 6.dp.toPx()
            val anchoBarra = ((anchoTotal - hueco * (data.size - 1)) / data.size).coerceAtLeast(4f)

            // Líneas de guía horizontales (equivale a CartesianGrid).
            repeat(4) { i ->
                val y = altoUtil * i / 3f
                drawLine(
                    color = gridColor,
                    start = Offset(0f, y),
                    end = Offset(anchoTotal, y),
                    strokeWidth = 1f,
                )
            }

            data.forEachIndexed { index, (_, valor) ->
                val altura = (valor.toFloat() / maxValue) * altoUtil
                val x = index * (anchoBarra + hueco)
                drawRoundRect(
                    color = color,
                    topLeft = Offset(x, altoUtil - altura),
                    size = Size(anchoBarra, altura.coerceAtLeast(2f)),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(6f, 6f),
                )
            }
        }

        Row(modifier = Modifier.fillMaxWidth().padding(top = 4.dp)) {
            data.forEach { (label, _) ->
                Text(
                    text = label,
                    style = MaterialTheme.typography.labelSmall,
                    color = labelColor,
                    modifier = Modifier.weight(1f),
                    maxLines = 1,
                )
            }
        }
    }
}

/**
 * Gráfico de líneas (histórico) con Canvas: serie principal + serie de tendencia.
 */
@Composable
fun LineChart(
    points: List<Pair<String, Long>>,
    trend: List<Long>,
    modifier: Modifier = Modifier,
    color: Color = MaterialTheme.colorScheme.primary,
    trendColor: Color = MaterialTheme.colorScheme.tertiary,
    emptyText: String = "Sin datos en el rango seleccionado",
) {
    if (points.size < 2) {
        Box(
            modifier = modifier.fillMaxWidth().height(200.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = emptyText,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        return
    }

    val maxValue = max(1L, points.maxOf { it.second })
    val gridColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.25f)

    Column(modifier = modifier.fillMaxWidth()) {
        Canvas(modifier = Modifier.fillMaxWidth().height(200.dp)) {
            val ancho = size.width
            val alto = size.height - 24.dp.toPx()
            repeat(4) { i ->
                val y = alto * i / 3f
                drawLine(gridColor, Offset(0f, y), Offset(ancho, y), strokeWidth = 1f)
            }

            fun pathFor(values: List<Long>): Path {
                val path = Path()
                values.forEachIndexed { index, valor ->
                    val x = if (values.size == 1) 0f else ancho * index / (values.size - 1)
                    val y = alto - (valor.toFloat() / maxValue) * alto
                    if (index == 0) path.moveTo(x, y) else path.lineTo(x, y)
                }
                return path
            }

            if (trend.size == points.size) {
                drawPath(pathFor(trend), color = trendColor, style = androidx.compose.ui.graphics.drawscope.Stroke(width = 3f))
            }
            drawPath(pathFor(points.map { it.second }), color = color, style = androidx.compose.ui.graphics.drawscope.Stroke(width = 4f))
        }

        Row(modifier = Modifier.fillMaxWidth().padding(top = 4.dp)) {
            points.forEach { (label, _) ->
                Text(
                    text = label,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.weight(1f),
                    maxLines = 1,
                )
            }
        }
    }
}
