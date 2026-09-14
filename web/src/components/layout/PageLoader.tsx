import { Loader2 } from "lucide-react"

export function PageLoader() {
  return (
    <div className="flex h-full min-h-[40vh] items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
      <span className="sr-only">Cargando…</span>
    </div>
  )
}