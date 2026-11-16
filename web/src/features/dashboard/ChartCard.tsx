import { useId } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChartFigure } from "./ChartFigure"

interface ChartCardProps {
  titulo: string
  subtitulo?: string
  /** Descripción accesible del gráfico; se anuncia y se asocia con aria-describedby. */
  descripcion?: string
  /** Tabla alternativa sr-only con los mismos datos del gráfico. */
  tabla?: React.ReactNode
  onPrev?: () => void
  onNext?: () => void
  canPrev?: boolean
  canNext?: boolean
  children: React.ReactNode
  className?: string
}

export function ChartCard({
  titulo,
  subtitulo,
  descripcion,
  tabla,
  onPrev,
  onNext,
  canPrev = true,
  canNext = true,
  children,
  className,
}: ChartCardProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const titleId = `chart-${uid}-titulo`
  const descriptionId = `chart-${uid}-desc`

  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <div className="min-w-0">
          <CardTitle id={titleId} className="text-sm font-medium">
            {titulo}
          </CardTitle>
          {subtitulo && (
            <p className="truncate text-xs text-muted-foreground">{subtitulo}</p>
          )}
        </div>
        {(onPrev || onNext) && (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 max-md:min-h-11 max-md:min-w-11"
              onClick={onPrev}
              disabled={!canPrev}
              aria-label={`Anterior: ${titulo}`}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 max-md:min-h-11 max-md:min-w-11"
              onClick={onNext}
              disabled={!canNext}
              aria-label={`Siguiente: ${titulo}`}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ChartFigure
          titleId={titleId}
          descriptionId={descriptionId}
          descripcion={descripcion}
          tabla={tabla}
        >
          {children}
        </ChartFigure>
      </CardContent>
    </Card>
  )
}
