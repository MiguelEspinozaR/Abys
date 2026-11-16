/**
 * Carga bajo demanda del histórico agrupado por año (SPEC historial-a11y, R3).
 *
 * Sin endpoint de agregación: se hace una query de conteo (`page_size=1`) por
 * año candidato y se piden páginas de 500 sólo para el año expandido. La
 * acumulación es local y se deduplica por `id`; las keys viven en el espacio
 * `["historial", "pagos", ...]` (no colisionan con `usePagos`).
 */

import { useCallback, useMemo, useState } from "react"
import { useQueries, useQuery } from "@tanstack/react-query"
import {
  clavePagosPagina,
  fetchPagosPagina,
  useHistory,
  type PagosFiltros,
} from "@/services/hooks"
import type { FiltrosUrl } from "@/lib/filtrosUrl"
import {
  aniosDelRango,
  hoyEnLaPaz,
  interseccionConAnio,
  type RangoFechas,
  type RangoPreset,
} from "@/lib/rango"
import type { Pago, PagosMeta } from "@/services/types"

/** Tope efectivo de la API (`page_size` se clampa a 500 en el repositorio). */
export const PAGE_SIZE_HISTORIAL = 500
export const PAGE_SIZE_CONTEO = 1

function filtrosDeAnio(
  anio: number,
  rango: RangoFechas,
  filtros: FiltrosUrl,
  page: number,
  pageSize: number,
): PagosFiltros {
  const fechas = interseccionConAnio(rango, anio)
  return {
    fecha_inicio: fechas.desde,
    fecha_fin: fechas.hasta,
    fuente_id: filtros.fuente,
    metodo_pago: filtros.metodo,
    page,
    page_size: pageSize,
  }
}

/**
 * Años candidatos a secciones.
 *
 * - `anio`: años con pagos en `useHistory()` (global); si no hay, año actual
 *   en America/La_Paz.
 * - Resto de presets: años que toca el rango activo.
 */
export function useCandidatosAnio({
  preset,
  rango,
}: {
  preset: RangoPreset
  rango: RangoFechas
}): { candidatos: number[]; isLoading: boolean } {
  const { data: history, isLoading } = useHistory()

  const candidatos = useMemo(() => {
    if (preset !== "anio") return aniosDelRango(rango.desde, rango.hasta)
    if (isLoading) return []

    const conDatos = new Set(
      (history?.por_mes ?? [])
        .filter((mes) => mes.cantidad_pagos > 0)
        .map((mes) => mes.anio),
    )
    if (conDatos.size === 0) return [Number(hoyEnLaPaz().slice(0, 4))]
    return [...conDatos].sort((a, b) => b - a)
  }, [preset, rango.desde, rango.hasta, history, isLoading])

  return { candidatos, isLoading: preset === "anio" ? isLoading : false }
}

export interface AnioConDatos {
  anio: number
  total: number
}

export interface UseAniosConDatosOptions {
  candidatos: number[]
  rango: RangoFechas
  filtros: FiltrosUrl
}

/**
 * Conteo por año candidato con los filtros activos. Descarta `total=0` y
 * devuelve los años en orden descendente.
 */
export function useAniosConDatos({
  candidatos,
  rango,
  filtros,
}: UseAniosConDatosOptions): {
  anios: AnioConDatos[]
  isLoading: boolean
  isFetching: boolean
} {
  const consultas = useQueries({
    queries: candidatos.map((anio) => {
      const filtrosPago = filtrosDeAnio(anio, rango, filtros, 1, PAGE_SIZE_CONTEO)
      return {
        queryKey: clavePagosPagina(filtrosPago),
        queryFn: () => fetchPagosPagina(filtrosPago),
        staleTime: 30_000,
        select: (res: { data: Pago[]; meta: PagosMeta }) => res.meta.total,
      }
    }),
  })

  const anios = candidatos
    .map((anio, indice) => ({
      anio,
      total: consultas[indice]?.data ?? 0,
      cargada: consultas[indice]?.data !== undefined,
    }))
    .filter(({ cargada, total }) => cargada && total > 0)
    .map(({ anio, total }) => ({ anio, total }))
    .sort((a, b) => b.anio - a.anio)

  return {
    anios,
    isLoading: consultas.some((consulta) => consulta.isLoading),
    isFetching: consultas.some((consulta) => consulta.isFetching),
  }
}

export interface UsePagoCountOptions {
  anio: number
  rango: RangoFechas
  filtros: FiltrosUrl
  enabled?: boolean
}

/** Conteo de pagos de un año (una sola fila: `page_size=1`). */
export function usePagoCount({
  anio,
  rango,
  filtros,
  enabled = true,
}: UsePagoCountOptions): {
  total: number
  meta?: PagosMeta
  isLoading: boolean
  isFetching: boolean
} {
  const filtrosPago = filtrosDeAnio(anio, rango, filtros, 1, PAGE_SIZE_CONTEO)
  const consulta = useQuery({
    queryKey: clavePagosPagina(filtrosPago),
    queryFn: () => fetchPagosPagina(filtrosPago),
    staleTime: 30_000,
    enabled,
    select: (res) => res.meta,
  })

  return {
    total: consulta.data?.total ?? 0,
    meta: consulta.data,
    isLoading: consulta.isLoading,
    isFetching: consulta.isFetching,
  }
}

export interface UsePagosPorAnioOptions {
  anio: number
  rango: RangoFechas
  filtros: FiltrosUrl
  expandido: boolean
}

export interface PagosPorAnioResultado {
  pagos: Pago[]
  total: number
  hayMas: boolean
  cargarMas: () => void
  isLoading: boolean
  isFetching: boolean
}

/**
 * Páginas acumuladas de un año. Solo consulta si `expandido` es true y
 * reinicia a la página 1 cuando cambia el año/rango/filtros.
 */
export function usePagosPorAnio({
  anio,
  rango,
  filtros,
  expandido,
}: UsePagosPorAnioOptions): PagosPorAnioResultado {
  const construirFiltros = (page: number) =>
    filtrosDeAnio(anio, rango, filtros, page, PAGE_SIZE_HISTORIAL)

  // Firma estable de año + rango + filtros (independiente de la página).
  const firma = clavePagosPagina(construirFiltros(1)).join("|")

  // Reset idempotente (también bajo StrictMode) sin efecto: si la firma cambió,
  // esta misma pasada calcula `paginas = 1` antes de construir las queries.
  const [estadoPaginas, setEstadoPaginas] = useState({ firma, paginas: 1 })
  const paginas = estadoPaginas.firma === firma ? estadoPaginas.paginas : 1
  if (estadoPaginas.firma !== firma) {
    setEstadoPaginas({ firma, paginas: 1 })
  }

  const consultas = useQueries({
    queries: Array.from({ length: paginas }, (_, indice) => {
      const filtrosPagina = construirFiltros(indice + 1)
      return {
        queryKey: clavePagosPagina(filtrosPagina),
        queryFn: () => fetchPagosPagina(filtrosPagina),
        staleTime: 30_000,
        enabled: expandido,
      }
    }),
  })

  // Acumula por id preservando el orden página → fila del backend.
  const pagos: Pago[] = []
  const vistos = new Set<number>()
  for (const consulta of consultas) {
    for (const pago of consulta.data?.data ?? []) {
      if (vistos.has(pago.id)) continue
      vistos.add(pago.id)
      pagos.push(pago)
    }
  }

  const meta = consultas[0]?.data?.meta
  const total = meta?.total ?? 0
  const totalPaginas = meta?.total_pages ?? 0
  const hayMas = expandido && totalPaginas > paginas

  const cargarMas = useCallback(() => {
    setEstadoPaginas((actual) => {
      if (actual.firma !== firma) return { firma, paginas: 1 }
      const limite = totalPaginas > 0 ? totalPaginas : actual.paginas + 1
      return { firma, paginas: Math.min(actual.paginas + 1, limite) }
    })
  }, [firma, totalPaginas])

  return {
    pagos,
    total,
    hayMas,
    cargarMas,
    // Sólo la primera página define el skeleton; al paginar se conservan las
    // filas ya cargadas y el botón muestra su propio estado.
    isLoading: consultas[0]?.isLoading ?? false,
    isFetching: consultas.some((consulta) => consulta.isFetching),
  }
}
