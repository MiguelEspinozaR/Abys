import Calendar from "react-calendar"
import { Banknote, CalendarCheck, Eraser } from "lucide-react"
import { cn } from "@/lib/utils"
import { fromISODate, toISODate } from "@/lib/format"
import { Button } from "@/components/ui/button"

export type Herramienta = "trabajo" | "pago" | "quitar"

interface Props {
  diasTrabajados: Set<string>
  fechaPago: string | null
  /** días ya registrados en pagos guardados (referencia visual) */
  yaTrabajados?: Set<string>
  /** fechas de pago ya registradas en pagos guardados (referencia visual) */
  yaFechasPago?: Set<string>
  herramienta: Herramienta
  setHerramienta: (h: Herramienta) => void
  onMarcarDia: (fecha: string) => void
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

export function CalendarioDias({ diasTrabajados, fechaPago, yaTrabajados, yaFechasPago, herramienta, setHerramienta, onMarcarDia }: Props) {
  const fechaSel = fechaPago ? fromISODate(fechaPago) : null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1" role="toolbar" aria-label="Herramientas del calendario">
        {HERRAMIENTAS.map(({ valor, label, icono: Icono }) => (
          <Button
            key={valor}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setHerramienta(valor)}
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
          const esYaTrabajo = !esDia && !!yaTrabajados?.has(iso)
          const esYaPago = !!yaFechasPago?.has(iso)
          const puntos: string[] = []
          if (esDia) puntos.push("bg-emerald-500")
          if (esYaTrabajo) puntos.push("bg-violet-500")
          if (esYaPago) puntos.push("bg-amber-500")
          if (puntos.length === 0) return null
          return (
            <span className="mx-auto mt-0.5 flex items-center justify-center gap-0.5" aria-hidden>
              {puntos.map((c, i) => (
                <span key={i} className={`block size-1.5 rounded-full ${c}`} />
              ))}
            </span>
          )
        }}
        className="rounded-xl border bg-card p-2"
      />

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-emerald-500" aria-hidden /> día trabajado (nuevo)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-violet-500" aria-hidden /> día ya registrado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-amber-500" aria-hidden /> fecha de pago ya registrada
        </span>
        <span className="ml-auto">{diasTrabajados.size} día(s) · {fechaPago ?? "sin fecha de pago"}</span>
      </div>
    </div>
  )
}