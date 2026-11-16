/**
 * Agrupación pura del histórico por año (SPEC historial-a11y, R3/D7).
 *
 * No depende de React ni del DOM. Reglas:
 * - Años en orden descendente.
 * - Fechas inválidas se omiten (no crean grupos).
 * - Se conserva el orden de filas del backend dentro de cada año.
 */

import { esFechaISOValida } from "./validators"

export interface GrupoAnio<T> {
  anio: number
  filas: T[]
}

/** Año (`YYYY`) de una fecha-sola válida; `null` si la fecha no existe. */
export function anioDeFecha(fecha: string | null | undefined): number | null {
  if (!fecha || !esFechaISOValida(fecha)) return null
  return Number(fecha.slice(0, 4))
}

/**
 * Agrupa filas por el año de `obtenerFecha(fila)`, de más reciente a más antiguo.
 * Las filas con fecha inválida se omiten y el orden relativo dentro de cada año
 * se preserva tal como llegó.
 */
export function agruparPorAnio<T>(
  filas: readonly T[],
  obtenerFecha: (fila: T) => string,
): GrupoAnio<T>[] {
  const porAnio = new Map<number, T[]>()

  for (const fila of filas) {
    const anio = anioDeFecha(obtenerFecha(fila))
    if (anio === null) continue

    const existentes = porAnio.get(anio)
    if (existentes) existentes.push(fila)
    else porAnio.set(anio, [fila])
  }

  return [...porAnio.entries()]
    .sort(([a], [b]) => b - a)
    .map(([anio, filasDelAnio]) => ({ anio, filas: filasDelAnio }))
}

/**
 * Cuenta filas por año (desc), omitiendo fechas inválidas. Útil para totales de
 * cabecera cuando las filas ya están en memoria.
 */
export function contarPorAnio<T>(
  filas: readonly T[],
  obtenerFecha: (fila: T) => string,
): Map<number, number> {
  const conteos = new Map<number, number>()

  for (const fila of filas) {
    const anio = anioDeFecha(obtenerFecha(fila))
    if (anio === null) continue
    conteos.set(anio, (conteos.get(anio) ?? 0) + 1)
  }

  return new Map([...conteos.entries()].sort(([a], [b]) => b - a))
}

/**
 * Páginas necesarias para cubrir `total` filas con `pageSize` por página.
 * Entradas no positivas o inválidas devuelven 0.
 */
export function paginasNecesarias(total: number, pageSize: number): number {
  if (!Number.isFinite(total) || !Number.isFinite(pageSize)) return 0
  if (total <= 0 || pageSize <= 0) return 0
  return Math.ceil(total / pageSize)
}
