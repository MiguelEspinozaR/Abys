/**
 * Sección colapsable de un año del histórico (SPEC historial-a11y, R3/D7).
 *
 * - El encabezado es un botón nativo con `aria-expanded`/`aria-controls`.
 * - La región existe siempre en el DOM y usa `hidden` cuando está colapsada.
 * - El contenido (y las queries de filas) sólo se monta al expandir.
 * - Count por año cacheado con `page_size=1`; filas con páginas de 500.
 */

import type { ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { FiltrosUrl } from "@/lib/filtrosUrl"
import type { RangoFechas } from "@/lib/rango"
import type { Pago } from "@/services/types"
import { usePagoCount, usePagosPorAnio } from "@/hooks/useHistorial"

export interface SeccionAnioProps {
  /** Prefijo único para ids (`ingresos`/`splits`). */
  idPrefijo: string
  anio: number
  rango: RangoFechas
  filtros: FiltrosUrl
  expandido: boolean
  onToggle: () => void
  renderFila: (pago: Pago) => ReactNode
  /** Filtra las filas visibles del año (p. ej. pagos con split). */
  filtrarFilas?: (pagos: Pago[]) => Pago[]
  /** Texto del estado vacío por año. */
  mensajeVacio?: string
}

export function SeccionAnio({
  idPrefijo,
  anio,
  rango,
  filtros,
  expandido,
  onToggle,
  renderFila,
  filtrarFilas,
  mensajeVacio,
}: SeccionAnioProps) {
  const idTitulo = `${idPrefijo}-anio-${anio}-titulo`
  const idRegion = `${idPrefijo}-anio-${anio}-region`

  const conteo = usePagoCount({ anio, rango, filtros })
  const { pagos, hayMas, cargarMas, isLoading, isFetching } = usePagosPorAnio({
    anio,
    rango,
    filtros,
    expandido,
  })

  const filas = filtrarFilas ? filtrarFilas(pagos) : pagos
  const contador = conteo.isLoading ? "…" : conteo.total
  const vacio = mensajeVacio ?? `Sin pagos en ${anio}`

  return (
    <section className="space-y-2">
      <h2 id={idTitulo} className="text-lg font-semibold tracking-tight">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expandido}
          aria-controls={idRegion}
          className={cn(
            "flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border bg-card px-4 py-2.5 text-left",
            "transition-colors hover:bg-accent/50",
            "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
          )}
        >
          <span className="flex items-center gap-2">
            {anio}
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground/80">
              {contador}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "size-5 shrink-0 text-muted-foreground transition-transform",
              expandido && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      </h2>

      <div
        id={idRegion}
        role="region"
        aria-labelledby={idTitulo}
        aria-busy={expandido && (isLoading || isFetching) ? true : undefined}
        hidden={!expandido}
        className="space-y-2"
      >
        {expandido &&
          (isLoading ? (
            <Card className="space-y-2 p-4" aria-hidden>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </Card>
          ) : (
            <>
              {filas.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{vacio}</p>
              ) : (
                <Card className="gap-2 overflow-hidden md:gap-0 md:divide-y md:divide-border">
                  {filas.map(renderFila)}
                </Card>
              )}

              {hayMas && (
                <div className="flex justify-center pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={cargarMas}
                    disabled={isFetching}
                    aria-busy={isFetching ? true : undefined}
                    className="max-md:min-h-11"
                  >
                    {isFetching ? "Cargando…" : "Cargar más"}
                  </Button>
                </div>
              )}
            </>
          ))}
      </div>
    </section>
  )
}
