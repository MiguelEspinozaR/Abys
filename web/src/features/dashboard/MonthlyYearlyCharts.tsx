import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useChartColors } from "@/lib/chartTheme"
import type { MonthlyData, YearlyData } from "@/services/types"
import { filasBloques, filasMeses } from "./chartLogic"
import { ChartPatterns } from "./ChartPatterns"
import { ChartTooltip } from "./ChartTooltip"

function EjesY({ colors }: { colors: Record<string, string> }) {
  return (
    <YAxis
      tick={{ fontSize: 11, fill: colors["muted-foreground"] }}
      axisLine={false}
      tickLine={false}
      tickFormatter={(v: number) => `${Math.round(v / 100)}`}
      width={48}
    />
  )
}

/** Barras simples por bloque del mes (1–7, 8–14, …) — R7/D5. */
export function MonthlyChart({ data }: { data: MonthlyData }) {
  const c = useChartColors()
  const filas = filasBloques(data)

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={filas}
        accessibilityLayer
        margin={{ top: 8, right: 8, left: -14, bottom: 0 }}
      >
        <ChartPatterns tipo="mensual" colores={c} />
        <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false} />
        <XAxis
          dataKey="nombre"
          tick={{ fontSize: 12, fill: c["muted-foreground"] }}
          axisLine={{ stroke: c.border }}
          tickLine={false}
        />
        <EjesY colors={c} />
        <Tooltip
          content={<ChartTooltip colorPorSerie={{ Total: c["chart-2"] }} />}
          cursor={{ fill: c.border, opacity: 0.35 }}
        />
        <Bar
          dataKey="total_centavos"
          name="Total"
          fill="url(#patron-mensual)"
          stroke={c["muted-foreground"]}
          strokeWidth={1}
          radius={[4, 4, 0, 0]}
          maxBarSize={42}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Barras simples por mes del año, rotuladas desde `mes` — R8/D10. */
export function YearlyChart({ data }: { data: YearlyData }) {
  const c = useChartColors()
  const filas = filasMeses(data)

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={filas}
        accessibilityLayer
        margin={{ top: 8, right: 8, left: -14, bottom: 0 }}
      >
        <ChartPatterns tipo="anual" colores={c} />
        <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false} />
        <XAxis
          dataKey="nombre"
          tick={{ fontSize: 11, fill: c["muted-foreground"] }}
          axisLine={{ stroke: c.border }}
          tickLine={false}
          interval={0}
        />
        <EjesY colors={c} />
        <Tooltip
          content={<ChartTooltip colorPorSerie={{ Total: c["chart-3"] }} />}
          cursor={{ fill: c.border, opacity: 0.35 }}
        />
        <Bar
          dataKey="total_centavos"
          name="Total"
          fill="url(#patron-anual)"
          stroke={c["muted-foreground"]}
          strokeWidth={1}
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
