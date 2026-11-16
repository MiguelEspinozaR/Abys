/**
 * Filtros del histórico respaldados por la URL.
 *
 * - Lo **aplicado** sale de `useSearchParams` (sanitizado).
 * - Los inputs trabajan sobre un **borrador** local; `aplicar()` hace `push`.
 * - La canonización de la URL (params inválidos/ausentes) y la fase 2 de
 *   `fuente` usan `replace`, comparando contra el serializado canónico para
 *   evitar bucles.
 * - El borrador se resincroniza cuando cambia la URL (atrás/adelante/recarga).
 */

import { useCallback, useEffect, useMemo, useState, type SetStateAction } from "react"
import { useSearchParams } from "react-router-dom"
import {
  leerFiltros,
  serializarFiltros,
  validarFiltros,
  type ErroresFiltros,
  type FiltrosUrl,
} from "@/lib/filtrosUrl"
import { calcularRango, type RangoFechas } from "@/lib/rango"

export interface UseFiltrosHistorialResultado {
  /** Filtros aplicados, derivados de la URL (siempre sanitizados). */
  filtros: FiltrosUrl
  /** Borrador editable por la barra de filtros. */
  borrador: FiltrosUrl
  setBorrador: (accion: SetStateAction<FiltrosUrl>) => void
  /** Rango de fechas efectivo para el preset aplicado. */
  rangoCalculado: RangoFechas
  /** Aplica el borrador con `push`; devuelve errores inline (vacío = OK). */
  aplicar: () => ErroresFiltros
  /** Vuelve a `rango=ytd` sin filtros con `push`. */
  limpiar: () => void
  errores: ErroresFiltros
  hayFiltros: boolean
}

export function useFiltrosHistorial(opciones: {
  fuentesValidas?: ReadonlySet<number>
} = {}): UseFiltrosHistorialResultado {
  const { fuentesValidas } = opciones
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.toString()

  const filtros = useMemo(
    () => leerFiltros(search, { fuentesValidas }),
    [search, fuentesValidas],
  )
  const canonico = useMemo(() => serializarFiltros(filtros), [filtros])

  const [borrador, setBorradorEstado] = useState<FiltrosUrl>(filtros)
  const [errores, setErrores] = useState<ErroresFiltros>({})

  const setBorrador = useCallback((accion: SetStateAction<FiltrosUrl>) => {
    setErrores({})
    setBorradorEstado(accion)
  }, [])

  // Canonización: URL inválida/ausente o `fuente` inexistente (fase 2).
  useEffect(() => {
    if (search !== canonico) {
      setSearchParams(new URLSearchParams(canonico), { replace: true })
    }
  }, [search, canonico, setSearchParams])

  // Resincroniza el borrador cuando la URL cambia (atrás/adelante/recarga o
  // canonización). Se depende solo de `search` para no pisar lo que el usuario
  // está escribiendo cuando `/fuentes` resuelve y cambia la identidad de
  // `filtros` sin cambiar la URL.
  useEffect(() => {
    setBorrador(filtros)
    setErrores({})
  }, [search, setBorrador]) // eslint-disable-line react-hooks/exhaustive-deps

  const aplicar = useCallback((): ErroresFiltros => {
    const validacion = validarFiltros(borrador)
    setErrores(validacion)
    if (Object.keys(validacion).length > 0) return validacion

    setSearchParams(new URLSearchParams(serializarFiltros(borrador)), { replace: false })
    return {}
  }, [borrador, setSearchParams])

  const limpiar = useCallback(() => {
    const limpio: FiltrosUrl = { rango: "ytd" }
    setBorrador(limpio)
    setErrores({})

    const limpioCanonico = serializarFiltros(limpio)
    if (search !== limpioCanonico) {
      setSearchParams(new URLSearchParams(limpioCanonico), { replace: false })
    }
  }, [search, setSearchParams])

  const rangoCalculado = calcularRango(filtros.rango, new Date(), {
    desde: filtros.desde,
    hasta: filtros.hasta,
  })

  const hayFiltros =
    filtros.rango !== "ytd" || filtros.fuente !== undefined || filtros.metodo !== undefined

  return {
    filtros,
    borrador,
    setBorrador,
    rangoCalculado,
    aplicar,
    limpiar,
    errores,
    hayFiltros,
  }
}
