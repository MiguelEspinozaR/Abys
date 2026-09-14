import { useEffect, useState } from "react"
import { useUiStore } from "@/store/uiStore"

/**
 * Lee los colores de chart desde las CSS variables del tema shadcn.
 * Se re-evalúa cuando cambia el tema para que Recharts use los tokens correctos.
 */
export function useChartColors(): Record<string, string> {
  const tema = useUiStore((s) => s.tema)
  const [colores, setColores] = useState<Record<string, string>>({})

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement)
    const nombres = [
      "chart-1",
      "chart-2",
      "chart-3",
      "chart-4",
      "chart-5",
      "primary",
      "muted-foreground",
      "border",
      "background",
    ]
    const next: Record<string, string> = {}
    for (const n of nombres) {
      next[n] = styles.getPropertyValue(`--${n}`).trim() || "#888888"
    }
    setColores(next)
  }, [tema])

  return colores
}