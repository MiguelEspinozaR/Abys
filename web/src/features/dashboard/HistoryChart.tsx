import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useChartColors } from "@/lib/chartTheme"
import type { HistoryData } from "@/services/types"
import { filasHistorial } from "./chartLogic"
import { ChartTooltip } from "./ChartTooltip"

/** Histórico mensual: una sola serie de totales mensuales (R9). */
export function HistoryChart({
  data,
  desde,
  hasta,
}: {
  data: HistoryData
  desde: { anio: number; mes: number }
  hasta: { anio: number; mes: number }
}) {
  const c = useChartColors()
  const filas = filasHistorial(data, desde, hasta)

  if (filas.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        Sin datos en el rango seleccionado
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart
        data={filas}
        accessibilityLayer
        margin={{ top: 8, right: 8, left: -14, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false} />
        <XAxis
          dataKey="nombre"
          tick={{ fontSize: 11, fill: c["muted-foreground"] }}
          axisLine={{ stroke: c.border }}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={16}
        />
        <YAxis
          tick={{ fontSize: 11, fill: c["muted-foreground"] }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${Math.round(v / 100)}`}
          width={48}
        />
        <Tooltip content={<ChartTooltip colorPorSerie={{ Total: c["chart-1"] }} />} />
        <Line
          type="monotone"
          dataKey="total_centavos"
          name="Total"
          stroke={c["chart-1"]}
          strokeWidth={2}
          dot={{ r: 2.5, fill: c["chart-1"], strokeWidth: 0 }}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
