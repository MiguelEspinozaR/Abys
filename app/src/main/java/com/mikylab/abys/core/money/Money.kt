package com.mikylab.abys.core.money

import java.text.NumberFormat
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToLong

/**
 * Monto en **centavos** (entero), replicando `monto_enteros` del backend.
 *
 * La conversión a Bs ocurre **solo al visualizar** (regla BR-026).
 */
@JvmInline
value class Money(val centavos: Long) : Comparable<Money> {

    operator fun plus(other: Money) = Money(centavos + other.centavos)

    operator fun minus(other: Money) = Money(centavos - other.centavos)

    override fun compareTo(other: Money): Int = centavos.compareTo(other.centavos)

    val isZero: Boolean get() = centavos == 0L
    val isNegative: Boolean get() = centavos < 0L

    companion object {
        val ZERO = Money(0)

        /**
         * Formatea como el web (`formatBs`): `es-BO`, 2 decimales y sufijo " Bs".
         * Los negativos usan el signo menos tipográfico (U+2212), igual que `format.test.ts`.
         */
        fun format(centavos: Long): String {
            if (centavos == Long.MIN_VALUE) return "—"
            val value = centavos / 100.0
            val nf = NumberFormat.getNumberInstance(Locale.forLanguageTag("es-BO")).apply {
                minimumFractionDigits = 2
                maximumFractionDigits = 2
            }
            val text = nf.format(abs(value))
            val sign = if (centavos < 0) "−" else ""
            return "$sign$text Bs"
        }
    }
}

/** Formatea centavos como el web: `formatBs(cents)`. */
fun Long.formatBs(): String = Money.format(this)

/**
 * Convierte texto en Bs a centavos, replicando `bsToCents` del web.
 *
 * Reglas:
 * - quita espacios y el sufijo `bs` / `bs.`;
 * - si hay ambos separadores, el **último** es el decimal;
 * - solo comas: más de una coma = separador de miles; una sola coma = decimal;
 * - negativo, vacío o no numérico → `null`;
 * - redondea a centavos (`round`).
 */
fun parseBsToCents(raw: String): Long? {
    var s = raw.trim().lowercase(Locale.ROOT)
    if (s.isEmpty()) return null
    s = s.replace(" ", "")
    if (s.endsWith("bs.")) {
        s = s.dropLast(3)
    } else if (s.endsWith("bs")) {
        s = s.dropLast(2)
    }
    if (s.isEmpty() || s.startsWith("-")) return null

    val lastComma = s.lastIndexOf(',')
    val lastDot = s.lastIndexOf('.')
    val normalized: String = when {
        lastComma >= 0 && lastDot >= 0 ->
            if (lastComma > lastDot) s.replace(".", "").replace(',', '.') else s.replace(",", "")
        lastComma >= 0 ->
            if (s.count { it == ',' } > 1) s.replace(",", "") else s.replace(',', '.')
        else -> s
    }
    if (normalized.isEmpty()) return null
    val value = normalized.toDoubleOrNull() ?: return null
    if (value.isNaN() || value.isInfinite()) return null
    return (value * 100).roundToLong()
}

/** Convierte centavos a texto editable en Bs (2 decimales, `es-BO`). */
fun centsToEditableBs(centavos: Long): String {
    val nf = NumberFormat.getNumberInstance(Locale.forLanguageTag("es-BO")).apply {
        minimumFractionDigits = 2
        maximumFractionDigits = 2
    }
    return nf.format(centavos / 100.0)
}
