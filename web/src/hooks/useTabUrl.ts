/**
 * Tab de `/configuracion` controlado por `?tab=` (SPEC historial-a11y, R1.6).
 *
 * Default `cuentas`; valores inválidos se canonizan con `replace` al montar.
 * Cambiar de tab hace `push` para que atrás/adelante funcionen.
 */

import { useCallback, useEffect, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import {
  leerTab,
  serializarTab,
  type TabConfiguracion,
} from "@/lib/filtrosUrl"

export interface UseTabUrlResultado {
  tab: TabConfiguracion
  setTab: (tab: string) => void
}

export function useTabUrl(): UseTabUrlResultado {
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.toString()
  const tab = leerTab(search)
  const canonico = serializarTab(tab)
  // Deduplica solicitudes repetidas del mismo tab (p.ej. onValueChange doble en
  // el mismo gesto de Radix Tabs) antes de que React aplique el primer push, para
  // evitar apilar dos entradas idénticas en el historial.
  const ultimoSolicitadoRef = useRef<TabConfiguracion>(tab)

  useEffect(() => {
    ultimoSolicitadoRef.current = tab
  }, [tab])

  useEffect(() => {
    // Canoniza solo formas inválidas/ausentes; evita replace sobre URLs ya válidas
    // (p.ej. durante back/forward o justo tras un push de cambio de tab).
    if (search !== canonico) {
      setSearchParams(new URLSearchParams(canonico), { replace: true })
    }
  }, [search, canonico, setSearchParams])

  const setTab = useCallback(
    (siguiente: string) => {
      const valido = leerTab(`tab=${siguiente}`)
      if (valido === ultimoSolicitadoRef.current) return
      ultimoSolicitadoRef.current = valido
      setSearchParams(new URLSearchParams(serializarTab(valido)), { replace: false })
    },
    [setSearchParams],
  )

  return { tab, setTab }
}
