/**
 * Barra de filtros compartida por `/ingresos` y `/splits`.
 *
 * Presets de rango como botones toggle (`aria-pressed`) dentro de un
 * `fieldset`/`legend`; Desde/Hasta solo en `custom`; fuente y método con
 * selects nativos de la app. Los errores de validación se muestran inline con
 * `aria-invalid` + `aria-describedby`.
 *
 * Sin dependencias nuevas y sin romper el layout existente.
 */

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
import { cn } from "@/lib/utils"
import { METODOS_PAGO } from "@/lib/format"
import type { ErroresFiltros, FiltrosUrl } from "@/lib/filtrosUrl"
import type { RangoPreset } from "@/lib/rango"
import type { Fuente } from "@/services/types"

const PRESETS: { value: RangoPreset; label: string }[] = [
  { value: "ytd", label: "Año actual" },
  { value: "365", label: "Últimos 365 días" },
  { value: "anio", label: "Todo el histórico" },
  { value: "custom", label: "Personalizado" },
]

const TODAS_LAS_FUENTES = "todas"
const TODOS_LOS_METODOS = "todos"

export interface FiltrosRangoProps {
  /** Prefijo único para ids (`ingresos`/`splits`). */
  idPrefijo: string
  filtros: FiltrosUrl
  onCambiar: (filtros: FiltrosUrl) => void
  /** Devuelve los errores inline; vacío si la URL se aplicó. */
  onAplicar: () => ErroresFiltros
  onLimpiar: () => void
  errores: ErroresFiltros
  fuentes?: Fuente[]
  deshabilitado?: boolean
  hayFiltros?: boolean
}

export function FiltrosRango({
  idPrefijo,
  filtros,
  onCambiar,
  onAplicar,
  onLimpiar,
  errores,
  fuentes,
  deshabilitado = false,
  hayFiltros = false,
}: FiltrosRangoProps) {
  const esCustom = filtros.rango === "custom"
  const idDesde = `${idPrefijo}-desde`
  const idDesdeError = `${idDesde}-error`
  const idHasta = `${idPrefijo}-hasta`
  const idHastaError = `${idHasta}-error`
  const idFuente = `${idPrefijo}-fuente`
  const idMetodo = `${idPrefijo}-metodo`

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <FilterX className="size-4 text-muted-foreground" aria-hidden />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent>
        <fieldset className="min-w-0 space-y-2">
          <legend className="mb-2 text-sm font-medium">Rango</legend>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => {
              const activo = filtros.rango === preset.value
              return (
                <button
                  key={preset.value}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => onCambiar({ ...filtros, rango: preset.value })}
                  className={cn(
                    "inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors max-md:min-h-11",
                    "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
                    activo
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </fieldset>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {esCustom && (
            <>
              <div className="space-y-1">
                <Label htmlFor={idDesde}>Desde</Label>
                <Input
                  id={idDesde}
                  type="date"
                  value={filtros.desde ?? ""}
                  aria-invalid={errores.desde ? true : undefined}
                  aria-describedby={errores.desde ? idDesdeError : undefined}
                  onChange={(e) => onCambiar({ ...filtros, desde: e.target.value })}
                />
                {errores.desde && (
                  <p id={idDesdeError} className="text-xs text-destructive">
                    {errores.desde}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor={idHasta}>Hasta</Label>
                <Input
                  id={idHasta}
                  type="date"
                  value={filtros.hasta ?? ""}
                  aria-invalid={errores.hasta ? true : undefined}
                  aria-describedby={errores.hasta ? idHastaError : undefined}
                  onChange={(e) => onCambiar({ ...filtros, hasta: e.target.value })}
                />
                {errores.hasta && (
                  <p id={idHastaError} className="text-xs text-destructive">
                    {errores.hasta}
                  </p>
                )}
              </div>
            </>
          )}

          <div className="space-y-1">
            <Label htmlFor={idFuente}>Fuente</Label>
            <Select
              value={filtros.fuente !== undefined ? String(filtros.fuente) : TODAS_LAS_FUENTES}
              onValueChange={(valor) =>
                onCambiar({
                  ...filtros,
                  fuente: valor === TODAS_LAS_FUENTES ? undefined : Number(valor),
                })
              }
            >
              <SelectTrigger id={idFuente} className="w-full">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODAS_LAS_FUENTES}>Todas</SelectItem>
                {fuentes?.map((fuente) => (
                  <SelectItem key={fuente.id} value={String(fuente.id)}>
                    {fuente.alias}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor={idMetodo}>Método</Label>
            <Select
              value={filtros.metodo ?? TODOS_LOS_METODOS}
              onValueChange={(valor) =>
                onCambiar({
                  ...filtros,
                  metodo:
                    valor === TODOS_LOS_METODOS
                      ? undefined
                      : (valor as NonNullable<FiltrosUrl["metodo"]>),
                })
              }
            >
              <SelectTrigger id={idMetodo} className="w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS_LOS_METODOS}>Todos</SelectItem>
                {METODOS_PAGO.map((metodo) => (
                  <SelectItem key={metodo.value} value={metodo.value}>
                    {metodo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => onAplicar()} disabled={deshabilitado}>
            Aplicar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onLimpiar}
            disabled={!hayFiltros}
          >
            <Eraser className="mr-1.5 size-3.5" aria-hidden />
            Limpiar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
