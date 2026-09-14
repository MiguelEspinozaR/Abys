import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { formatBs, fromISODate } from "@/lib/format"
import { useChartColors } from "@/lib/chartTheme"
import type { WeeklyData } from "@/services/types"
import { ChartTooltip } from "./ChartTooltip"

export function WeeklyChart({ data }: { data: WeeklyData }) {
  const c = useChartColors()
  const rows = data.dias.map((d) => ({
    nombre: format(fromISODate(d.fecha), "EEE d", { locale: es }).replace(".", ""),
    total_centavos: d.total_centavos,
    cantidad_pagos: d.cantidad_pagos,
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
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
              formatter={(v: number, name: string) =>
                name === "total_centavos" ? formatBs(v) : String(v)
              }
              labelFormatter={(label, payload) => {
                const p = payload?.[0]?.payload as { cantidad_pagos?: number } | undefined
                return `${label} · ${p?.cantidad_pagos ?? 0} pago(s)`
              }}
            />
          }
          cursor={{ fill: c.border, opacity: 0.35 }}
        />
        <Bar dataKey="total_centavos" fill={c["chart-1"]} radius={[4, 4, 0, 0]} maxBarSize={42} />
      </BarChart>
    </ResponsiveContainer>
  )
}