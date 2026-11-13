package com.mikylab.abys.data.remote.mapper

import com.mikylab.abys.core.time.DateFormats
import com.mikylab.abys.data.local.entity.CuentaEntity
import com.mikylab.abys.data.local.entity.DiaTrabajadoEntity
import com.mikylab.abys.data.local.entity.FuenteEntity
import com.mikylab.abys.data.local.entity.HistorialTasaEntity
import com.mikylab.abys.data.local.entity.PagoEntity
import com.mikylab.abys.data.local.entity.SplitEntity
import com.mikylab.abys.data.local.entity.TransaccionEntity
import com.mikylab.abys.data.remote.dto.CuentaDto
import com.mikylab.abys.data.remote.dto.DiaTrabajadoDto
import com.mikylab.abys.data.remote.dto.FuenteDto
import com.mikylab.abys.data.remote.dto.HistorialTasaDto
import com.mikylab.abys.data.remote.dto.PagoDto
import com.mikylab.abys.data.remote.dto.SplitDto
import com.mikylab.abys.data.remote.dto.TransaccionDto
import com.mikylab.abys.domain.model.SyncState

/**
 * Mapeos DTO → entidad Room.
 *
 * `localId` de las entidades que vienen del servidor es **determinista** (`srv-<id>`),
 * de modo que un pull repetido sobrescribe la misma fila (idempotencia).
 */
object RemoteMappers {

    fun serverLocalId(serverId: Long): String = "srv-$serverId"

    fun FuenteDto.toEntity(): FuenteEntity {
        val now = System.currentTimeMillis()
        return FuenteEntity(
            localId = serverLocalId(id),
            serverId = id,
            alias = alias,
            color = color.ifBlank { "#3b82f6" },
            logoRuta = logoRuta,
            splitAuto = splitAuto,
            splitAutoModo = splitAutoModo,
            createdAt = DateFormats.parseInstant(createdAt)?.toEpochMilli() ?: now,
            updatedAt = DateFormats.parseInstant(updatedAt)?.toEpochMilli() ?: now,
            deletedAt = null,
            syncState = SyncState.SYNCED,
            updatedAtLocal = now,
            updatedAtServer = DateFormats.parseInstant(updatedAt)?.toEpochMilli(),
            lastError = null,
        )
    }

    fun PagoDto.toEntity(fuenteLocalId: String): PagoEntity {
        val now = System.currentTimeMillis()
        return PagoEntity(
            localId = serverLocalId(id),
            serverId = id,
            fuenteLocalId = fuenteLocalId,
            fechaPago = fechaPago,
            montoEnteros = montoEnteros,
            metodoPago = metodoPago,
            notas = notas,
            imagenRuta = imagenRuta,
            createdAt = DateFormats.parseInstant(createdAt)?.toEpochMilli() ?: now,
            updatedAt = DateFormats.parseInstant(updatedAt)?.toEpochMilli() ?: now,
            deletedAt = null,
            syncState = SyncState.SYNCED,
            updatedAtLocal = now,
            updatedAtServer = DateFormats.parseInstant(updatedAt)?.toEpochMilli(),
            lastError = null,
        )
    }

    fun DiaTrabajadoDto.toEntity(pagoLocalId: String): DiaTrabajadoEntity =
        DiaTrabajadoEntity(
            localId = serverLocalId(id),
            serverId = id,
            pagoLocalId = pagoLocalId,
            fecha = fecha,
            syncState = SyncState.SYNCED,
            updatedAtLocal = System.currentTimeMillis(),
        )

    fun CuentaDto.toEntity(): CuentaEntity {
        val now = System.currentTimeMillis()
        return CuentaEntity(
            localId = serverLocalId(id),
            serverId = id,
            alias = alias,
            numero = numero,
            banco = banco,
            qrRuta = qrRuta,
            esGeneral = esGeneral,
            tasaBps = tasaBps,
            createdAt = DateFormats.parseInstant(createdAt)?.toEpochMilli() ?: now,
            updatedAt = DateFormats.parseInstant(updatedAt)?.toEpochMilli() ?: now,
            deletedAt = null,
            syncState = SyncState.SYNCED,
            updatedAtLocal = now,
            updatedAtServer = DateFormats.parseInstant(updatedAt)?.toEpochMilli(),
            lastError = null,
        )
    }

    fun HistorialTasaDto.toEntity(cuentaLocalId: String): HistorialTasaEntity =
        HistorialTasaEntity(
            localId = serverLocalId(id),
            serverId = id,
            cuentaLocalId = cuentaLocalId,
            tasaBps = tasaBps,
            aplicadaDesde = DateFormats.parseInstant(aplicadaDesde)?.toEpochMilli()
                ?: System.currentTimeMillis(),
            createdAt = DateFormats.parseInstant(createdAt)?.toEpochMilli()
                ?: System.currentTimeMillis(),
            syncState = SyncState.SYNCED,
            updatedAtLocal = System.currentTimeMillis(),
        )

    fun SplitDto.toEntity(pagoLocalId: String): SplitEntity {
        val now = System.currentTimeMillis()
        return SplitEntity(
            localId = serverLocalId(id),
            serverId = id,
            pagoLocalId = pagoLocalId,
            modoCalculo = modoCalculo,
            totalPendiente = totalPendiente,
            totalRealizado = totalRealizado,
            createdAt = DateFormats.parseInstant(createdAt)?.toEpochMilli() ?: now,
            updatedAt = DateFormats.parseInstant(updatedAt)?.toEpochMilli() ?: now,
            syncState = SyncState.SYNCED,
            updatedAtLocal = now,
            updatedAtServer = DateFormats.parseInstant(updatedAt)?.toEpochMilli(),
            lastError = null,
        )
    }

    fun TransaccionDto.toEntity(splitLocalId: String, cuentaLocalId: String?): TransaccionEntity {
        val now = System.currentTimeMillis()
        return TransaccionEntity(
            localId = serverLocalId(id),
            serverId = id,
            splitLocalId = splitLocalId,
            cuentaLocalId = cuentaLocalId,
            montoEnteros = montoEnteros,
            tasaBps = tasaBps,
            aliasSnapshot = aliasSnapshot,
            realizado = realizado,
            fechaRealizacion = DateFormats.parseInstant(fechaRealizacion)?.toEpochMilli(),
            createdAt = DateFormats.parseInstant(createdAt)?.toEpochMilli() ?: now,
            updatedAt = DateFormats.parseInstant(updatedAt)?.toEpochMilli() ?: now,
            syncState = SyncState.SYNCED,
            updatedAtLocal = now,
            lastError = null,
        )
    }
}
