package com.mikylab.abys.core.time

import java.time.Instant
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

/** Zona horaria del proyecto (BR / reglas de negocio): `America/La_Paz` (UTC−4). */
object LaPaz {
    val zone: ZoneId = ZoneId.of("America/La_Paz")

    /** "Hoy" en La Paz (no en la zona del dispositivo). */
    fun hoy(): LocalDate = LocalDate.now(zone)
}

/**
 * Formatos de fecha equivalentes a `Abys/web/src/lib/format.ts`.
 *
 * IMPORTANTE: las fechas de negocio son `DATE` sin hora; se parsean **sin shift de zona**
 * (el web usa `new Date(y, m-1, d)` local).
 */
object DateFormats {

    private val locale: Locale = Locale.forLanguageTag("es-BO")

    private val corta: DateTimeFormatter =
        DateTimeFormatter.ofPattern("EEE d MMM yyyy", locale)

    private val diaSemana: DateTimeFormatter =
        DateTimeFormatter.ofPattern("EEEE", locale)

    private val mesLargo: DateTimeFormatter =
        DateTimeFormatter.ofPattern("MMMM yyyy", locale)

    /** `formatearFechaEs("2026-08-27")` → `"jue 27 ago 2026"`. */
    fun fechaCorta(iso: String): String = parseIso(iso)?.format(corta) ?: iso

    /** `formatearFechaEs` sobre un [LocalDate]. */
    fun fechaCorta(fecha: LocalDate): String = fecha.format(corta)

    /** `diaSemanaEs("2026-08-27")` → `"jueves"` (minúsculas). */
    fun diaSemana(iso: String): String =
        parseIso(iso)?.format(diaSemana)?.lowercase(locale) ?: iso

    fun diaSemana(fecha: LocalDate): String =
        fecha.format(diaSemana).lowercase(locale)

    /** `"agosto 2026"` — usado en los títulos del dashboard. */
    fun mesAnio(fecha: LocalDate): String = fecha.format(mesLargo)

    /** `toISODate` — `LocalDate` → `"YYYY-MM-DD"`. */
    fun toIso(fecha: LocalDate): String = fecha.toString()

    /** `fromISODate` — `"YYYY-MM-DD"` → [LocalDate] (sin shift de zona). */
    fun parseIso(iso: String): LocalDate? = runCatching { LocalDate.parse(iso) }.getOrNull()

    /**
     * Parsea un timestamp RFC3339 del backend (p. ej. `2026-07-02T02:17:05.00713-04:00`).
     * El backend no fija la zona de la sesión de Postgres, así que se parsea de forma tolerante.
     */
    fun parseInstant(raw: String?): Instant? {
        if (raw.isNullOrBlank()) return null
        return runCatching { OffsetDateTime.parse(raw).toInstant() }
            .recoverCatching { Instant.parse(raw) }
            .recoverCatching { LocalDateTimeCompat.parse(raw) }
            .getOrNull()
    }

    /** Timestamp legible en La Paz: `"30 jul 2026, 09:49"`. */
    fun instanteLegible(raw: String?): String {
        val instant = parseInstant(raw) ?: return "—"
        return DateTimeFormatter
            .ofPattern("d MMM yyyy, HH:mm", locale)
            .withZone(LaPaz.zone)
            .format(instant)
    }

    /** Hora local (La Paz) de un instante: `"09:49:26"`. */
    fun horaLocal(epochMillis: Long): String =
        DateTimeFormatter.ofPattern("HH:mm:ss", locale)
            .withZone(LaPaz.zone)
            .format(Instant.ofEpochMilli(epochMillis))

    /** `hoy` en La Paz como ISO. */
    fun hoyIso(): String = LaPaz.hoy().toString()
}

/** Compatibilidad para timestamps sin offset (formato local ISO). */
private object LocalDateTimeCompat {
    fun parse(raw: String): Instant =
        java.time.LocalDateTime.parse(raw).atZone(ZoneOffset.UTC).toInstant()
}

/** Nombre corto del mes ("ene", "feb", …) para los ejes de los gráficos. */
val mesesAbrev: List<String> = listOf(
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
)

/** Nombre del mes localizado ("agosto") para títulos. */
fun mesEnEspanol(mes: Int): String =
    java.time.Month.of(mes.coerceIn(1, 12)).getDisplayName(TextStyle.FULL, Locale.forLanguageTag("es-BO"))
        .lowercase(Locale.forLanguageTag("es-BO"))
