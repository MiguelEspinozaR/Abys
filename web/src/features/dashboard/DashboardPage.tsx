import { useMemo, useState } from "react"
import { addMonths, addWeeks, addYears, format, startOfWeek, subMonths, subWeeks, subYears } from "date-fns"
import { CalendarDays, CircleDollarSign, Clock3, Layers } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useHistory, useMonthly, useSummary, useWeekly, useYearly } from "@/services/hooks"
import { formatBs, toISODate } from "@/lib/format"
import { ChartCard } from "./ChartCard"
import { WeeklyChart } from "./WeeklyChart"
import { MonthlyChart, YearlyChart } from "./MonthlyYearlyCharts"
import { HistoryChart } from "./HistoryChart"

function CardResumen({
  titulo,
  valor,
  detalle,
  icono,
  loading,
}: {
  titulo: string
  valor: string
  detalle?: string
  icono: React.ReactNode
  loading?: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{titulo}</CardTitle>
        <span className="text-muted-foreground/70 [&_svg]:size-4">{icono}</span>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-28" />
        ) : (
          <p className="text-2xl font-semibold tabular-nums tracking-tight">{valor}</p>
        )}
        {detalle && <p className="mt-0.5 text-xs text-muted-foreground">{detalle}</p>}
      </CardContent>
    </Card>
  )
}

const MES_TITULO = (mes: number, anio: number) =>
  format(new Date(anio, mes - 1, 1), "MMMM yyyy", { locale: undefined })

export default function DashboardPage() {
  const hoy = new Date()
  const [semanaInicio, setSemanaInicio] = useState(() =>
    startOfWeek(hoy, { weekStartsOn: 1 }),
  )
  const [mesView, setMesView] = useState(() => ({ mes: hoy.getMonth() + 1, anio: hoy.getFullYear() }))
  const [anioView, setAnioView] = useState(() => hoy.getFullYear())
  const [rangoHist, setRangoHist] = useState<{ desde: { anio: number; mes: number }; hasta: { anio: number; mes: number } } | null>(null)

  const semanaISO = toISODate(semanaInicio)
  const { data: weekly, isLoading: weeklyLoading } = useWeekly(semanaISO)
  const { data: monthly, isLoading: monthlyLoading } = useMonthly(mesView.mes, mesView.anio)
  const { data: yearly, isLoading: yearlyLoading } = useYearly(anioView)
  const { data: history, isLoading: historyLoading } = useHistory()
  const { data: summary, isLoading: summaryLoading } = useSummary(mesView.mes, mesView.anio)

  // Rango visible por defecto del histórico: últimos 12 meses con datos.
  const rangoResuelto = useMemo(() => {
    if (rangoHist) return rangoHist
    if (!history || history.por_mes.length === 0) return null
    const ultimo = history.por_mes[history.por_mes.length - 1]
    return {
      desde: { anio: ultimo.anio, mes: Math.max(1, ultimo.mes - 11) },
      hasta: { anio: ultimo.anio, mes: ultimo.mes },
    }
  }, [history, rangoHist])

  const totalHistorico = useMemo(
    () => history?.por_mes.reduce((acc, m) => acc + m.total_centavos, 0) ?? 0,
    [history],
  )

  const moverHist = (dir: 1 | -1) => {
    const desde = rangoResuelto?.desde ?? { anio: hoy.getFullYear(), mes: 1 }
    const hasta = rangoResuelto?.hasta ?? { anio: hoy.getFullYear(), mes: 12 }
    const nuevo = {
      desde: { anio: desde.anio, mes: desde.mes + 12 * dir },
      hasta: { anio: hasta.anio, mes: hasta.mes + 12 * dir },
    }
    setRangoHist(nuevo)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Resumen del mes de {format(new Date(mesView.anio, mesView.mes - 1, 1), "MMMM yyyy")}
        </p>
      </header>

      {/* Cards resumen */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <CardResumen
          titulo="Total del mes"
          valor={formatBs(summary?.total_centavos ?? 0)}
          detalle={`${new Date(mesView.anio, mesView.mes, 0).getDate()} días en el período`}
          icono={<CircleDollarSign />}
          loading={summaryLoading}
        />
        <CardResumen
          titulo="Pagos"
          valor={String(summary?.cantidad_pagos ?? 0)}
          detalle="Pagos registrados en el mes"
          icono={<Layers />}
          loading={summaryLoading}
        />
        <CardResumen
          titulo="Días trabajados"
          valor={String(summary?.dias_trabajados ?? 0)}
          detalle="Suma de días pagados"
          icono={<CalendarDays />}
          loading={summaryLoading}
        />
        <CardResumen
          titulo="Total histórico"
          valor={formatBs(totalHistorico)}
          detalle={`${history?.por_mes.length ?? 0} meses de actividad`}
          icono={<Clock3 />}
          loading={historyLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          titulo="Semanal"
          subtitulo={`${format(weekly?.semana_inicio ? new Date(weekly.semana_inicio + "T00:00:00") : semanaInicio, "d MMM")} – ${format(weekly?.semana_fin ? new Date(weekly.semana_fin + "T00:00:00") : semanaInicio, "d MMM yyyy")}`}
          onPrev={() => setSemanaInicio((d) => subWeeks(d, 1))}
          onNext={() => setSemanaInicio((d) => addWeeks(d, 1))}
        >
          {weeklyLoading || !weekly ? (
            <Skeleton className="h-[240px] w-full" />
          ) : (
            <WeeklyChart data={weekly} />
          )}
        </ChartCard>

        <ChartCard
          titulo="Mensual"
          subtitulo={`Distribución por semana · ${MES_TITULO(mesView.mes, mesView.anio)}`}
          onPrev={() => setMesView((v) => {
            const d = subMonths(new Date(v.anio, v.mes - 1, 1), 1)
            return { mes: d.getMonth() + 1, anio: d.getFullYear() }
          })}
          onNext={() => setMesView((v) => {
            const d = addMonths(new Date(v.anio, v.mes - 1, 1), 1)
            return { mes: d.getMonth() + 1, anio: d.getFullYear() }
          })}
        >
          {monthlyLoading || !monthly ? (
            <Skeleton className="h-[240px] w-full" />
          ) : (
            <MonthlyChart data={monthly} />
          )}
        </ChartCard>

        <ChartCard
          titulo="Anual"
          subtitulo={`Distribución por mes · ${anioView}`}
          onPrev={() => setAnioView((a) => subYears(new Date(a, 0, 1), 1).getFullYear())}
          onNext={() => setAnioView((a) => addYears(new Date(a, 0, 1), 1).getFullYear())}
        >
          {yearlyLoading || !yearly ? (
            <Skeleton className="h-[240px] w-full" />
          ) : (
            <YearlyChart data={yearly} />
          )}
        </ChartCard>

        <ChartCard
          titulo="Histórico"
          subtitulo={
            rangoResuelto
              ? `${MES_TITULO(rangoResuelto.desde.mes, rangoResuelto.desde.anio)} – ${MES_TITULO(rangoResuelto.hasta.mes, rangoResuelto.hasta.anio)}`
              : "Evolución mensual con tendencia"
          }
          onPrev={() => moverHist(-1)}
          onNext={() => moverHist(1)}
        >
          {historyLoading || !history || !rangoResuelto ? (
            <Skeleton className="h-[240px] w-full" />
          ) : (
            <HistoryChart data={history} desde={rangoResuelto.desde} hasta={rangoResuelto.hasta} />
          )}
        </ChartCard>
      </div>
    </div>
  )
}