export interface TablaDatosFila {
  /** Texto de la primera celda, expuesta como th scope="row". */
  encabezado: string
  /** Celdas de datos ya formateadas (p. ej. con formatBs). */
  celdas: string[]
}

interface TablaDatosProps {
  caption: string
  /** Encabezados de las columnas de datos (sin contar la columna de periodo). */
  columnas: string[]
  filaEncabezado?: string
  filas: TablaDatosFila[]
}

/**
 * Tabla alternativa solo para lectores de pantalla. Recibe los valores ya
 * formateados para que coincidan exactamente con los del gráfico.
 */
export function TablaDatos({
  caption,
  columnas,
  filaEncabezado = "Periodo",
  filas,
}: TablaDatosProps) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{filaEncabezado}</th>
          {columnas.map((columna) => (
            <th key={columna} scope="col">
              {columna}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map((fila, i) => (
          <tr key={`${fila.encabezado}-${i}`}>
            <th scope="row">{fila.encabezado}</th>
            {fila.celdas.map((celda, j) => (
              <td key={j}>{celda}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
