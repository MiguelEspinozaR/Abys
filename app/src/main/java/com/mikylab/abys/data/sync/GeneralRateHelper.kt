package com.mikylab.abys.data.sync

import com.mikylab.abys.data.local.dao.CuentaDao
import com.mikylab.abys.data.local.entity.CuentaEntity
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Cálculo de la tasa **derivada** de la cuenta General (BR-040):
 * `tasaGeneral = 10000 − Σ(tasas vigentes de las cuentas ≠ General)`.
 *
 * El backend hace lo mismo en `TasaService.CalcularTasaGeneral`; aquí se mantiene la copia local
 * consistente para que la UI muestre el mismo valor sin red.
 */
@Singleton
class GeneralRateHelper @Inject constructor(
    private val cuentaDao: CuentaDao,
) {

    /** Recalcula y persiste la tasa de la cuenta General. Devuelve la tasa en bps. */
    suspend fun recalcular(): Long {
        val cuentas = cuentaDao.getAll().filter { it.deletedAt == null }
        val general = cuentas.filter { it.esGeneral }.minByOrNull { it.serverId ?: Long.MAX_VALUE }
            ?: return 0L
        val sumaOtras = cuentas.filterNot { it.esGeneral }.sumOf { it.tasaBps }
        val tasaGeneral = (10_000L - sumaOtras).coerceAtLeast(0L)
        if (general.tasaBps != tasaGeneral) {
            cuentaDao.upsert(general.copy(tasaBps = tasaGeneral))
        }
        return tasaGeneral
    }

    /** Suma de tasas de las cuentas distintas de General (para validar Σ ≤ 100 %). */
    suspend fun sumaTasasNoGeneral(): Long =
        cuentaDao.getAll()
            .filter { it.deletedAt == null && !it.esGeneral }
            .sumOf { it.tasaBps }

    /** Busca la cuenta General activa. */
    suspend fun general(): CuentaEntity? = cuentaDao.getGeneral()
}
