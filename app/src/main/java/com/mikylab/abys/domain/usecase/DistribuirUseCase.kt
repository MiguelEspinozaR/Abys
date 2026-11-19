package com.mikylab.abys.domain.usecase

import com.mikylab.abys.domain.model.ModoDistribucion

/**
 * Distribución equitativa de un total (centavos) entre N días trabajados.
 *
 * Espeja `Abys/web/src/lib/distribuir.ts` (y la semántica de `backend/internal/splitcalc`):
 * - `redondeado`: half-up a 1 Bs (100 centavos)
 * - `enteros`:    truncado a 1 Bs (100 centavos)
 * - `preciso`:    centavo exacto
 *
 * La base se calcula sobre `floor(total / n)` y el último día absorbe el residuo
 * (`total - base * (n - 1)`), de modo que la suma sea exactamente el total. Si el redondeo
 * hacia arriba dejara al último día en negativo (totales muy pequeños respecto de N), la base
 * se ajusta al múltiplo del paso que cabe en los días restantes: Σ === total y último >= 0.
 */
object DistribuirUseCase {

    /** Aplica el modo de redondeo de `splitcalc` a un monto en centavos. */
    fun aplicarModo(raw: Long, modo: ModoDistribucion): Long = when (modo) {
        ModoDistribucion.REDONDEADO -> ((raw + 50) / 100) * 100
        ModoDistribucion.ENTEROS -> (raw / 100) * 100
        ModoDistribucion.PRECISO -> raw
    }

    /**
     * Reparte [totalCentavos] entre [cantidad] días. Devuelve exactamente [cantidad] montos en
     * centavos cuya suma es [totalCentavos]; el último absorbe el sobrante.
     */
    fun distribuir(totalCentavos: Long, cantidad: Int, modo: ModoDistribucion): List<Long> {
        require(totalCentavos >= 0) { "el total debe ser un entero de centavos >= 0" }
        require(cantidad >= 1) { "la cantidad de días debe ser un entero >= 1" }
        if (cantidad == 1) return listOf(totalCentavos)

        val baseRaw = totalCentavos / cantidad
        var base = aplicarModo(baseRaw, modo)

        // El redondeo half-up puede exceder el total cuando n > 1; se baja la base al
        // múltiplo del paso que cabe en los días restantes (residuo al último día).
        if (base * (cantidad - 1) > totalCentavos) {
            val paso = if (modo == ModoDistribucion.PRECISO) 1L else 100L
            base = (totalCentavos / (cantidad - 1) / paso) * paso
        }

        val montos = LongArray(cantidad) { base }
        montos[cantidad - 1] = totalCentavos - base * (cantidad - 1)
        return montos.toList()
    }
}
