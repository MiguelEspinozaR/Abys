import { useEffect, useState } from "react"
import { Eraser, FilterX } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useFuentes, usePagos } from "@/services/hooks"
import { METODOS_PAGO } from "@/lib/format"
import { PagoFila } from "./PagoFila"

interface Filtros {
  fecha_inicio: string
  fecha_fin: string
  fuente_id: string
  metodo_pago: string
}

const FILTROS_VACIOS: Filtros = {
  fecha_inicio: "",
  fecha_fin: "",
  fuente_id: "",
  metodo_pago: "",
}

export default function IngresosPage() {
  const { data: fuentes } = useFuentes()
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS)
  const [aplicados, setAplicados] = useState<Filtros>(FILTROS_VACIOS)
  const [page, setPage] = useState(1)

  useEffect(() => setPage(1), [aplicados])

  const { data, isLoading, isFetching } = usePagos({
    fecha_inicio: aplicados.fecha_inicio || undefined,
    fecha_fin: aplicados.fecha_fin || undefined,
    fuente_id: aplicados.fuente_id ? Number(aplicados.fuente_id) : undefined,
    metodo_pago: aplicados.metodo_pago || undefined,
    page,
    page_size: 100,
  })

  const pagos = data?.data ?? []
  const meta = data?.meta

  // Agrupar por año (desc)
  const grupos = new Map<number, typeof pagos>()
  for (const p of pagos) {
    const anio = Number(p.fecha_pago.slice(0, 4))
    const arr = grupos.get(anio) ?? []
    arr.push(p)
    grupos.set(anio, arr)
  }
  const anios = [...grupos.keys()].sort((a, b) => b - a)

  const hayFiltros =
    aplicados.fecha_inicio !== "" || aplicados.fecha_fin !== "" ||
    aplicados.fuente_id !== "" || aplicados.metodo_pago !== ""

  const aplicar = () => setAplicados({ ...filtros })
  const limpiar = () => {
    setFiltros(FILTROS_VACIOS)
    setAplicados(FILTROS_VACIOS)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Ingresos</h1>
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Cargando pagos…" : `${meta?.total ?? pagos.length} pagos registrados`}
        </p>
      </header>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <FilterX className="size-4 text-muted-foreground" aria-hidden />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="fi">Desde</Label>
              <Input
                id="fi"
                type="date"
                value={filtros.fecha_inicio}
                onChange={(e) => setFiltros((f) => ({ ...f, fecha_inicio: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ff">Hasta</Label>
              <Input
                id="ff"
                type="date"
                value={filtros.fecha_fin}
                onChange={(e) => setFiltros((f) => ({ ...f, fecha_fin: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fuente">Fuente</Label>
              <Select
                value={filtros.fuente_id}
                onValueChange={(v) => setFiltros((f) => ({ ...f, fuente_id: v }))}
              >
                <SelectTrigger id="fuente" className="w-full">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  {fuentes?.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.alias}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="metodo">Método</Label>
              <Select
                value={filtros.metodo_pago}
                onValueChange={(v) => setFiltros((f) => ({ ...f, metodo_pago: v }))}
              >
                <SelectTrigger id="metodo" className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  {METODOS_PAGO.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={aplicar} disabled={isFetching}>
              Aplicar
            </Button>
            <Button size="sm" variant="outline" onClick={limpiar} disabled={!hayFiltros}>
              <Eraser className="mr-1.5 size-3.5" aria-hidden />
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Listado agrupado */}
      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Cargando…</p>
      ) : grupos.size === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">No hay pagos que coincidan con los criterios.</p>
          <p className="text-xs text-muted-foreground/70">Ajusta los filtros o registra un nuevo pago.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {anios.map((anio) => (
            <section key={anio} aria-label={`Pagos de ${anio}`}>
              <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold tracking-tight">
                {anio}
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {grupos.get(anio)!.length}
                </span>
              </h2>
              <Card className="overflow-hidden">
                <div className="divide-y divide-border">
                  {grupos.get(anio)!.map((pago) => (
                    <PagoFila key={pago.id} pago={pago} />
                  ))}
                </div>
              </Card>
            </section>
          ))}
        </div>
      )}

      {/* Paginación */}
      {meta && meta.total_pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Página {meta.page} de {meta.total_pages}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= meta.total_pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}