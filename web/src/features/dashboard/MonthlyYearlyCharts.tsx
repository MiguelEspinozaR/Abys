import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { formatBs } from "@/lib/format"
import { useChartColors } from "@/lib/chartTheme"
import type { MonthlyData, YearlyData } from "@/services/types"
import { ChartTooltip } from "./ChartTooltip"

export function MonthlyChart({ data }: { data: MonthlyData }) {
  const c = useChartColors()
  const rows = data.semanas.map((s) => ({
    nombre: `Sem ${s.semana}`,
    total_centavos: s.total_centavos,
    cantidad_pagos: s.cantidad_pagos,
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
              formatter={(v: number) => formatBs(v)}
              labelFormatter={(label, payload) => {
                const p = payload?.[0]?.payload as { cantidad_pagos?: number } | undefined
                return `${label} · ${p?.cantidad_pagos ?? 0} pago(s)`
              }}
            />
          }
          cursor={{ fill: c.border, opacity: 0.35 }}
        />
        <Bar dataKey="total_centavos" fill={c["chart-2"]} radius={[4, 4, 0, 0]} maxBarSize={42} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function YearlyChart({ data }: { data: YearlyData }) {
  const c = useChartColors()
  const MESES = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ]
  const rows = data.meses.map((m, i) => ({
    nombre: MESES[i] ?? String(m.mes),
    total_centavos: m.total_centavos,
    cantidad_pagos: m.cantidad_pagos,
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false} />
        <XAxis
          dataKey="nombre"
          tick={{ fontSize: 11, fill: c["muted-foreground"] }}
          axisLine={{ stroke: c.border }}
          tickLine={false}
          interval={0}
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
              formatter={(v: number) => formatBs(v)}
              labelFormatter={(label, payload) => {
                const p = payload?.[0]?.payload as { cantidad_pagos?: number } | undefined
                return `${label} · ${p?.cantidad_pagos ?? 0} pago(s)`
              }}
            />
          }
          cursor={{ fill: c.border, opacity: 0.35 }}
        />
        <Bar dataKey="total_centavos" fill={c["chart-3"]} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  )
}