/**
 * Presets de rango de fechas para el histórico.
 *
 * Todas las cuentas se hacen en `America/La_Paz` (UTC-4, sin horario de verano)
 * y las fechas viajan como `YYYY-MM-DD`. La aritmética de días se hace sobre
 * fechas-sola en UTC para evitar shifts de la zona horaria del navegador.
 *
 * Módulo puro: no depende de React ni del DOM (SPEC historial-a11y, R2).
 */

export type RangoPreset = "ytd" | "365" | "anio" | "custom"

export interface RangoFechas {
  desde?: string
  hasta?: string
}

const formateadorLaPaz = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/La_Paz",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

function parte(partes: Intl.DateTimeFormatPart[], tipo: Intl.DateTimeFormatPartTypes): string {
  return partes.find((p) => p.type === tipo)?.value ?? ""
}

/** Fecha de “hoy” (`YYYY-MM-DD`) en la zona `America/La_Paz`. */
export function hoyEnLaPaz(ahora: Date = new Date()): string {
  const partes = formateadorLaPaz.formatToParts(ahora)
  return `${parte(partes, "year")}-${parte(partes, "month")}-${parte(partes, "day")}`
}

/** Suma (o resta, con días negativos) días a una fecha `YYYY-MM-DD`. */
export function sumarDiasISO(fecha: string, dias: number): string {
  const [anio, mes, dia] = fecha.split("-").map(Number)
  if (!Number.isFinite(anio) || !Number.isFinite(mes) || !Number.isFinite(dia)) {
    return fecha
  }
  const dt = new Date(Date.UTC(anio, mes - 1, dia + dias))
  const y = dt.getUTCFullYear()
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0")
  const d = String(dt.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/**
 * Rango de fechas efectivo para un preset.
 *
 * - `ytd`: 1 de enero del año actual → hoy.
 * - `365`: hoy − 365 días → hoy.
 * - `anio`: sin límites (todo el histórico).
 * - `custom`: las fechas ya sanitizadas (solo se incluyen las presentes).
 */
export function calcularRango(
  preset: RangoPreset,
  ahora: Date = new Date(),
  custom?: RangoFechas,
): RangoFechas {
  switch (preset) {
    case "ytd": {
      const hoy = hoyEnLaPaz(ahora)
      return { desde: `${hoy.slice(0, 4)}-01-01`, hasta: hoy }
    }
    case "365": {
      const hoy = hoyEnLaPaz(ahora)
      return { desde: sumarDiasISO(hoy, -365), hasta: hoy }
    }
    case "anio":
      return {}
    case "custom": {
      const rango: RangoFechas = {}
      if (custom?.desde) rango.desde = custom.desde
      if (custom?.hasta) rango.hasta = custom.hasta
      return rango
    }
  }
}

/** Recorta un rango a los bordes de un año (intersección). */
export function interseccionConAnio(rango: RangoFechas, anio: number): Required<RangoFechas> {
  const inicio = `${anio}-01-01`
  const fin = `${anio}-12-31`
  return {
    desde: rango.desde && rango.desde > inicio ? rango.desde : inicio,
    hasta: rango.hasta && rango.hasta < fin ? rango.hasta : fin,
  }
}

/**
 * Años candidatos que toca un rango, en orden descendente.
 * Un rango parcial (solo `desde` o solo `hasta`) devuelve el año de ese borde.
 */
export function aniosDelRango(desde?: string, hasta?: string): number[] {
  const anioDe = (fecha?: string): number | undefined => {
    const anio = fecha ? Number(fecha.slice(0, 4)) : undefined
    return anio !== undefined && Number.isFinite(anio) ? anio : undefined
  }

  const desdeAnio = anioDe(desde) ?? anioDe(hasta)
  const hastaAnio = anioDe(hasta) ?? anioDe(desde)
  if (desdeAnio === undefined || hastaAnio === undefined) return []

  const anios: number[] = []
  for (let anio = hastaAnio; anio >= desdeAnio; anio--) anios.push(anio)
  return anios
}
