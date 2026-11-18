import { useMemo } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { formatBs, formatearFechaEs } from "@/lib/format"
import { useChartColors } from "@/lib/chartTheme"
import type { WeeklyData } from "@/services/types"
import { claveFuente, filasApiladas, fuentesUnicas, patronFill } from "./chartLogic"
import { ChartSourcePatterns } from "./ChartPatterns"
import { ChartLegend } from "./ChartLegend"
import { ChartTooltip } from "./ChartTooltip"

const PREFIJO = "semanal"

/** Barras apiladas por fuente sobre dias_trabajados.fecha (R6/D9). */
export function WeeklyChart({ data }: { data: WeeklyData }) {
  const c = useChartColors()
  const fuentes = useMemo(
    () => fuentesUnicas(data.dias.flatMap((dia) => dia.por_fuente)),
    [data],
  )
  const filas = useMemo(() => filasApiladas(data.dias), [data])
  const coloresPorSerie = useMemo(
    () => Object.fromEntries(fuentes.map((f) => [f.alias, f.color])),
    [fuentes],
  )

  if (fuentes.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        Sin datos en la semana
      </div>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={filas}
          accessibilityLayer
          margin={{ top: 8, right: 8, left: -14, bottom: 0 }}
        >
          <ChartSourcePatterns fuentes={fuentes} colores={c} prefijo={PREFIJO} />
          <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false} />
          <XAxis
            dataKey="nombre"
            tick={{ fontSize: 12, fill: c["muted-foreground"] }}
            axisLine={{ stroke: c.border }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: c["muted-foreground"] }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${Math.round(v / 100)}`}
            width={48}
          />
          <Tooltip
            content={
              <ChartTooltip
                colorPorSerie={coloresPorSerie}
                labelFormatter={(label, payload) => {
                  const fila = payload?.[0]?.payload as
                    | { fecha?: string; total_centavos?: number }
                    | undefined
                  const fecha = fila?.fecha ? ` · ${formatearFechaEs(fila.fecha)}` : ""
                  return `${label}${fecha} · Total del día: ${formatBs(fila?.total_centavos ?? 0)}`
                }}
              />
            }
            cursor={{ fill: c.border, opacity: 0.35 }}
          />
          {fuentes.map((fuente, indice) => (
            <Bar
              key={fuente.fuente_id}
              dataKey={claveFuente(fuente.fuente_id)}
              name={fuente.alias}
              stackId="total"
              fill={patronFill(PREFIJO, fuente.fuente_id)}
              stroke={c["muted-foreground"]}
              strokeWidth={1}
              radius={indice === fuentes.length - 1 ? [4, 4, 0, 0] : undefined}
              maxBarSize={42}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <ChartLegend fuentes={fuentes} />
    </div>
  )
}
