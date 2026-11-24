/**
 * Clasificación pura de errores de carga de la SPA (SPEC pagina-error-personalizada R3).
 *
 * Solo se inspecciona el texto del error; nunca se devuelve `stack`, una URL del
 * chunk ni ningún otro detalle interno. El módulo no importa React ni toca la red.
 */

import { MENSAJE_ERROR_GENERICO } from "@/lib/api-errors"

const PATRONES_ERROR_DE_CHUNK = [
  "Failed to fetch dynamically imported module",
  "Importing a module script failed",
  "ChunkLoadError",
] as const

/** Extrae únicamente `message`, sin `stack` ni propiedades arbitrarias. */
function textoDelError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  if (typeof error === "object" && error !== null && "message" in error) {
    const mensaje = (error as { message: unknown }).message
    if (typeof mensaje === "string") return mensaje
  }
  return ""
}

/**
 * Detecta fallos de carga del grafo de módulos (chunk obsoleto tras un deploy,
 * script de módulo no importable o error explícito de chunk).
 */
export function esErrorDeChunk(error: unknown): boolean {
  const mensaje = textoDelError(error)
  return PATRONES_ERROR_DE_CHUNK.some((patron) => mensaje.includes(patron))
}

/** Copy seguro y aprobado, listo para pintar en la pantalla de error. */
export function mensajeErrorCarga(error: unknown): {
  titulo: string
  descripcion: string
} {
  if (esErrorDeChunk(error)) {
    return {
      titulo: "No se pudo cargar esta sección",
      descripcion:
        "Es posible que la aplicación se haya actualizado mientras esta pestaña estaba abierta. Vuelve a intentarlo.",
    }
  }

  return {
    titulo: "Algo salió mal",
    descripcion: MENSAJE_ERROR_GENERICO,
  }
}
