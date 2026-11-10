/**
 * Error inline de un campo (R2.3): `<p>` con id para asociarlo al control vía
 * `aria-describedby`. No se renderiza si no hay error.
 */

interface Props {
  id: string
  error?: string | null
}

export function FieldError({ id, error }: Props) {
  if (!error) return null
  return (
    <p id={id} className="text-xs text-destructive">
      {error}
    </p>
  )
}
