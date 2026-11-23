/**
 * Normalización de settings con fallback local (D4, AC7/AC8).
 *
 * Precedencia: el backend manda cuando responde; el valor local (`abys-ui`) se
 * usa solo si la respuesta falta, no es JSON válido o trae valores fuera del
 * dominio. Las funciones son puras: no leen localStorage ni hacen requests.
 */

import { esMetodoPago, esModoRedondeo, esModoRegistro } from "@/lib/dominio"
import type { RegistrarSettings, SplitSettings } from "@/services/types"

// Reexportados para los tests y consumidores existentes; la definición única está en dominio.ts.
export {
  METODOS_PAGO_VALIDOS,
  MODOS_REDONDEO_VALIDOS,
  MODOS_REGISTRO_VALIDOS,
  esMetodoPago,
  esModoRedondeo,
  esModoRegistro,
} from "@/lib/dominio"

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
