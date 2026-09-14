import { ChevronLeft, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface ChartCardProps {
  titulo: string
  subtitulo?: string
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
  onPrev,
  onNext,
  canPrev = true,
  canNext = true,
  children,
  className,
}: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <div className="min-w-0">
          <CardTitle className="text-sm font-medium">{titulo}</CardTitle>
          {subtitulo && (
            <p className="truncate text-xs text-muted-foreground">{subtitulo}</p>
          )}
        </div>
        {(onPrev || onNext) && (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={onPrev}
              disabled={!canPrev}
              aria-label={`Anterior: ${titulo}`}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={onNext}
              disabled={!canNext}
              aria-label={`Siguiente: ${titulo}`}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}