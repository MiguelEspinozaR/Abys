/**
 * Totales por fuente y día para los puntos del calendario de /registrar (R2/D2/D3).
 *
 * Módulo puro: no lee React, DOM ni storage. `RegistrarPage` alimenta el mapa con
 * `pagosGuardados[].dias_trabajados[]` y la lista de fuentes; `CalendarioDias`
 * solo consume el resultado ya calculado.
 *
 * Los colores de BD se entregan como hex validado y se pintan con `style` en el
 * componente. Tailwind v4 no compila nombres de clase construidos en runtime: el
 * fallback es una clase estática (`BG_FUENTE_FALLBACK`), nunca `bg-${color}`.
 */

import type { Fuente, Pago } from "@/services/types"

/** Entrada del mapa por día y fuente. */
export interface FuenteDelDia {
  alias: string
  color: string
  total_centavos: number
}

/** Mapa `fecha ISO -> fuente_id -> total del día para esa fuente`. */
export type FuentesPorDia = Map<string, Map<number, FuenteDelDia>>

/** Clase Tailwind estática para color inválido/ausente (nunca dinámica). */
export const BG_FUENTE_FALLBACK = "bg-gray-400"

/**
 * Centinela no-hex guardado en `FuenteDelDia.color`: el render distingue con
 * `esColorHex` entre este valor (clase estática) y un hex de BD (inline style).
 */
export const COLOR_FUENTE_FALLBACK = BG_FUENTE_FALLBACK

const HEX = /^#[0-9a-f]{6}$/i

/** true solo para `#RRGGBB`; evita inyectar valores arbitrarios de BD en `style`. */
export function esColorHex(color: unknown): color is string {
  return typeof color === "string" && HEX.test(color.trim())
}

function resolverColor(pago: Pago, fuente: Fuente | undefined): string {
  // Precedencia: snapshot histórico del pago, color actual de la fuente, gris.
  for (const candidato of [pago.fuente_color, fuente?.color]) {
    if (esColorHex(candidato)) return candidato.trim()
  }
  return COLOR_FUENTE_FALLBACK
}

function resolverAlias(pago: Pago, fuente: Fuente | undefined): string {
  if (fuente?.alias.trim()) return fuente.alias.trim()
  if (typeof pago.fuente_alias === "string" && pago.fuente_alias.trim()) {
    return pago.fuente_alias.trim()
  }
  return `Fuente ${pago.fuente_id}`
}

/**
 * Suma `dias_trabajados[].monto_enteros` agrupando por `fecha` y `fuente_id`.
 * Si una fuente aparece en varios pagos del mismo día se acumula el total; el
 * alias/color se toman de la primera aparición (el orden de `pagos` no importa
 * para el importe).
 */
export function construirFuentesPorDia(
  pagos: Pago[],
  fuentes: Fuente[],
): FuentesPorDia {
  const porId = new Map<number, Fuente>(fuentes.map((f) => [f.id, f]))
  const resultado: FuentesPorDia = new Map()

  for (const pago of pagos) {
    const fuente = porId.get(pago.fuente_id)
    const alias = resolverAlias(pago, fuente)
    const color = resolverColor(pago, fuente)

    for (const dia of pago.dias_trabajados ?? []) {
      if (!dia?.fecha) continue
      let porFuente = resultado.get(dia.fecha)
      if (!porFuente) {
        porFuente = new Map()
        resultado.set(dia.fecha, porFuente)
      }
      const monto = Number.isFinite(dia.monto_enteros) ? dia.monto_enteros : 0
      const actual = porFuente.get(pago.fuente_id)
      if (actual) actual.total_centavos += monto
      else porFuente.set(pago.fuente_id, { alias, color, total_centavos: monto })
    }
  }

  return resultado
}

/** Fuente de un día con su id, para claves de React y desempate. */
export type FuenteDelDiaTop = FuenteDelDia & { fuente_id: number }

/**
 * Hasta 3 fuentes del día: mayor `total_centavos` primero, desempate por
 * `fuente_id` ascendente (D2).
 */
export function top3Fuentes(
  map: FuentesPorDia | undefined,
  fecha: string,
): FuenteDelDiaTop[] {
  const porFuente = map?.get(fecha)
  if (!porFuente) return []
  return [...porFuente.entries()]
    .map(([fuente_id, fuente]) => ({ fuente_id, ...fuente }))
    .sort(
      (a, b) =>
        b.total_centavos - a.total_centavos || a.fuente_id - b.fuente_id,
    )
    .slice(0, 3)
}

/** Fuente de la leyenda: única por id, derivada de todo el mapa (R2.5). */
export interface FuenteLeyenda {
  fuente_id: number
  alias: string
  color: string
}

/** Todas las fuentes presentes en el mapa, ordenadas por id (para la leyenda). */
export function fuentesParaLeyenda(
  map: FuentesPorDia | undefined,
): FuenteLeyenda[] {
  const porId = new Map<number, FuenteLeyenda>()
  for (const porFuente of map?.values() ?? []) {
    for (const [fuente_id, { alias, color }] of porFuente) {
      if (!porId.has(fuente_id)) {
        porId.set(fuente_id, { fuente_id, alias, color })
      }
    }
  }
  return [...porId.values()].sort((a, b) => a.fuente_id - b.fuente_id)
}
