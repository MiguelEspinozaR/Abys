import { useMemo } from "react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { formatBs } from "@/lib/format"
import { useChartColors } from "@/lib/chartTheme"
import type { DistributionData } from "@/services/types"
import { filasDistribucion, patronFill, porcentajeFuente } from "./chartLogic"
import { ChartSourcePatterns } from "./ChartPatterns"
import { ChartLegend } from "./ChartLegend"
import { ChartTooltip } from "./ChartTooltip"

/** Torta de distribución por fuente con color + patrón y porcentajes visibles (R10/D6). */
export function DistributionPie({
  data,
  prefijo,
}: {
  data: DistributionData
  /** Prefijo único del chart para ids SVG de patrones. */
  prefijo: string
}) {
  const c = useChartColors()
  const fuentes = useMemo(() => filasDistribucion(data), [data])
  const coloresPorSerie = useMemo(
    () => Object.fromEntries(fuentes.map((f) => [f.alias, f.color])),
    [fuentes],
  )

  if (data.total_centavos <= 0 || fuentes.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        Sin datos en el período
      </div>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart accessibilityLayer>
          <ChartSourcePatterns fuentes={fuentes} colores={c} prefijo={prefijo} />
          <Pie
            data={fuentes}
            dataKey="total_centavos"
            nameKey="alias"
            cx="50%"
            cy="50%"
            outerRadius={82}
            labelLine={false}
            label={(props: {
              index?: number
              x?: number
              y?: number
              textAnchor?: "start" | "middle" | "end" | "inherit"
            }) => (
              <text
                x={props.x}
                y={props.y}
                textAnchor={props.textAnchor}
                dominantBaseline="middle"
                fill={c.foreground || c["muted-foreground"] || "#111111"}
                fontSize={11}
              >
                {fuentes[props.index ?? 0]?.porcentaje ?? ""}
              </text>
            )}
            isAnimationActive={false}
          >
            {fuentes.map((fuente) => (
              <Cell
                key={fuente.fuente_id}
                fill={patronFill(prefijo, fuente.fuente_id)}
                stroke={c["muted-foreground"]}
                strokeWidth={1}
              />
            ))}
          </Pie>
          <Tooltip
            content={
              <ChartTooltip
                colorPorSerie={coloresPorSerie}
                labelFormatter={() => "Distribución por fuente"}
                formatter={(valor, nombre) =>
                  `${formatBs(valor)} · ${porcentajeFuente(valor, data.total_centavos)} · ${nombre}`
                }
              />
            }
          />
        </PieChart>
      </ResponsiveContainer>
      <ChartLegend fuentes={fuentes} totalCentavos={data.total_centavos} />
    </div>
  )
}
