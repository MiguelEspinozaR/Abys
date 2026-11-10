/**
 * Hook local de errores de formulario (D1: sin react-hook-form/zod).
 *
 * - Estado de errores por campo (`Record<campo, mensaje>`).
 * - `validarSubmit`: valida todos los campos, muestra el resumen y enfoca el
 *   primer campo inválido (o su fieldset con `tabIndex={-1}`, R2.5).
 * - `validarBlur`: valida al salir del campo (R2.1).
 * - `validarChange`: revalida en `change` SOLO si el campo ya tenía error,
 *   para limpiarlo al corregirlo (D20/R2.1/R2.6).
 * - `limpiar`: reinicia errores y resumen (p. ej. al cerrar el diálogo).
 */

import { useCallback, useMemo, useRef, useState } from "react"

/** Función que devuelve el mensaje de error del campo o `null` si es válido. */
export type Validador = () => string | null

/** Entrada de validación para `validarSubmit`. */
export interface CampoValidacion<Campo extends string> {
  campo: Campo
  validar: Validador
  /**
   * Enfoca el control (o el `fieldset` con `tabIndex={-1}`) cuando este campo es
   * el primero inválido al enviar (R2.5).
   */
  enfocar?: () => void
}

export interface ErroresForm<Campo extends string> {
  /** Mensaje por campo (solo los campos con error tienen entrada). */
  errores: Partial<Record<Campo, string>>
  /** Lista actual de errores en orden de inserción (para el resumen, R2.4). */
  listaErrores: { campo: Campo; mensaje: string }[]
  /** El resumen solo se muestra tras un submit con errores (R2.4). */
  resumenVisible: boolean
  /** Blur: valida siempre (R2.1). */
  validarBlur: (campo: Campo, validar: Validador) => void
  /** Change: revalida solo si el campo ya tenía error (D20). */
  validarChange: (campo: Campo, validar: Validador) => void
  /**
   * Submit: valida todos los campos en orden, actualiza el estado, muestra el
   * resumen y enfoca el primero inválido. Devuelve `true` si el formulario es
   * válido (sin errores).
   */
  validarSubmit: (campos: readonly CampoValidacion<Campo>[]) => boolean
  /** Limpia errores y resumen. */
  limpiar: () => void
}

export function useFormErrors<Campo extends string = string>(): ErroresForm<Campo> {
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({})
  const [resumenVisible, setResumenVisible] = useState(false)

  // Ref sincronizada con el estado para consultar "¿ya tenía error?" en change.
  const erroresRef = useRef<Partial<Record<Campo, string>>>({})
  erroresRef.current = errores

  const listaErrores = useMemo(
    () =>
      Object.entries(errores).map(([campo, mensaje]) => ({
        campo: campo as Campo,
        mensaje: mensaje as string,
      })),
    [errores],
  )

  /** Marca (o limpia) el error de un campo sin tocar los demás (R2.6). */
  const marcar = useCallback((campo: Campo, mensaje: string | null) => {
    setErrores((prev) => {
      if (mensaje) {
        return prev[campo] === mensaje ? prev : { ...prev, [campo]: mensaje }
      }
      if (prev[campo] == null) return prev
      const next = { ...prev }
      delete next[campo]
      return next
    })
  }, [])

  const validarBlur = useCallback(
    (campo: Campo, validar: Validador) => {
      marcar(campo, validar())
    },
    [marcar],
  )

  const validarChange = useCallback(
    (campo: Campo, validar: Validador) => {
      if (erroresRef.current[campo] != null) marcar(campo, validar())
    },
    [marcar],
  )

  const validarSubmit = useCallback((campos: readonly CampoValidacion<Campo>[]) => {
    const nuevos: Partial<Record<Campo, string>> = {}
    let primeroInvalido: CampoValidacion<Campo> | undefined
    for (const entrada of campos) {
      const mensaje = entrada.validar()
      if (mensaje) {
        nuevos[entrada.campo] = mensaje
        if (!primeroInvalido) primeroInvalido = entrada
      }
    }
    setErrores(nuevos)
    const valido = Object.keys(nuevos).length === 0
    setResumenVisible(!valido)
    if (primeroInvalido) primeroInvalido.enfocar?.()
    return valido
  }, [])

  const limpiar = useCallback(() => {
    setErrores({})
    setResumenVisible(false)
  }, [])

  return { errores, listaErrores, resumenVisible, validarBlur, validarChange, validarSubmit, limpiar }
}
