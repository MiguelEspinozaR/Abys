import { useState } from "react"
import {
  CheckCircle2,
  Database,
  HeartPulse,
  Layers,
  RefreshCw,
  Timer,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useHealth } from "@/services/hooks"

function MetricCard({
  titulo,
  valor,
  icono,
  ok,
}: {
  titulo: string
  valor: string
  icono: React.ReactNode
  ok?: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{titulo}</CardTitle>
        <span className="text-muted-foreground/70 [&_svg]:size-4">{icono}</span>
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        <p className="text-xl font-semibold tabular-nums">{valor}</p>
        {ok !== undefined &&
          (ok ? (
            <CheckCircle2 className="size-4 text-emerald-500" aria-label="OK" />
          ) : (
            <XCircle className="size-4 text-destructive" aria-label="Error" />
          ))}
      </CardContent>
    </Card>
  )
}

export default function HealthPage() {
  const { data, isLoading, isFetching, refetch, isError } = useHealth()
  const [ultimaCarga, setUltimaCarga] = useState<Date | null>(null)

  const refrescar = async () => {
    await refetch()
    setUltimaCarga(new Date())
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Salud del sistema</h1>
          <p className="text-sm text-muted-foreground">
            {ultimaCarga
              ? `Última comprobación: ${ultimaCarga.toLocaleTimeString("es-BO")}`
              : "Métricas en vivo de la base de datos del backend."}
          </p>
        </div>
        <Button onClick={refrescar} disabled={isFetching}>
          <RefreshCw className={`mr-2 size-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden />
          Refrescar
        </Button>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : isError || !data ? (
        <Card>
          <CardContent className="py-10 text-center">
            <HeartPulse className="mx-auto mb-2 size-6 text-destructive" aria-hidden />
            <p className="text-sm font-medium">No se pudo consultar el estado del servidor.</p>
            <p className="text-xs text-muted-foreground">
              Verifica que el backend esté corriendo en http://localhost:8080.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard
              titulo="Conexión"
              valor={data.conexion}
              icono={<Database />}
              ok={data.conexion === "ok"}
            />
            <MetricCard
              titulo="Latencia"
              valor={`${data.latencia_ms.toFixed(2)} ms`}
              icono={<Timer />}
            />
            <MetricCard titulo="Versión PostgreSQL" valor={data.version_pg.split(" ")[0] ?? data.version_pg} icono={<Layers />} />
            <MetricCard titulo="Tamaño de la DB" valor={data.tamano_db} icono={<Database />} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Tablas ({data.tablas.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tabla</TableHead>
                    <TableHead className="text-right">Registros</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.tablas.map((t) => (
                    <TableRow key={t.nombre}>
                      <TableCell className="font-mono text-sm">{t.nombre}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {t.registros.toLocaleString("es-BO")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Badge variant="outline" className="text-muted-foreground">
            PostgreSQL {data.version_pg}
          </Badge>
        </>
      )}
    </div>
  )
}