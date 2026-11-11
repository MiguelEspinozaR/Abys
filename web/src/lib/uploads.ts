/**
 * Validación de archivos subidos (SPEC forms-a11y R5, D4/D18).
 *
 * El límite de 10 MB coincide con el default `MaxUploadSize` del backend
 * (`backend/internal/config/config.go`); si esa configuración cambia, la
 * constante debe actualizarse en el mismo cambio (D4).
 *
 * `validarArchivo` es una función pura: recibe el tipo y tamaño del archivo
 * (por eso acepta un `File` o un objeto equivalente) y devuelve el mensaje de
 * error en español o `null` si el archivo es válido. No toca red ni DOM.
 */

/** Tamaño máximo permitido para comprobantes, logos y QR. */
export const MAX_UPLOAD_MB = 10
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

/** Tipos MIME permitidos, exactos (R5.3). */
export const TIPOS_PERMITIDOS = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const

export type TipoPermitido = (typeof TIPOS_PERMITIDOS)[number]

/** Atributo `accept` de los inputs de archivo (R5.3). */
export const ACCEPT_UPLOAD = TIPOS_PERMITIDOS.join(",")

/** Datos mínimos necesarios para validar un archivo. */
export interface ArchivoSeleccionado {
  type: string
  size: number
}

const MENSAJE_TIPO =
  "El archivo debe ser una imagen PNG, JPG, WEBP o GIF."
const MENSAJE_TAMANIO = `El archivo debe pesar como máximo ${MAX_UPLOAD_MB} MB.`

/** Devuelve el error de validación o `null` si el archivo es aceptable (R5.1). */
export function validarArchivo(archivo: ArchivoSeleccionado): string | null {
  if (!TIPOS_PERMITIDOS.includes(archivo.type as TipoPermitido)) {
    return MENSAJE_TIPO
  }
  if (archivo.size > MAX_UPLOAD_BYTES) {
    return MENSAJE_TAMANIO
  }
  return null
}
