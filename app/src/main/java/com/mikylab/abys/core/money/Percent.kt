package com.mikylab.abys.core.money

import java.text.NumberFormat
import java.util.Locale
import kotlin.math.roundToLong

/**
 * Tasa en **basis points** (`tasa_bps`): 2000 = 20 %.
 * Rango válido: 0..10000 (100 %).
 */
@JvmInline
value class Percent(val bps: Long) : Comparable<Percent> {

    override fun compareTo(other: Percent): Int = bps.compareTo(other.bps)

    val isGeneral: Boolean get() = bps == 0L

    companion object {
        val ZERO = Percent(0)

        /** Formatea como el web (`formatTasaBps`): `es-BO`, 0–2 decimales y " %" con espacio. */
        fun format(bps: Long): String {
            val nf = NumberFormat.getNumberInstance(Locale.forLanguageTag("es-BO")).apply {
                minimumFractionDigits = 0
                maximumFractionDigits = 2
            }
            return "${nf.format(bps / 100.0)} %"
        }
    }
}

/** Formatea bps como el web: `formatTasaBps(bps)`. */
fun Long.formatTasaBps(): String = Percent.format(this)

/** Convierte porcentaje (20.5) a bps (2050) con redondeo half-up, como el backend. */
fun Double.toBps(): Long = (this * 100).roundToLong()

/** Convierte bps a porcentaje numérico (2050 → 20.5). */
fun Long.toPercentNumber(): Double = this / 100.0
