/**
 * Enumeraciones de dominio del frontend: valores, labels y type guards.
 *
 * PUNTO DE PARIDAD CON EL BACKEND (SPEC refactor-purga-seguridad R5.3/R5.4):
 * cualquier cambio aquí debe replicarse en `backend/internal/service/validations.go`
 * (`MetodosPago`, BR-007), `backend/internal/handler/settings_handler.go`
 * (`registrarMetodosValidos`, `registrarModosValidos`) y
 * `backend/internal/splitcalc/splitcalc.go` (`ModosValidos`, BR-034).
 * Los labels son copy visible: no cambiarlos sin aprobación (política §4).
 */

/** Métodos de pago y sus labels (este orden es el de los selects). */
export const METODOS_PAGO = [
  { value: "efectivo", label: "Efectivo" },
  { value: "qr", label: "QR" },
  { value: "transaccion", label: "Transacción" },
] as const satisfies ReadonlyArray<{ value: string; label: string }>

export type MetodoPago = (typeof METODOS_PAGO)[number]["value"]
export const METODOS_PAGO_VALIDOS: readonly MetodoPago[] = METODOS_PAGO.map((m) => m.value)

/** Modos de carga en /registrar (R3.1/R4.2); sin "truncado" (R4.4). */
export const MODOS_REGISTRO = [
  { value: "detallado", label: "Detallado" },
  { value: "distribuido", label: "Distribuido" },
] as const satisfies ReadonlyArray<{ value: string; label: string }>

export type ModoRegistro = (typeof MODOS_REGISTRO)[number]["value"]
export const MODOS_REGISTRO_VALIDOS: readonly ModoRegistro[] = MODOS_REGISTRO.map((m) => m.value)

/**
 * Modos de redondeo del reparto: tabla de labels del selector de /registrar.
 * El orden (redondeado, enteros, preciso) es el orden visible en esa pantalla
 * y el dominio exacto del settings de split (R4.4).
 */
export const MODOS_DISTRIBUCION = [
  { value: "redondeado", label: "Redondeado (1 Bs)" },
  { value: "enteros", label: "Enteros (1 Bs)" },
  { value: "preciso", label: "Preciso (centavos)" },
] as const satisfies ReadonlyArray<{ value: string; label: string }>

export type ModoDistribucion = (typeof MODOS_DISTRIBUCION)[number]["value"]
export const MODOS_REDONDEO_VALIDOS: readonly ModoDistribucion[] =
  MODOS_DISTRIBUCION.map((m) => m.value)

/**
 * Mismo dominio que `MODOS_DISTRIBUCION`, pero en el orden histórico del
 * validador y del diálogo "Generar split" (preciso primero). Se conserva como
 * lista separada porque ese orden es visible y no debe cambiar (política §4).
 */
export const MODOS_SPLIT = ["preciso", "redondeado", "enteros"] as const satisfies readonly ModoDistribucion[]
export type ModoSplit = (typeof MODOS_SPLIT)[number]

function esUnoDe<T extends string>(valor: unknown, dominio: readonly T[]): valor is T {
  return typeof valor === "string" && dominio.includes(valor as T)
}

export function esMetodoPago(raw: unknown): raw is MetodoPago {
  return esUnoDe(raw, METODOS_PAGO_VALIDOS)
}

export function esModoRegistro(raw: unknown): raw is ModoRegistro {
  return esUnoDe(raw, MODOS_REGISTRO_VALIDOS)
}

export function esModoRedondeo(raw: unknown): raw is ModoDistribucion {
  return esUnoDe(raw, MODOS_REDONDEO_VALIDOS)
}

export function esModoSplit(raw: unknown): raw is ModoSplit {
  return esUnoDe(raw, MODOS_SPLIT)
}

/** Etiqueta visible de un método; el valor crudo se conserva como fallback. */
export function labelMetodo(metodo: string): string {
  return METODOS_PAGO.find((m) => m.value === metodo)?.label ?? metodo
}
