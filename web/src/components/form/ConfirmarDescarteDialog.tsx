/**
 * Confirmación de descarte de cambios (SPEC forms-a11y R4.4/R4.5).
 *
 * `AlertDialog` controlado que nunca llama a la API: solo avisa y delega en el
 * formulario. La acción segura “Seguir editando” recibe el foco inicial; Escape
 * o clic en el overlay equivalen a seguir editando. “Descartar cambios” es la
 * acción destructiva.
 */

import { useRef } from "react"
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
        onSeguir()
      }}
    >
      <AlertDialogContent
        onOpenAutoFocus={(e) => {
          // El foco inicial va a “Seguir editando”, no a la acción destructiva.
          e.preventDefault()
          seguirRef.current?.focus()
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
