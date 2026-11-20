import Calendar from "react-calendar"
import { Banknote, CalendarCheck, Eraser } from "lucide-react"
import { cn } from "@/lib/utils"
import { fromISODate, toISODate } from "@/lib/format"
import {
  BG_FUENTE_FALLBACK,
  esColorHex,
  fuentesParaLeyenda,
  top3Fuentes,
  type FuentesPorDia,
} from "@/lib/fuentesDots"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/form/FieldError"

export type Herramienta = "trabajo" | "pago" | "quitar"

interface Props {
  /** id del `fieldset` (para foco programático desde el resumen). */
  id?: string
  /**
   * Texto visible del `<legend>`: nombra el grupo de días trabajados/fecha de pago
   * (R1.5/D13). Registrar usa "Días trabajados y fecha de pago" y Editar
   * "Días trabajados" para no duplicar semántica con su input de fecha.
   */
  legend: React.ReactNode
  diasTrabajados: Set<string>
  fechaPago: string | null
  /** fechas de pago ya registradas en pagos guardados (referencia visual) */
  yaFechasPago?: Set<string>
  /**
   * Totales por fuente y día de pagos guardados (R2.6). Opcional: sin este mapa
   * (p. ej. en EditarPagoDialog) no se pintan puntos de fuente (AC5).
   */
  fuentesPorDia?: FuentesPorDia
  herramienta: Herramienta
  setHerramienta: (h: Herramienta) => void
  onMarcarDia: (fecha: string) => void
  /** Error inline junto al calendario (R2.11); se asocia vía `aria-describedby`. */
  error?: string | null
  /** id del elemento de error (target del `aria-describedby` del fieldset). */
  errorId?: string
  /**
   * Bloquea la edición del calendario (p. ej. después de guardar el pago y fallar
   * el comprobante): deshabilita el `fieldset` y sus botones, sin desmontarlo.
   */
  disabled?: boolean
}

const HERRAMIENTAS: { valor: Herramienta; label: string; icono: React.ElementType }[] = [
  { valor: "trabajo", label: "Trabajo", icono: CalendarCheck },
  { valor: "pago", label: "Pago", icono: Banknote },
  { valor: "quitar", label: "Quitar", icono: Eraser },
]

/** Convierte un value de react-calendar (Date | Date[]) a ISO. */
function valueToDate(value: unknown): Date | null {
  if (value instanceof Date) return value
  if (Array.isArray(value) && value[0] instanceof Date) return value[0]
  return null
}

/**
 * Un color de BD válido va en `style` (nunca en una clase dinámica de Tailwind);
 * el inválido/ausente usa la clase estática `BG_FUENTE_FALLBACK`.
 */
function ColorSwatch({ color, className }: { color: string; className?: string }) {
  const valido = esColorHex(color)
  return (
    <span
      className={cn(
        "inline-block rounded-full",
        className,
        !valido && BG_FUENTE_FALLBACK,
      )}
      style={valido ? { backgroundColor: color } : undefined}
      aria-hidden
    />
  )
}

export function CalendarioDias({
  id,
  legend,
  diasTrabajados,
  fechaPago,
  yaFechasPago,
  fuentesPorDia,
  herramienta,
  setHerramienta,
  onMarcarDia,
  error,
  errorId,
  disabled = false,
}: Props) {
  const fechaSel = fechaPago ? fromISODate(fechaPago) : null
  const fuentesLeyenda = fuentesParaLeyenda(fuentesPorDia)

  return (
    <fieldset
      id={id}
      tabIndex={-1}
      disabled={disabled}
      className="m-0 min-w-0 space-y-3 border-0 p-0"
      aria-describedby={error ? errorId : undefined}
      aria-invalid={error ? true : undefined}
    >
      <legend className="px-0 text-sm leading-none font-medium">{legend}</legend>
      <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1" role="toolbar" aria-label="Herramientas del calendario">
        {HERRAMIENTAS.map(({ valor, label, icono: Icono }) => (
          <Button
            key={valor}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setHerramienta(valor)}
            disabled={disabled}
            aria-pressed={herramienta === valor}
            className={cn(
              "flex-1 gap-1.5 text-xs",
              herramienta === valor
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            <Icono className="size-3.5" aria-hidden />
            {label}
          </Button>
        ))}
      </div>

      <Calendar
        locale="es-BO"
        value={fechaSel ?? undefined}
        selectRange={false}
        onChange={(value) => {
          const d = valueToDate(value)
          if (d) onMarcarDia(toISODate(d))
        }}
        tileClassName={({ date }) => {
          const iso = toISODate(date)
          const esDia = diasTrabajados.has(iso)
          const esYaPago = !esDia && !!yaFechasPago?.has(iso)
          return cn(
            esDia && "font-semibold",
            fechaPago === iso && "bg-primary text-primary-foreground font-bold",
            esYaPago && "bg-primary/10 font-medium text-primary",
          )
        }}
        tileContent={({ date }) => {
          const iso = toISODate(date)
          const esDia = diasTrabajados.has(iso)
          const esYaPago = !!yaFechasPago?.has(iso)
          // El límite de 3 es solo de fuentes; verde/ámbar se añaden por su regla.
          const fuentesDelDia = esDia ? [] : top3Fuentes(fuentesPorDia, iso)
          const puntos: string[] = []
          if (esDia) puntos.push("bg-emerald-500")
          if (esYaPago) puntos.push("bg-amber-500")
          if (puntos.length === 0 && fuentesDelDia.length === 0) return null
          return (
            <>
              <span
                className="mx-auto mt-0.5 flex items-center justify-center gap-0.5"
                aria-hidden
              >
                {puntos.map((c, i) => (
                  <span
                    key={`estado-${i}`}
                    className={cn("block size-1.5 rounded-full", c)}
                  />
                ))}
                {fuentesDelDia.map((f) => (
                  <ColorSwatch
                    key={f.fuente_id}
                    color={f.color}
                    className="size-1.5"
                  />
                ))}
              </span>
              {fuentesDelDia.length > 0 && (
                <span className="sr-only">
                  Fuentes: {fuentesDelDia.map((f) => f.alias).join(", ")}
                </span>
              )}
            </>
          )
        }}
        className="rounded-xl border bg-card p-2 max-md:-mx-4 max-md:rounded-none max-md:border-x-0 max-md:p-0"
      />

      {errorId && <FieldError id={errorId} error={error} />}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-emerald-500" aria-hidden /> día trabajado (nuevo)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-amber-500" aria-hidden /> fecha de pago ya registrada
        </span>
        {fuentesLeyenda.length > 0 && (
          <span className="flex w-full flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-medium">Fuentes</span>
            {fuentesLeyenda.map((f) => (
              <span key={f.fuente_id} className="inline-flex items-center gap-1.5">
                <ColorSwatch color={f.color} className="size-2.5" />
                {f.alias}
              </span>
            ))}
          </span>
        )}
        <span className="ml-auto">{diasTrabajados.size} día(s) · {fechaPago ?? "sin fecha de pago"}</span>
      </div>
    </fieldset>
  )
}
