import { idPatron, variantePatron } from "./chartLogic"

export type ChartPatternTipo = "semanal" | "mensual" | "anual"

interface ChartPatternsProps {
  tipo: ChartPatternTipo
  /** Colores del tema resueltos por useChartColors. */
  colores: Record<string, string>
}

const FALLBACK = "#888888"

/**
 * Patrones SVG estáticos para las barras simples (mensual/anual).
 * Los ids fijos son únicos en el DOM porque cada chart renderiza solo el suyo.
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

interface PatronFuenteProps {
  /** Id SVG único (prefijo del chart + fuente_id). */
  id: string
  fuente: { fuente_id: number; color: string }
  colores: Record<string, string>
}

/**
 * Patrón por fuente: el color configurado de la fuente es el fondo y la forma
 * se perfila con los colores del tema para que se lea sobre cualquier color.
 * La variante depende sólo de `fuente_id` (determinista, estable entre charts).
 */
export function PatronFuente({ id, fuente, colores }: PatronFuenteProps) {
  const fondo = colores.background || "#ffffff"
  const contraste = colores.foreground || colores["muted-foreground"] || "#111111"
  const color = fuente.color || FALLBACK
  const variante = variantePatron(fuente.fuente_id)
  const rotation = variante === 0 ? "rotate(45)" : variante === 5 ? "rotate(-45)" : undefined

  return (
    <pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform={rotation}>
      <rect width="10" height="10" fill={color} />
      {variante === 0 || variante === 5 ? (
        <>
          <line x1="0" y1="0" x2="0" y2="10" stroke={contraste} strokeWidth="4" />
          <line x1="0" y1="0" x2="0" y2="10" stroke={fondo} strokeWidth="2" />
        </>
      ) : null}
      {variante === 1 ? (
        <>
          <circle cx="3" cy="3" r="3" fill={contraste} />
          <circle cx="3" cy="3" r="1.7" fill={fondo} />
          <circle cx="8" cy="8" r="2" fill={fondo} />
        </>
      ) : null}
      {variante === 2 ? (
        <>
          <line x1="0" y1="0" x2="10" y2="0" stroke={contraste} strokeWidth="4" />
          <line x1="0" y1="0" x2="10" y2="0" stroke={fondo} strokeWidth="2" />
          <line x1="0" y1="6" x2="10" y2="6" stroke={fondo} strokeWidth="1.5" />
        </>
      ) : null}
      {variante === 3 ? (
        <>
          <line x1="0" y1="0" x2="0" y2="10" stroke={contraste} strokeWidth="3.5" />
          <line x1="0" y1="0" x2="0" y2="10" stroke={fondo} strokeWidth="1.6" />
          <line x1="0" y1="0" x2="10" y2="0" stroke={contraste} strokeWidth="3.5" />
          <line x1="0" y1="0" x2="10" y2="0" stroke={fondo} strokeWidth="1.6" />
        </>
      ) : null}
      {variante === 4 ? (
        <>
          <rect x="1" y="1" width="4" height="4" fill={fondo} stroke={contraste} strokeWidth="1" />
          <rect x="6" y="6" width="3" height="3" fill={fondo} stroke={contraste} strokeWidth="1" />
        </>
      ) : null}
    </pattern>
  )
}

interface ChartSourcePatternsProps {
  fuentes: { fuente_id: number; color: string }[]
  colores: Record<string, string>
  /** Prefijo único del chart para evitar ids SVG duplicados en el documento. */
  prefijo: string
}

/** Defs con un patrón por fuente, keyed por `fuente_id`. */
export function ChartSourcePatterns({ fuentes, colores, prefijo }: ChartSourcePatternsProps) {
  return (
    <defs>
      {fuentes.map((fuente) => (
        <PatronFuente
          key={fuente.fuente_id}
          id={idPatron(prefijo, fuente.fuente_id)}
          fuente={fuente}
          colores={colores}
        />
      ))}
    </defs>
  )
}
