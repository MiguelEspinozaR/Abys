import { useId } from "react"
import { formatBs } from "@/lib/format"
import { useChartColors } from "@/lib/chartTheme"
import type { FuenteTotal } from "@/services/types"
import { porcentajeFuente } from "./chartLogic"
import { PatronFuente } from "./ChartPatterns"

function Swatch({
  fuente,
  colores,
}: {
  fuente: Pick<FuenteTotal, "fuente_id" | "color">
  colores: Record<string, string>
}) {
  const uid = `leyenda-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      className="shrink-0"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <PatronFuente id={uid} fuente={fuente} colores={colores} />
      </defs>
      <rect
        width="14"
        height="14"
        fill={`url(#${uid})`}
        stroke={colores["muted-foreground"] || "#888888"}
        strokeWidth="1"
      />
    </svg>
  )
}

interface ChartLegendProps {
  fuentes: FuenteTotal[]
  /** Si se indica, se añaden monto y porcentaje a cada entrada (distribuciones). */
  totalCentavos?: number
}

/** Leyenda accesible: nombre real + color/patrón decorativo oculto al lector. */
export function ChartLegend({ fuentes, totalCentavos }: ChartLegendProps) {
  const colores = useChartColors()
  if (fuentes.length === 0) return null

  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
      {fuentes.map((fuente) => (
        <li key={fuente.fuente_id} className="flex items-center gap-2 text-xs text-foreground">
          <Swatch fuente={fuente} colores={colores} />
          <span className="tabular-nums">
            {fuente.alias}
            {totalCentavos !== undefined && (
              <>
                {" · "}
                {formatBs(fuente.total_centavos)}
                {" · "}
                {porcentajeFuente(fuente.total_centavos, totalCentavos)}
              </>
            )}
          </span>
        </li>
      ))}
    </ul>
  )
}
