/**
 * Guardia de cambios sin guardar (SPEC forms-a11y R4).
 *
 * `useFormDirty(snapshot)` compara el snapshot actual contra una copia del inicial.
 * El snapshot puede contener objetos planos, arrays y `Set`; la comparación es
 * estructural, no por referencia, para que los `new Set(...)` de cada render no
 * marquen el formulario como sucio.
 *
 * - `resetear()` fija el snapshot actual como nuevo estado inicial (se llama tras
 *   guardar o tras descartar, antes de navegar/cerrar; R4.5/R4.6).
 * - `resetear(nuevo)` permite fijar explícitamente el estado inicial (p. ej. al
 *   restaurar los valores originales de un diálogo).
 * - Inicialización perezosa con ref: segura con el doble render de StrictMode.
 */

import { useCallback, useRef, useState } from "react"

function clonar<T>(valor: T): T {
  if (valor instanceof Set) return new Set(valor) as T
  if (Array.isArray(valor)) return valor.map((v) => clonar(v)) as T
  if (valor !== null && typeof valor === "object") {
    const copia: Record<string, unknown> = {}
    for (const [clave, v] of Object.entries(valor as Record<string, unknown>)) {
      copia[clave] = clonar(v)
    }
    return copia as T
  }
  return valor
}

function iguales(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a instanceof Set || b instanceof Set) {
    if (!(a instanceof Set) || !(b instanceof Set)) return false
    if (a.size !== b.size) return false
    for (const valor of a) {
      if (!b.has(valor)) return false
    }
    return true
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((valor, i) => iguales(valor, b[i]))
  }
  if (a !== null && b !== null && typeof a === "object" && typeof b === "object") {
    const clavesA = Object.keys(a as Record<string, unknown>)
    const clavesB = Object.keys(b as Record<string, unknown>)
    if (clavesA.length !== clavesB.length) return false
    return clavesA.every((clave) =>
      iguales(
        (a as Record<string, unknown>)[clave],
        (b as Record<string, unknown>)[clave],
      ),
    )
  }
  return false
}

export interface FormDirty<T> {
  /** true si el snapshot actual difiere del inicial. */
  sucio: boolean
  /** Fija el snapshot actual (o el indicado) como estado limpio. */
  resetear: (nuevo?: T) => void
}

export function useFormDirty<T>(snapshot: T): FormDirty<T> {
  // Init perezoso: la copia inicial se toma una sola vez por montaje.
  const inicialRef = useRef<{ valor: T } | null>(null)
  if (inicialRef.current === null) {
    inicialRef.current = { valor: clonar(snapshot) }
  }

  // Último snapshot visto, para que `resetear()` sin argumentos use el actual.
  const actualRef = useRef(snapshot)
  actualRef.current = snapshot

  // Fuerza un re-render al cambiar el inicial (el snapshot puede no cambiar).
  const [, setVersion] = useState(0)

  const resetear = useCallback((nuevo?: T) => {
    inicialRef.current = { valor: clonar(nuevo === undefined ? actualRef.current : nuevo) }
    setVersion((v) => v + 1)
  }, [])

  return {
    sucio: !iguales(snapshot, inicialRef.current.valor),
    resetear,
  }
}
