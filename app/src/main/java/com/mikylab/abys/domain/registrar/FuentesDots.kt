package com.mikylab.abys.domain.registrar

import com.mikylab.abys.domain.model.Fuente
import com.mikylab.abys.domain.model.Pago
import java.time.LocalDate

/**
 * Totales por fuente y día para los puntos del calendario de Registrar (v0.4.0).
 *
 * Réplica pura de `Abys/web/src/lib/fuentesDots.ts`:
 * - agrupa `diasTrabajados[].monto` por fecha y fuente,
 * - hasta 3 fuentes por día (mayor total primero, desempate por `fuente_id`),
 * - el color se valida como `#RRGGBB` y cae a gris si es inválido.
 *
 * No conoce Compose ni Room: la pantalla solo consume el resultado ya calculado.
 */
data class FuenteDelDia(
    /** `serverId` de la fuente (`Long.MAX_VALUE` si aún es local, para ordenar al final). */
    val fuenteId: Long,
    val localId: String,
    val alias: String,
    val color: String,
    val totalCentavos: Long,
)

/** Mapa `fecha -> localId de fuente -> total del día para esa fuente`. */
typealias FuentesPorDia = Map<LocalDate, Map<String, FuenteDelDia>>

/** Color de reserva cuando la fuente no trae un hex válido (equivale a `bg-gray-400`). */
const val COLOR_FUENTE_FALLBACK = "#9CA3AF"

private val HEX = Regex("^#[0-9a-fA-F]{6}$")

/** `true` solo para `#RRGGBB`: evita inyectar valores arbitrarios de la BD en la UI. */
fun esColorHex(color: String?): Boolean = color != null && HEX.matches(color.trim())

private fun colorValido(color: String?): String? =
    color?.takeIf { esColorHex(it) }?.trim()

private fun aliasDe(pago: Pago, fuente: Fuente): String {
    val aliasFuente = fuente.alias.trim()
    if (aliasFuente.isNotEmpty()) return aliasFuente
    val aliasPago = pago.fuente.alias.trim()
    if (aliasPago.isNotEmpty()) return aliasPago
    return "Fuente ${fuente.serverId ?: fuente.localId.take(8)}"
}

/**
 * Suma los montos de los días agrupando por `fecha` y fuente. Si una fuente aparece en
 * varios pagos del mismo día se acumula el total; alias/color se toman de la primera
 * aparición (el orden de [pagos] no altera el importe).
 */
fun construirFuentesPorDia(
    pagos: List<Pago>,
    fuentes: List<Fuente>,
): FuentesPorDia {
    val porLocalId = fuentes.associateBy { it.localId }
    val resultado = linkedMapOf<LocalDate, MutableMap<String, FuenteDelDia>>()

    pagos.forEach { pago ->
        val fuente = porLocalId[pago.fuente.localId] ?: pago.fuente
        val color = colorValido(pago.fuente.color)
            ?: colorValido(fuente.color)
            ?: COLOR_FUENTE_FALLBACK
        val alias = aliasDe(pago, fuente)

        pago.diasTrabajados.forEach { dia ->
            val porFuente = resultado.getOrPut(dia.fecha) { linkedMapOf() }
            val previo = porFuente[fuente.localId]
            porFuente[fuente.localId] = if (previo == null) {
                FuenteDelDia(
                    fuenteId = fuente.serverId ?: Long.MAX_VALUE,
                    localId = fuente.localId,
                    alias = alias,
                    color = color,
                    totalCentavos = dia.monto.centavos,
                )
            } else {
                previo.copy(totalCentavos = previo.totalCentavos + dia.monto.centavos)
            }
        }
    }
    return resultado
}

/**
 * Hasta 3 fuentes del día: mayor `totalCentavos` primero y desempate por `fuenteId`
 * ascendente (y `localId` para las que aún no tienen id de servidor).
 */
fun top3Fuentes(
    mapa: FuentesPorDia?,
    fecha: LocalDate,
): List<FuenteDelDia> =
    mapa?.get(fecha)?.values
        ?.sortedWith(
            compareByDescending<FuenteDelDia> { it.totalCentavos }
                .thenBy { it.fuenteId }
                .thenBy { it.localId },
        )
        ?.take(3)
        .orEmpty()

/** Fuentes únicas presentes en el mapa, ordenadas por id (leyenda del calendario). */
fun fuentesParaLeyenda(mapa: FuentesPorDia?): List<FuenteDelDia> {
    val porId = linkedMapOf<String, FuenteDelDia>()
    mapa?.values.orEmpty().forEach { porFuente ->
        porFuente.values.forEach { fuente ->
            porId.putIfAbsent(fuente.localId, fuente)
        }
    }
    return porId.values.sortedWith(
        compareBy<FuenteDelDia> { it.fuenteId }.thenBy { it.alias.lowercase() },
    )
}
