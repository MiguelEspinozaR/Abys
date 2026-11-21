/**
 * Resultado agregado de una realización múltiple. `ok` y `fallidos` conservan
 * el orden de los ids enviados; la función nunca lanza (D2 acepta fallo parcial).
 */
export interface ResultadoRealizacion {
  ok: number[]
  fallidos: { id: number; mensaje: string }[]
}

/**
 * Marca cada id con `marcar` usando `Promise.allSettled`: una petición por id,
 * sin endpoint bulk. Normaliza errores (Error → `message`, otro → `String`) y
 * devuelve éxitos y fallos en el mismo orden de entrada.
 */
export async function realizarSeleccionados(
  ids: number[],
  marcar: (id: number) => Promise<unknown>,
): Promise<ResultadoRealizacion> {
  const resultados = await Promise.allSettled(ids.map((id) => marcar(id)))
  const ok: number[] = []
  const fallidos: { id: number; mensaje: string }[] = []

  resultados.forEach((resultado, indice) => {
    const id = ids[indice]
    if (resultado.status === "fulfilled") {
      ok.push(id)
      return
    }
    const razon: unknown = resultado.reason
    fallidos.push({
      id,
      mensaje: razon instanceof Error ? razon.message : String(razon),
    })
  })

  return { ok, fallidos }
}
