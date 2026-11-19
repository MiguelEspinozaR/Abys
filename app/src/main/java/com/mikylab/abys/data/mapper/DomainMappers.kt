package com.mikylab.abys.data.mapper

import com.mikylab.abys.core.money.Money
import com.mikylab.abys.core.money.Percent
import com.mikylab.abys.core.time.DateFormats
import com.mikylab.abys.data.local.entity.CuentaEntity
import com.mikylab.abys.data.local.entity.DiaTrabajadoEntity
import com.mikylab.abys.data.local.entity.FuenteEntity
import com.mikylab.abys.data.local.entity.HistorialTasaEntity
import com.mikylab.abys.data.local.entity.PagoEntity
import com.mikylab.abys.data.local.entity.SplitEntity
import com.mikylab.abys.data.local.entity.TransaccionEntity
import com.mikylab.abys.domain.model.Cuenta
import com.mikylab.abys.domain.model.DiaTrabajado
import com.mikylab.abys.domain.model.Fuente
import com.mikylab.abys.domain.model.HistorialTasa
import com.mikylab.abys.domain.model.MetodoPago
import com.mikylab.abys.domain.model.ModoCalculo
import com.mikylab.abys.domain.model.Pago
import com.mikylab.abys.domain.model.Split
import com.mikylab.abys.domain.model.Transaccion
import java.time.Instant

/** Mapeos entidad Room → modelo de dominio. */
object DomainMappers {

    fun FuenteEntity.toDomain(): Fuente = Fuente(
        localId = localId,
        serverId = serverId,
        alias = alias,
        color = color,
        logoRuta = logoRuta,
        splitAuto = splitAuto,
        splitAutoModo = splitAutoModo?.let { ModoCalculo.fromWire(it) },
        syncState = syncState,
        lastError = lastError,
    )

    fun DiaTrabajadoEntity.toDomain(): DiaTrabajado = DiaTrabajado(
        localId = localId,
        serverId = serverId,
        fecha = DateFormats.parseIso(fecha) ?: java.time.LocalDate.now(),
        monto = Money(montoEnteros),
    )

    fun PagoEntity.toDomain(
        fuente: FuenteEntity?,
        dias: List<DiaTrabajadoEntity>,
        split: SplitEntity?,
    ): Pago = Pago(
        localId = localId,
        serverId = serverId,
        fuente = fuente?.toDomain()
            ?: Fuente(localId, null, "—", "#888888", null, false, null),
        fechaPago = DateFormats.parseIso(fechaPago) ?: java.time.LocalDate.now(),
        monto = Money(montoEnteros),
        metodoPago = MetodoPago.fromWire(metodoPago),
        notas = notas,
        imagenRuta = imagenRuta,
        diasTrabajados = dias.map { it.toDomain() }.sortedBy { it.fecha },
        splitId = split?.serverId,
        splitModo = split?.modoCalculo?.let { ModoCalculo.fromWire(it) },
        tieneSplit = split != null,
        syncState = syncState,
        lastError = lastError,
    )

    fun CuentaEntity.toDomain(): Cuenta = Cuenta(
        localId = localId,
        serverId = serverId,
        alias = alias,
        numero = numero,
        banco = banco,
        qrRuta = qrRuta,
        esGeneral = esGeneral,
        tasa = Percent(tasaBps),
        syncState = syncState,
        lastError = lastError,
    )

    fun HistorialTasaEntity.toDomain(): HistorialTasa = HistorialTasa(
        localId = localId,
        serverId = serverId,
        cuentaLocalId = cuentaLocalId,
        tasa = Percent(tasaBps),
        aplicadaDesde = aplicadaDesde.let { Instant.ofEpochMilli(it) },
    )

    fun TransaccionEntity.toDomain(): Transaccion = Transaccion(
        localId = localId,
        serverId = serverId,
        splitLocalId = splitLocalId,
        cuentaLocalId = cuentaLocalId,
        monto = Money(montoEnteros),
        tasa = Percent(tasaBps),
        aliasSnapshot = aliasSnapshot,
        realizado = realizado,
        fechaRealizacion = fechaRealizacion?.let { Instant.ofEpochMilli(it) },
        syncState = syncState,
    )

    fun SplitEntity.toDomain(transacciones: List<TransaccionEntity>): Split = Split(
        localId = localId,
        serverId = serverId,
        pagoLocalId = pagoLocalId,
        modoCalculo = ModoCalculo.fromWire(modoCalculo),
        transacciones = transacciones.map { it.toDomain() },
        totalPendiente = Money(totalPendiente),
        totalRealizado = Money(totalRealizado),
        syncState = syncState,
    )
}
