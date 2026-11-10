/**
 * Resumen de errores al inicio del formulario (R2.4): se anuncia una vez al enviar
 * (`role="alert"`) y cada ítem es un botón `type="button"` que enfoca su campo
 * sin cambiar de ruta.
 */

interface ItemError<Campo extends string> {
  campo: Campo
  mensaje: string
}

interface Props<Campo extends string> {
  errores: ItemError<Campo>[]
  onEnfocar: (campo: Campo) => void
  titulo?: string
}

export function ErrorSummary<Campo extends string>({
  errores,
  onEnfocar,
  titulo = "Revisa los siguientes campos:",
}: Props<Campo>) {
  if (errores.length === 0) return null
  return (
    <div role="alert" className="space-y-2 rounded-lg border border-destructive/50 bg-card p-3 text-left">
      <p className="text-sm font-medium text-destructive">{titulo}</p>
      <ul className="list-disc space-y-1 pl-4">
        {errores.map(({ campo, mensaje }) => (
          <li key={campo} className="text-sm">
            <button
              type="button"
              onClick={() => onEnfocar(campo)}
              className="rounded-sm text-left text-destructive underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
            >
              {mensaje}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
