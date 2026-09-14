import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { formatBs, MESES_ABREV } from "@/lib/format"
import { useChartColors } from "@/lib/chartTheme"
import type { HistoryData } from "@/services/types"
import { ChartTooltip } from "./ChartTooltip"

/** Media móvil simple de 3 meses para la línea de tendencia. */
function serieTendencia(porMes: { anio: number; mes: number; total_centavos: number }[]) {
  return porMes.map((m, i) => {
    const ventana = porMes.slice(Math.max(0, i - 2), i + 1)
    const prom = ventana.reduce((acc, v) => acc + v.total_centavos, 0) / ventana.length
    return { ...m, tendencia: Math.round(prom) }
  })
}

export function HistoryChart({
  data,
  desde,
  hasta,
}: {
  data: HistoryData
  /** rango visible [anio, mes] inclusive */
  desde: { anio: number; mes: number }
  hasta: { anio: number; mes: number }
}) {
  const c = useChartColors()

  const visibles = data.por_mes.filter((m) => {
    const d = m.anio * 100 + m.mes
    return d >= desde.anio * 100 + desde.mes && d <= hasta.anio * 100 + hasta.mes
  })

  const rows = serieTendencia(visibles).map((m) => ({
    nombre: `${m.anio % 100} ${MESES_ABREV[m.mes - 1] ?? ""}`.trim(),
    total_centavos: m.total_centavos,
    tendencia: m.tendencia,
  }))

  if (rows.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        Sin datos en el rango seleccionado
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={rows} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
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
        <Tooltip
          content={
            <ChartTooltip
              formatter={(v: number, name: string) =>
                name === "tendencia" ? `Tendencia: ${formatBs(v)}` : formatBs(v)
              }
            />
          }
        />
        <Line
          type="monotone"
          dataKey="total_centavos"
          name="Total"
          stroke={c["chart-1"]}
          strokeWidth={2}
          dot={{ r: 2.5, fill: c["chart-1"], strokeWidth: 0 }}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="tendencia"
          name="Tendencia"
          stroke={c["chart-2"]}
          strokeWidth={1.5}
          strokeDasharray="5 4"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}