/**
 * Confirmación de descarte de cambios (SPEC forms-a11y R4.4/R4.5).
 *
 * `AlertDialog` controlado que nunca llama a la API: solo avisa y delega en el
 * formulario. La acción segura “Seguir editando” recibe el foco inicial y, al
 * cerrar, restaura el foco en el control que lo tenía antes (R4.5); Escape
 * equivale a seguir editando. “Descartar cambios” es la acción destructiva y
 * no restaura el foco.
 */

import { useCallback, useLayoutEffect, useRef } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Props {
  abierto: boolean
  /** Cierra la confirmación y conserva el formulario/foco (acción segura). */
  onSeguir: () => void
  /** Descarta los cambios según el origen (cierre o navegación). */
  onDescartar: () => void
  descripcion?: string
}

const DESCRIPCION_POR_DEFECTO =
  "Si sales ahora, los cambios que no has guardado se perderán."

export function ConfirmarDescarteDialog({
  abierto,
  onSeguir,
  onDescartar,
  descripcion = DESCRIPCION_POR_DEFECTO,
}: Props) {
  const seguirRef = useRef<HTMLButtonElement>(null)
  const descartandoRef = useRef(false)
  /** Elemento que tenía el foco al abrirse la confirmación (R4.5). */
  const focoPrevioRef = useRef<HTMLElement | null>(null)
  const abiertoPrevioRef = useRef(false)
  const restaurarPendienteRef = useRef(false)

  const restaurarFoco = useCallback(() => {
    const destino = focoPrevioRef.current
    focoPrevioRef.current = null
    if (!destino || !destino.isConnected) return
    // Se ejecuta cuando el cierre ya se ha confirmado y el diálogo se desmontó.
    window.setTimeout(() => {
      if (destino.isConnected) destino.focus({ preventScroll: true })
    }, 0)
  }, [])

  // Se captura en layout effect: antes de que el FocusScope de Radix mueva el
  // foco al botón seguro. Al capturar en render/effect se perdería el origen.
  useLayoutEffect(() => {
    if (!abierto) {
      abiertoPrevioRef.current = false
      if (restaurarPendienteRef.current) {
        restaurarPendienteRef.current = false
        restaurarFoco()
      }
      return
    }
    if (!abiertoPrevioRef.current) {
      const activo = document.activeElement
      focoPrevioRef.current = activo instanceof HTMLElement ? activo : null
      abiertoPrevioRef.current = true
    }
  }, [abierto, restaurarFoco])

  return (
    <AlertDialog
      open={abierto}
      onOpenChange={(o) => {
        if (o) return
        if (descartandoRef.current) {
          descartandoRef.current = false
          return
        }
        // Escape, overlay o cierre del AlertDialog: acción segura.
        restaurarPendienteRef.current = true
        onSeguir()
      }}
    >
      <AlertDialogContent
        onOpenAutoFocus={(e) => {
          // El foco inicial va a “Seguir editando”, no a la acción destructiva.
          e.preventDefault()
          seguirRef.current?.focus()
        }}
        onCloseAutoFocus={(e) => {
          // Evita que Radix restaure por su cuenta (podría dejar BODY) y
          // compita con la restauración explícita de la acción segura.
          e.preventDefault()
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>¿Descartar cambios?</AlertDialogTitle>
          <AlertDialogDescription>{descripcion}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel ref={seguirRef}>Seguir editando</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              descartandoRef.current = true
              onDescartar()
            }}
          >
            Descartar cambios
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
