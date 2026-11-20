/**
 * Normalización de settings con fallback local (D4, AC7/AC8).
 *
 * Precedencia: el backend manda cuando responde; el valor local (`abys-ui`) se
 * usa solo si la respuesta falta, no es JSON válido o trae valores fuera del
 * dominio. Las funciones son puras: no leen localStorage ni hacen requests.
 */

import type {
  MetodoPago,
  ModoRegistro,
  RegistrarSettings,
  SplitSettings,
} from "@/services/types"

/** Dominio exacto de `metodo_default` (espejo de la whitelist del backend). */
export const METODOS_PAGO_VALIDOS: readonly MetodoPago[] = [
  "efectivo",
  "qr",
  "transaccion",
]

/** Dominio exacto de `modo_default` de registro (sin "truncado", R4.4). */
export const MODOS_REGISTRO_VALIDOS: readonly ModoRegistro[] = [
  "detallado",
  "distribuido",
]

/** Dominio exacto del modo de redondeo de splits (R4.4). */
export const MODOS_REDONDEO_VALIDOS: readonly SplitSettings["modo_default"][] = [
  "redondeado",
  "enteros",
  "preciso",
]

function esUnoDe<T extends string>(
  valor: unknown,
  dominio: readonly T[],
): valor is T {
  return typeof valor === "string" && dominio.includes(valor as T)
}

/** true si `raw` pertenece al dominio de métodos de pago. */
export function esMetodoPago(raw: unknown): raw is MetodoPago {
  return esUnoDe(raw, METODOS_PAGO_VALIDOS)
}

/** true si `raw` pertenece al dominio de modos de registro. */
export function esModoRegistro(raw: unknown): raw is ModoRegistro {
  return esUnoDe(raw, MODOS_REGISTRO_VALIDOS)
}

/** true si `raw` pertenece al dominio de modos de redondeo. */
export function esModoRedondeo(raw: unknown): raw is SplitSettings["modo_default"] {
  return esUnoDe(raw, MODOS_REDONDEO_VALIDOS)
}

/**
 * Valida campo por campo: un valor inválido se sustituye solo por su homólogo
 * local, preservando el otro campo si era válido. Un `raw` no-objeto (null,
 * undefined, array, string, número) devuelve directamente el local.
 */
export function normalizarRegistrarSettings(
  raw: unknown,
  local: RegistrarSettings,
): RegistrarSettings {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return local
  const objeto = raw as Record<string, unknown>
  return {
    metodo_default: esMetodoPago(objeto.metodo_default)
      ? objeto.metodo_default
      : local.metodo_default,
    modo_default: esModoRegistro(objeto.modo_default)
      ? objeto.modo_default
      : local.modo_default,
  }
}

/** Devuelve `raw` si es un modo válido; si no, el modo local. */
export function normalizarModoRedondeo(
  raw: unknown,
  local: SplitSettings["modo_default"],
): SplitSettings["modo_default"] {
  return esModoRedondeo(raw) ? raw : local
}
