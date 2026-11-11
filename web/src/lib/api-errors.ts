/**
 * Mapeo explícito de errores de API a campos/resumen de formulario (SPEC forms-a11y R3, D5).
 *
 * No se parsean mensajes arbitrarios: la decisión depende solo del `code`/`status` de
 * `ApiRequestError` y de la configuración explícita de cada formulario. El mensaje que
 * muestra la UI es siempre el del backend, tal cual (texto seguro, R3.3); si llegara vacío
 * se usa un mensaje genérico.
 */

import type { ApiRequestError } from "@/services/api"

/** Mensaje de respaldo si el backend no envía uno utilizable. */
export const MENSAJE_ERROR_GENERICO =
  "No se pudo completar la operación. Inténtalo de nuevo."

/**
 * Configuración explícita por formulario. Un campo ausente significa que ese código
 * se muestra en el resumen del formulario (no se adivina por el texto del mensaje).
 */
export interface ConfigErroresApi<Campo extends string> {
  /** Identificador del formulario (diagnóstico; no se usa para decidir el mapeo). */
  formulario: string
  /** Campo destino de `VALIDATION_ERROR` (400). */
  campoValidacion?: Campo
  /** Campo destino de `BUSINESS_RULE_CONFLICT` (409). */
  campoConflicto?: Campo
  /** Campo destino de `IMMUTABLE_DATA` (422). */
  campoInmutable?: Campo
}

/** Resultado listo para pintar el error en un campo o en el resumen (R3.2). */
export interface ErrorApiResuelto<Campo extends string> {
  /** Campo al que pertenece el error; `undefined` => error de formulario/resumen. */
  campo?: Campo
  /** Mensaje del backend tal cual (R3.3). */
  mensaje: string
  /** true para `NETWORK_ERROR`/status 0: el envío puede reintentarse. */
  reintentar: boolean
}

type ErrorApiLike = Pick<ApiRequestError, "code" | "message" | "status">

/**
 * Resuelve un error de API con el mapa del formulario.
 *
 * - `VALIDATION_ERROR` (400) → `campoValidacion` o resumen.
 * - `BUSINESS_RULE_CONFLICT` (409) → `campoConflicto` o resumen.
 * - `IMMUTABLE_DATA` (422) → `campoInmutable` o resumen.
 * - `NETWORK_ERROR` (status 0) → resumen con opción de reintentar.
 * - `INTERNAL_ERROR`/500 y desconocidos → resumen.
 */
export function resolverErrorApi<Campo extends string>(
  error: ErrorApiLike,
  config: ConfigErroresApi<Campo>,
): ErrorApiResuelto<Campo> {
  const mensaje = error.message.trim() !== "" ? error.message : MENSAJE_ERROR_GENERICO

  if (error.status === 0 || error.code === "NETWORK_ERROR") {
    return { mensaje, reintentar: true }
  }
  if (error.status === 400 || error.code === "VALIDATION_ERROR") {
    return { campo: config.campoValidacion, mensaje, reintentar: false }
  }
  if (error.status === 409 || error.code === "BUSINESS_RULE_CONFLICT") {
    return { campo: config.campoConflicto, mensaje, reintentar: false }
  }
  if (error.status === 422 || error.code === "IMMUTABLE_DATA") {
    return { campo: config.campoInmutable, mensaje, reintentar: false }
  }
  return { mensaje, reintentar: false }
}

// ---------------------------------------------------------------------------
// Mapas explícitos por formulario (D5). Solo se asigna un campo cuando el
// formulario tiene un único campo candidato para ese código.
// ---------------------------------------------------------------------------

export type CampoRegistrar =
  | "dias"
  | "fecha"
  | "fuente"
  | "metodo"
  | "monto"
  | "notas"
export type CampoEditarPago = CampoRegistrar
export type CampoFuente = "alias" | "color" | "split_auto_modo"
export type CampoCuenta = "alias"
export type CampoTasa = "tasa"
export type CampoGenerarSplit = "modo"

/**
 * Registrar pago: un 400 puede venir de fuente/fecha/método/notas/días; sin campo
 * seguro en la respuesta se muestra en el resumen en vez de adivinar.
 */
export const ERRORES_API_REGISTRAR: ConfigErroresApi<CampoRegistrar> = {
  formulario: "registrar",
}

/** Editar pago: un 422 es siempre el monto bloqueado por split (R3.2). */
export const ERRORES_API_EDITAR_PAGO: ConfigErroresApi<CampoEditarPago> = {
  formulario: "editar-pago",
  campoInmutable: "monto",
}

/**
 * Fuente: un 400 puede ser alias o modo de split; se mantiene en el resumen para
 * no asignarlo al campo equivocado (D5).
 */
export const ERRORES_API_FUENTE: ConfigErroresApi<CampoFuente> = {
  formulario: "fuente",
}

/** Cuenta: el único 400 de validación del backend es el alias obligatorio. */
export const ERRORES_API_CUENTA: ConfigErroresApi<CampoCuenta> = {
  formulario: "cuenta",
  campoValidacion: "alias",
}

/** Tasa: 400 (rango/General) y 409 (suma > 100%) pertenecen al campo tasa. */
export const ERRORES_API_TASA: ConfigErroresApi<CampoTasa> = {
  formulario: "tasa",
  campoValidacion: "tasa",
  campoConflicto: "tasa",
}

/** Generar split: un error de API se anuncia en el resumen del diálogo. */
export const ERRORES_API_GENERAR_SPLIT: ConfigErroresApi<CampoGenerarSplit> = {
  formulario: "generar-split",
}
