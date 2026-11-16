/**
 * Histórico agrupado por año con expansión local (SPEC historial-a11y, R3/D7).
 *
 * Solo el año actual queda expandido por defecto si tiene datos. Al cambiar la
 * firma de filtros/rango se resetea la expansión a ese mismo criterio. La
 * expansión no se escribe en la URL.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import type { AnioConDatos } from "@/hooks/useHistorial"
import { serializarFiltros, type FiltrosUrl } from "@/lib/filtrosUrl"
import { hoyEnLaPaz, type RangoFechas } from "@/lib/rango"
import type { Pago } from "@/services/types"
import { SeccionAnio } from "./SeccionAnio"

export interface HistorialAgrupadoProps {
  /** Prefijo único para ids (`ingresos`/`splits`). */
  idPrefijo: string
  /** Años con datos (desc) y su total, calculado por `useAniosConDatos`. */
  anios: AnioConDatos[]
  rango: RangoFechas
  filtros: FiltrosUrl
  renderFila: (pago: Pago) => ReactNode
  /** Filtra las filas visibles dentro de cada año (p. ej. pagos con split). */
  filtrarFilas?: (pagos: Pago[]) => Pago[]
  mensajeVacio?: (anio: number) => string
}

export function HistorialAgrupado({
  idPrefijo,
  anios,
  rango,
  filtros,
  renderFila,
  filtrarFilas,
  mensajeVacio,
}: HistorialAgrupadoProps) {
  const anioActual = Number(hoyEnLaPaz().slice(0, 4))

  const firma = useMemo(() => {
    const base = serializarFiltros(filtros)
    return `${base}|${rango.desde ?? ""}|${rango.hasta ?? ""}`
  }, [filtros, rango.desde, rango.hasta])

  const aniosKey = anios.map(({ anio }) => anio).join(",")
  const [expandidos, setExpandidos] = useState<Set<number>>(() => new Set())
  const firmaRef = useRef<string | null>(null)
  const inicializadoRef = useRef(false)

  useEffect(() => {
    const filtrosCambiaron = firmaRef.current !== firma
    if (!filtrosCambiaron && (inicializadoRef.current || anios.length === 0)) return

    firmaRef.current = firma
    const tieneActual = anios.some(({ anio }) => anio === anioActual)
    setExpandidos(new Set(tieneActual ? [anioActual] : []))
    inicializadoRef.current = anios.length > 0
  }, [firma, aniosKey, anioActual]) // aniosKey resume la lista; anios sólo se lee

  const alternar = (anio: number) => {
    setExpandidos((previo) => {
      const siguiente = new Set(previo)
      if (siguiente.has(anio)) siguiente.delete(anio)
      else siguiente.add(anio)
      return siguiente
    })
  }

  return (
    <div className="space-y-6">
      {anios.map(({ anio }) => (
        <SeccionAnio
          key={anio}
          idPrefijo={idPrefijo}
          anio={anio}
          rango={rango}
          filtros={filtros}
          expandido={expandidos.has(anio)}
          onToggle={() => alternar(anio)}
          renderFila={renderFila}
          filtrarFilas={filtrarFilas}
          mensajeVacio={mensajeVacio?.(anio)}
        />
      ))}
    </div>
  )
}
