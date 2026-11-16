export type ChartPatternTipo = "semanal" | "mensual" | "anual"

interface ChartPatternsProps {
  tipo: ChartPatternTipo
  /** Colores del tema resueltos por useChartColors. */
  colores: Record<string, string>
}

const FALLBACK = "#888888"

/**
 * Patrón SVG estático para diferenciar las barras sin depender del color.
 * Cada gráfico renderiza solo su patrón, de modo que los ids fijos
 * (`patron-semanal`, `patron-mensual`, `patron-anual`) sean únicos en el DOM.
 */
export function ChartPatterns({ tipo, colores }: ChartPatternsProps) {
  const fondo = colores.background || FALLBACK

  if (tipo === "semanal") {
    return (
      <defs>
        <pattern
          id="patron-semanal"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="8" height="8" fill={colores["chart-1"] || FALLBACK} />
          <line x1="0" y1="0" x2="0" y2="8" stroke={fondo} strokeWidth="2" />
        </pattern>
      </defs>
    )
  }

  if (tipo === "mensual") {
    return (
      <defs>
        <pattern id="patron-mensual" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill={colores["chart-2"] || FALLBACK} />
          <circle cx="4" cy="4" r="1.4" fill={fondo} />
        </pattern>
      </defs>
    )
  }

  return (
    <defs>
      <pattern id="patron-anual" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill={colores["chart-3"] || FALLBACK} />
        <line x1="0" y1="3" x2="6" y2="3" stroke={fondo} strokeWidth="1.5" />
      </pattern>
    </defs>
  )
}
