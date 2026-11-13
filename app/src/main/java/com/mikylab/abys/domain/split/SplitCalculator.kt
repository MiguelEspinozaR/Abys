package com.mikylab.abys.domain.split

import com.mikylab.abys.domain.model.ModoCalculo

/**
 * Réplica exacta de `Abys/backend/internal/splitcalc/splitcalc.go`.
 *
 * Permite calcular y previsualizar splits **sin red** con el mismo resultado que el servidor
 * (mismo redondeo, mismo residuo a la cuenta General, mismos errores).
 *
 * Reglas:
 * - `raw = trunc(montoCents * tasaBps / 10000)`
 * - `redondeado` → `((raw + 50) / 100) * 100` (half-up al Bs)
 * - `enteros`    → `(raw / 100) * 100` (truncado al Bs)
 * - `preciso`    → `raw` (centavos exactos)
 * - General = `monto − Σ(no-General)`; nunca negativo.
 * - Σ transacciones = monto del pago (invariante BR-081).
 */
object SplitCalculator {

    /** Tasa de una cuenta en el momento del cálculo. */
    data class TasaCuenta(
        val cuentaLocalId: String,
        val alias: String,
        val tasaBps: Long,
        val esGeneral: Boolean,
    )

    /** Transacción calculada. */
    data class TransaccionCalculada(
        val cuentaLocalId: String,
        val alias: String,
        val tasaBps: Long,
        val montoCents: Long,
    )

    /** Estado actual de una transacción para poder recalcular las pendientes. */
    data class TransaccionRecalculo(
        val id: String,
        val cuentaLocalId: String,
        val alias: String,
        val tasaBps: Long,
        val montoCents: Long,
        val realizado: Boolean,
        val esGeneral: Boolean,
    )

    /** Resultado del recálculo: montos nuevos por transacción. */
    data class ResultadoRecalculo(
        val indice: Map<String, TransaccionCalculada>,
        val suma: Long,
    )

    /** Error de cálculo con el mismo texto que devuelve el backend. */
    class CalculoException(message: String) : Exception(message)

    /**
     * Distribuye el pago entre las cuentas dadas.
     *
     * @throws CalculoException con el mensaje equivalente al del backend.
     */
    fun calcular(
        montoCents: Long,
        tasas: List<TasaCuenta>,
        modo: ModoCalculo,
    ): List<TransaccionCalculada> {
        if (montoCents < 0) throw CalculoException("el monto del pago no puede ser negativo")

        val general = tasas.firstOrNull { it.esGeneral }
            ?: throw CalculoException("se requiere la cuenta General para absorber el residuo")

        val sumaTasas = tasas.filterNot { it.esGeneral }.sumOf { it.tasaBps }
        if (sumaTasas > 10_000) {
            throw CalculoException("la suma de tasas supera 100% (10.000 bps)")
        }

        val out = mutableListOf<TransaccionCalculada>()
        var sumaOtras = 0L
        for (t in tasas) {
            if (t.esGeneral) continue
            val raw = rawCents(montoCents, t.tasaBps)
            val monto = aplicarModo(raw, modo)
            sumaOtras += monto
            out += TransaccionCalculada(t.cuentaLocalId, t.alias, t.tasaBps, monto)
        }

        val generalMonto = montoCents - sumaOtras
        if (generalMonto < 0) {
            throw CalculoException("las cuotas superan el monto del pago; reduzca las tasas")
        }
        out += TransaccionCalculada(
            cuentaLocalId = general.cuentaLocalId,
            alias = general.alias,
            tasaBps = 0L,
            montoCents = generalMonto,
        )
        return out
    }

    /**
     * Recalcula las transacciones **pendientes** con las tasas vigentes.
     * Las realizadas quedan congeladas (BR-060/061).
     */
    fun recalcular(
        montoCents: Long,
        modo: ModoCalculo,
        txns: List<TransaccionRecalculo>,
        tasasVigentes: Map<String, Long>,
    ): ResultadoRecalculo {
        val indice = mutableMapOf<String, TransaccionCalculada>()
        var frozenSum = 0L
        val pendGeneral = mutableListOf<TransaccionRecalculo>()

        for (t in txns) {
            if (t.realizado) {
                frozenSum += t.montoCents
                continue
            }
            if (t.esGeneral) {
                pendGeneral += t
                continue
            }
            val tasa = tasasVigentes[t.cuentaLocalId]
                ?: throw CalculoException(
                    "la cuenta ${t.alias} no tiene tasa vigente; defina su tasa primero",
                )
            val raw = rawCents(montoCents, tasa)
            val monto = aplicarModo(raw, modo)
            indice[t.id] = TransaccionCalculada(t.cuentaLocalId, t.alias, tasa, monto)
        }

        val remaining = montoCents - frozenSum
        val sumCuotas = indice.values.sumOf { it.montoCents }

        when (pendGeneral.size) {
            0 -> if (sumCuotas != remaining) {
                throw CalculoException(
                    "sin cuenta General pendiente las cuotas no cuadran con el monto del pago",
                )
            }
            1 -> {
                val gral = pendGeneral.first()
                val gralMonto = remaining - sumCuotas
                if (gralMonto < 0) {
                    throw CalculoException(
                        "el monto restante no alcanza para cubrir las cuotas recalculadas",
                    )
                }
                indice[gral.id] = TransaccionCalculada(
                    gral.cuentaLocalId, gral.alias, gral.tasaBps, gralMonto,
                )
            }
            else -> throw CalculoException(
                "hay más de una transacción General pendiente; revise la configuración",
            )
        }

        val suma = indice.values.sumOf { it.montoCents }
        if (suma + frozenSum != montoCents) {
            throw CalculoException("recalculo no cuadra: $suma + $frozenSum != $montoCents")
        }
        return ResultadoRecalculo(indice, suma)
    }

    /** `monto * tasa / 10000` con truncamiento (división entera hacia cero). */
    private fun rawCents(montoCents: Long, tasaBps: Long): Long {
        if (tasaBps < 0 || tasaBps > 10_000) {
            throw CalculoException("tasa fuera de rango: $tasaBps bps")
        }
        return montoCents * tasaBps / 10_000
    }

    /** Aplica el modo de redondeo del split. */
    private fun aplicarModo(raw: Long, modo: ModoCalculo): Long = when (modo) {
        ModoCalculo.REDONDEADO -> ((raw + 50) / 100) * 100
        ModoCalculo.ENTEROS -> (raw / 100) * 100
        ModoCalculo.PRECISO -> raw
    }
}
