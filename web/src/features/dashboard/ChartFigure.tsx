interface ChartFigureProps {
  /** id del título visible del gráfico (CardTitle). */
  titleId: string
  /** id único para la descripción sr-only. */
  descriptionId: string
  descripcion?: string
  /** Tabla alternativa sr-only con los mismos datos del gráfico. */
  tabla?: React.ReactNode
  children: React.ReactNode
}

/**
 * Asocia el gráfico con su título visible y una descripción accesible.
 * No usa role="img": la tabla alternativa debe seguir expuesta al árbol a11y.
 */
export function ChartFigure({
  titleId,
  descriptionId,
  descripcion,
  tabla,
  children,
}: ChartFigureProps) {
  return (
    <figure
      className="m-0"
      aria-labelledby={titleId}
      aria-describedby={descripcion ? descriptionId : undefined}
    >
      {descripcion && (
        <p id={descriptionId} className="sr-only">
          {descripcion}
        </p>
      )}
      {children}
      {tabla}
    </figure>
  )
}
