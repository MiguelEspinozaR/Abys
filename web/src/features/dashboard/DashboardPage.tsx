import { useMemo, useState } from "react"
import {
  addMonths,
  addWeeks,
  addYears,
  format,
  startOfWeek,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns"
import { es } from "date-fns/locale"
import { CircleDollarSign, Clock3 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useDistributionMonthly,
  useDistributionYearly,
  useHistory,
  useMonthly,
  useSummary,
  useWeekly,
  useYearly,
} from "@/services/hooks"
import { formatBs, formatearFechaEs, toISODate } from "@/lib/format"
import type { DistributionData, HistoryData } from "@/services/types"
import {
  filasBloques,
  filasHistorial,
  filasMeses,
  fuentesUnicas,
  porcentajeFuente,
} from "./chartLogic"
import { ChartCard } from "./ChartCard"
import { WeeklyChart } from "./WeeklyChart"
import { MonthlyChart, YearlyChart } from "./MonthlyYearlyCharts"
import { HistoryChart } from "./HistoryChart"
import { DistributionPie } from "./DistributionPie"
import { TablaDatos } from "./TablaDatos"

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
  format(new Date(anio, mes - 1, 1), "MMMM yyyy", { locale: es })

function tablaDistribucion(data: DistributionData, caption: string) {
  return (
    <TablaDatos
      caption={caption}
      columnas={["Monto", "Porcentaje"]}
      filas={fuentesUnicas(data.por_fuente).map((fuente) => ({
        encabezado: fuente.alias,
        celdas: [
          formatBs(fuente.total_centavos),
          porcentajeFuente(fuente.total_centavos, data.total_centavos),
        ],
      }))}
    />
  )
}

function tablaHistoricoRango(
  data: HistoryData,
  caption: string,
  desde: { anio: number; mes: number },
  hasta: { anio: number; mes: number },
) {
  return (
    <TablaDatos
      caption={caption}
      columnas={["Total"]}
      filas={filasHistorial(data, desde, hasta).map((mes) => ({
        encabezado: mes.nombre,
        celdas: [formatBs(mes.total_centavos)],
      }))}
    />
  )
}

export default function DashboardPage() {
  const hoy = new Date()
  const anioActual = hoy.getFullYear()
  const mesActual = hoy.getMonth() + 1
  const [semanaInicio, setSemanaInicio] = useState(() =>
    startOfWeek(hoy, { weekStartsOn: 1 }),
  )
  const [mesView, setMesView] = useState(() => ({ mes: hoy.getMonth() + 1, anio: hoy.getFullYear() }))
  const [anioView, setAnioView] = useState(() => hoy.getFullYear())
  const [distMes, setDistMes] = useState(() => ({ mes: hoy.getMonth() + 1, anio: hoy.getFullYear() }))
  const [distAnio, setDistAnio] = useState(() => hoy.getFullYear())
  const [rangoHist, setRangoHist] = useState<{
    desde: { anio: number; mes: number }
    hasta: { anio: number; mes: number }
  } | null>(null)

  const semanaISO = toISODate(semanaInicio)
  const { data: weekly, isLoading: weeklyLoading } = useWeekly(semanaISO)
  const { data: monthly, isLoading: monthlyLoading } = useMonthly(mesView.mes, mesView.anio)
  const { data: yearly, isLoading: yearlyLoading } = useYearly(anioView)
  const { data: history, isLoading: historyLoading } = useHistory()
  const { data: summary, isLoading: summaryLoading } = useSummary()
  const { data: distribucionMes, isLoading: distribucionMesLoading } =
    useDistributionMonthly(distMes.mes, distMes.anio)
  const { data: distribucionAnio, isLoading: distribucionAnioLoading } =
    useDistributionYearly(distAnio)

  // Rango visible por defecto del histórico: últimos 12 meses con datos.
  const rangoResuelto = useMemo(() => {
    if (rangoHist) return rangoHist
    if (!history || history.por_mes.length === 0) {
      const desdeHoy = new Date(anioActual, mesActual - 12, 1)
      return {
        desde: { anio: desdeHoy.getFullYear(), mes: desdeHoy.getMonth() + 1 },
        hasta: { anio: anioActual, mes: mesActual },
      }
    }
    const ultimo = history.por_mes[history.por_mes.length - 1]
    const desdeMes = new Date(ultimo.anio, ultimo.mes - 12, 1)
    return {
      desde: { anio: desdeMes.getFullYear(), mes: desdeMes.getMonth() + 1 },
      hasta: { anio: ultimo.anio, mes: ultimo.mes },
    }
  }, [history, rangoHist, anioActual, mesActual])

  const moverHist = (dir: 1 | -1) => {
    const desde = new Date(rangoResuelto.desde.anio, rangoResuelto.desde.mes - 1 + 12 * dir, 1)
    const hasta = new Date(rangoResuelto.hasta.anio, rangoResuelto.hasta.mes - 1 + 12 * dir, 1)
    setRangoHist({
      desde: { anio: desde.getFullYear(), mes: desde.getMonth() + 1 },
      hasta: { anio: hasta.getFullYear(), mes: hasta.getMonth() + 1 },
    })
  }

  const subtituloSemanal = `${format(
    weekly?.semana_inicio ? new Date(weekly.semana_inicio + "T00:00:00") : semanaInicio,
    "d MMM",
    { locale: es },
  )} – ${format(
    weekly?.semana_fin ? new Date(weekly.semana_fin + "T00:00:00") : semanaInicio,
    "d MMM yyyy",
    { locale: es },
  )}`
  const subtituloMensual = `Bloques del mes · ${MES_TITULO(mesView.mes, mesView.anio)}`
  const subtituloAnual = `Totales por mes · ${anioView}`
  const subtituloHistorico = `${MES_TITULO(rangoResuelto.desde.mes, rangoResuelto.desde.anio)} – ${MES_TITULO(rangoResuelto.hasta.mes, rangoResuelto.hasta.anio)}`
  const subtituloDistMes = `Distribución por fuente · ${MES_TITULO(distMes.mes, distMes.anio)}`
  const subtituloDistAnio = `Distribución por fuente · ${distAnio}`

  const fuentesSemana = weekly
    ? fuentesUnicas(weekly.dias.flatMap((dia) => dia.por_fuente))
    : []

  const tablaSemanal = weekly ? (
    <TablaDatos
      caption={`Datos del gráfico semanal: ${subtituloSemanal}`}
      columnas={[...fuentesSemana.map((f) => f.alias), "Total del día"]}
      filas={weekly.dias.map((dia) => ({
        encabezado: formatearFechaEs(dia.fecha),
        celdas: [
          ...fuentesSemana.map((fuente) =>
            formatBs(
              dia.por_fuente.find((f) => f.fuente_id === fuente.fuente_id)?.total_centavos ?? 0,
            ),
          ),
          formatBs(dia.total_centavos),
        ],
      }))}
    />
  ) : undefined

  const tablaMensual = monthly ? (
    <TablaDatos
      caption={`Datos del gráfico mensual: ${subtituloMensual}`}
      columnas={["Total"]}
      filas={filasBloques(monthly).map((bloque) => ({
        encabezado: bloque.nombre,
        celdas: [formatBs(bloque.total_centavos)],
      }))}
    />
  ) : undefined

  const tablaAnual = yearly ? (
    <TablaDatos
      caption={`Datos del gráfico anual: ${subtituloAnual}`}
      columnas={["Total"]}
      filas={filasMeses(yearly).map((mes) => ({
        encabezado: `${mes.nombre} ${yearly.anio}`,
        celdas: [formatBs(mes.total_centavos)],
      }))}
    />
  ) : undefined

  const tablaHistorico =
    history && history.por_mes.length > 0
      ? tablaHistoricoRango(
          history,
          `Datos del gráfico histórico: ${subtituloHistorico}`,
          rangoResuelto.desde,
          rangoResuelto.hasta,
        )
      : undefined

  const tablaDistMes = distribucionMes
    ? tablaDistribucion(distribucionMes, `Datos de la distribución del mes: ${subtituloDistMes}`)
    : undefined
  const tablaDistAnio = distribucionAnio
    ? tablaDistribucion(distribucionAnio, `Datos de la distribución del año: ${subtituloDistAnio}`)
    : undefined

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Montos por día trabajado y su distribución por fuente.
        </p>
      </header>

      {/* Cards resumen: sólo 30 días e histórico (R2), sin mes/año. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CardResumen
          titulo="Total últimos 30 días"
          valor={formatBs(summary?.total_30d_centavos ?? 0)}
          detalle="Incluye hoy · zona La Paz"
          icono={<CircleDollarSign />}
          loading={summaryLoading}
        />
        <CardResumen
          titulo="Total histórico"
          valor={formatBs(summary?.total_historico_centavos ?? 0)}
          detalle="Todo el historial registrado"
          icono={<Clock3 />}
          loading={summaryLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          titulo="Semanal"
          subtitulo={subtituloSemanal}
          descripcion={`Totales diarios apilados por fuente durante ${subtituloSemanal}. La leyenda identifica cada fuente por nombre, color y patrón; los mismos datos están en la tabla siguiente.`}
          tabla={tablaSemanal}
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
          subtitulo={subtituloMensual}
          descripcion={`Totales por bloques de días del mes. ${subtituloMensual}. Los mismos datos están disponibles en la tabla siguiente.`}
          tabla={tablaMensual}
          onPrev={() =>
            setMesView((v) => {
              const d = subMonths(new Date(v.anio, v.mes - 1, 1), 1)
              return { mes: d.getMonth() + 1, anio: d.getFullYear() }
            })
          }
          onNext={() =>
            setMesView((v) => {
              const d = addMonths(new Date(v.anio, v.mes - 1, 1), 1)
              return { mes: d.getMonth() + 1, anio: d.getFullYear() }
            })
          }
        >
          {monthlyLoading || !monthly ? (
            <Skeleton className="h-[240px] w-full" />
          ) : (
            <MonthlyChart data={monthly} />
          )}
        </ChartCard>

        <ChartCard
          titulo="Anual"
          subtitulo={subtituloAnual}
          descripcion={`Totales por mes del año. ${subtituloAnual}. Los mismos datos están disponibles en la tabla siguiente.`}
          tabla={tablaAnual}
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
          subtitulo={subtituloHistorico}
          descripcion={`Evolución mensual de los totales. ${subtituloHistorico}. Los mismos datos están disponibles en la tabla siguiente.`}
          tabla={tablaHistorico}
          onPrev={() => moverHist(-1)}
          onNext={() => moverHist(1)}
        >
          {historyLoading || !history ? (
            <Skeleton className="h-[240px] w-full" />
          ) : (
            <HistoryChart data={history} desde={rangoResuelto.desde} hasta={rangoResuelto.hasta} />
          )}
        </ChartCard>

        <ChartCard
          titulo="Distribución del mes"
          subtitulo={subtituloDistMes}
          descripcion={`Porcentaje del total de cada fuente en el mes. ${subtituloDistMes}. La leyenda muestra nombre, monto y porcentaje; los mismos datos están en la tabla siguiente.`}
          tabla={tablaDistMes}
          onPrev={() =>
            setDistMes((v) => {
              const d = subMonths(new Date(v.anio, v.mes - 1, 1), 1)
              return { mes: d.getMonth() + 1, anio: d.getFullYear() }
            })
          }
          onNext={() =>
            setDistMes((v) => {
              const d = addMonths(new Date(v.anio, v.mes - 1, 1), 1)
              return { mes: d.getMonth() + 1, anio: d.getFullYear() }
            })
          }
        >
          {distribucionMesLoading || !distribucionMes ? (
            <Skeleton className="h-[240px] w-full" />
          ) : (
            <DistributionPie data={distribucionMes} prefijo="dist-mes" />
          )}
        </ChartCard>

        <ChartCard
          titulo="Distribución del año"
          subtitulo={subtituloDistAnio}
          descripcion={`Porcentaje del total de cada fuente en el año. ${subtituloDistAnio}. La leyenda muestra nombre, monto y porcentaje; los mismos datos están en la tabla siguiente.`}
          tabla={tablaDistAnio}
          onPrev={() => setDistAnio((a) => subYears(new Date(a, 0, 1), 1).getFullYear())}
          onNext={() => setDistAnio((a) => addYears(new Date(a, 0, 1), 1).getFullYear())}
        >
          {distribucionAnioLoading || !distribucionAnio ? (
            <Skeleton className="h-[240px] w-full" />
          ) : (
            <DistributionPie data={distribucionAnio} prefijo="dist-anio" />
          )}
        </ChartCard>
      </div>
    </div>
  )
}
