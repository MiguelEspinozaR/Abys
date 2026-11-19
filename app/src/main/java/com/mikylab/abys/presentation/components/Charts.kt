package com.mikylab.abys.presentation.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.mikylab.abys.core.money.formatBs
import com.mikylab.abys.core.time.mesesAbrev
import com.mikylab.abys.domain.model.FuenteTotal
import kotlin.math.max
import kotlin.math.min

/**
 * Gráficos del dashboard dibujados con `Canvas` (sin librerías externas).
 *
 * Equivalen a los charts de Recharts del web (dashboard v2): barras simples, barras
 * apiladas por fuente, torta de distribución y línea del histórico.
 */

/** Fila del gráfico semanal: barras apiladas por fuente. */
data class FilaApilada(
    /** Etiqueta del eje X (p. ej. "lun 20"). */
    val etiqueta: String,
    /** Serie `alias → centavos`, en el orden de la leyenda. */
    val series: List<Pair<String, Long>>,
    val totalCentavos: Long,
)

/** Gráfico de barras simples (mensual/anual). */
@Composable
fun BarChart(
    data: List<Pair<String, Long>>,
    modifier: Modifier = Modifier,
    color: Color = MaterialTheme.colorScheme.primary,
    emptyText: String = "Sin datos en el rango seleccionado",
) {
    if (data.isEmpty() || data.all { it.second == 0L }) {
        TextoVacioChart(modifier, emptyText)
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

/** Gráfico de barras apiladas por fuente (semanal, R6/D9 del dashboard v2). */
@Composable
fun StackedBarChart(
    filas: List<FilaApilada>,
    coloresPorSerie: Map<String, Color>,
    modifier: Modifier = Modifier,
    strokeColor: Color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f),
    emptyText: String = "Sin datos en la semana",
) {
    if (filas.isEmpty() || filas.all { it.totalCentavos == 0L }) {
        TextoVacioChart(modifier, emptyText)
        return
    }

    val maxValue = max(1L, filas.maxOf { it.totalCentavos })
    val gridColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.25f)
    val labelColor = MaterialTheme.colorScheme.onSurfaceVariant
    val defaultColor = MaterialTheme.colorScheme.primary

    Column(modifier = modifier.fillMaxWidth()) {
        Canvas(modifier = Modifier.fillMaxWidth().height(200.dp)) {
            val anchoTotal = size.width
            val altoUtil = size.height - 24.dp.toPx()
            val hueco = 6.dp.toPx()
            val anchoBarra = ((anchoTotal - hueco * (filas.size - 1)) / filas.size)
                .coerceIn(4f, 42.dp.toPx())

            repeat(4) { i ->
                val y = altoUtil * i / 3f
                drawLine(
                    color = gridColor,
                    start = Offset(0f, y),
                    end = Offset(anchoTotal, y),
                    strokeWidth = 1f,
                )
            }

            filas.forEachIndexed { index, fila ->
                val x = index * (anchoBarra + hueco)
                var acumulado = 0f
                fila.series.forEach { (alias, valor) ->
                    if (valor > 0L) {
                        val alturaSegmento = (valor.toFloat() / maxValue) * altoUtil
                        val yTop = altoUtil - acumulado - alturaSegmento
                        drawRect(
                            color = coloresPorSerie[alias] ?: defaultColor,
                            topLeft = Offset(x, yTop),
                            size = Size(anchoBarra, alturaSegmento),
                        )
                        drawRect(
                            color = strokeColor,
                            topLeft = Offset(x, yTop),
                            size = Size(anchoBarra, alturaSegmento),
                            style = androidx.compose.ui.graphics.drawscope.Stroke(width = 1f),
                        )
                        acumulado += alturaSegmento
                    }
                }
            }
        }

        Row(modifier = Modifier.fillMaxWidth().padding(top = 4.dp)) {
            filas.forEach { fila ->
                Text(
                    text = fila.etiqueta,
                    style = MaterialTheme.typography.labelSmall,
                    color = labelColor,
                    modifier = Modifier.weight(1f),
                    maxLines = 1,
                )
            }
        }
    }
}

/** Torta de distribución por fuente con leyenda (R10/D6 del dashboard v2). */
@Composable
fun DistributionPieChart(
    porFuente: List<FuenteTotal>,
    coloresPorSerie: Map<String, Color>,
    modifier: Modifier = Modifier,
    emptyText: String = "Sin datos en el período",
) {
    if (porFuente.isEmpty() || porFuente.sumOf { it.total.centavos } <= 0) {
        TextoVacioChart(modifier, emptyText)
        return
    }

    val total = porFuente.sumOf { it.total.centavos }
    val strokeColor = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f)
    val defaultColor = MaterialTheme.colorScheme.primary

    Row(modifier = modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Canvas(
            modifier = Modifier
                .weight(1f)
                .height(160.dp)
                .padding(8.dp),
        ) {
            val radio = min(size.width, size.height) / 2f
            val centro = Offset(size.width / 2f, size.height / 2f)
            var anguloInicio = -90f
            porFuente.forEach { fuente ->
                val fraccion = fuente.total.centavos.toFloat() / total
                val angulo = fraccion * 360f
                drawArc(
                    color = coloresPorSerie[fuente.alias] ?: defaultColor,
                    startAngle = anguloInicio,
                    sweepAngle = angulo,
                    useCenter = true,
                    topLeft = Offset(centro.x - radio, centro.y - radio),
                    size = Size(radio * 2, radio * 2),
                )
                // Borde del sector (stroke del web).
                drawArc(
                    color = strokeColor,
                    startAngle = anguloInicio,
                    sweepAngle = angulo,
                    useCenter = true,
                    topLeft = Offset(centro.x - radio, centro.y - radio),
                    size = Size(radio * 2, radio * 2),
                    style = androidx.compose.ui.graphics.drawscope.Stroke(width = 1f),
                )
                anguloInicio += angulo
            }
        }

        // Leyenda: nombre · monto · porcentaje (ChartLegend del web, sin patrones).
        Column(
            modifier = Modifier
                .weight(1f)
                .padding(start = 8.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            porFuente.forEach { fuente ->
                val porcentaje = if (total > 0) {
                    val valor = fuente.total.centavos * 100.0 / total
                    val texto = if (valor >= 10) "%.0f" else "%.1f"
                    texto.format(valor).replace('.', ',')
                } else {
                    "0"
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .background(
                                coloresPorSerie[fuente.alias]
                                    ?: MaterialTheme.colorScheme.primary,
                                CircleShape,
                            ),
                    )
                    Text(
                        text = "${fuente.alias} · ${fuente.total.centavos.formatBs()} · $porcentaje %",
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.padding(start = 6.dp),
                    )
                }
            }
        }
    }
}

/** Gráfico de líneas (histórico, sin tendencia desde 0.3.0). */
@Composable
fun LineChart(
    points: List<Pair<String, Long>>,
    modifier: Modifier = Modifier,
    color: Color = MaterialTheme.colorScheme.primary,
    emptyText: String = "Sin datos en el rango seleccionado",
) {
    if (points.size < 2) {
        TextoVacioChart(modifier, emptyText)
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

            val path = Path()
            points.forEachIndexed { index, (_, valor) ->
                val x = ancho * index / (points.size - 1)
                val y = alto - (valor.toFloat() / maxValue) * alto
                if (index == 0) path.moveTo(x, y) else path.lineTo(x, y)
            }
            drawPath(path, color = color, style = androidx.compose.ui.graphics.drawscope.Stroke(width = 4f))
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

/** Etiqueta de mes abreviado para el eje X del gráfico anual/histórico. */
fun etiquetaMes(mes: Int): String =
    mesesAbrev.getOrNull(mes - 1) ?: mes.toString()

@Composable
private fun TextoVacioChart(modifier: Modifier = Modifier, texto: String) {
    Box(
        modifier = modifier.fillMaxWidth().height(200.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = texto,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
    }
}
