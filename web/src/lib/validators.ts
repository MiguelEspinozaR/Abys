/**
 * Validadores puros de formularios (SPEC forms-a11y, R2).
 * Cada validador devuelve el mensaje de error en español (R2.7) o `null` si el valor
 * es válido. No dependen de React ni del DOM: son testeables con Vitest puro.
 * El parser de monto (`bsToCents`) no se modifica (D19).
 */

import { bsToCents, METODOS_PAGO } from "./format"

/** Límite de producto para notas; se aplica solo en el cliente (D9/R2.8). */
export const MAX_NOTAS = 500

export const MODOS_SPLIT = ["preciso", "redondeado", "enteros"] as const
export type ModoSplit = (typeof MODOS_SPLIT)[number]

/** "YYYY-MM-DD" con fecha real (mes/día existentes); fechas futuras permitidas (R2). */
export function esFechaISOValida(fecha: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha)
  if (!m) return false
  const anio = Number(m[1])
  const mes = Number(m[2])
  const dia = Number(m[3])
  const dt = new Date(anio, mes - 1, dia)
  return dt.getFullYear() === anio && dt.getMonth() === mes - 1 && dt.getDate() === dia
}

/** fuente: requerida y debe existir en `fuentes` (R2). */
export function validarFuente(fuenteId: string, idsValidos: Iterable<string>): string | null {
  if (!fuenteId) return "Selecciona una fuente"
  for (const id of idsValidos) {
    if (id === fuenteId) return null
  }
  return "Selecciona una fuente válida"
}

/** fecha_pago: requerida y `YYYY-MM-DD` válida; fechas futuras permitidas (R2). */
export function validarFechaPago(fecha: string): string | null {
  if (!fecha) return "Selecciona la fecha de pago"
  if (!esFechaISOValida(fecha)) return "Ingresa una fecha de pago válida (AAAA-MM-DD)"
  return null
}

/** monto: requerido, parseable en es-BO y mayor a 0 (R2); usa `bsToCents` sin cambiarlo (D19). */
export function validarMonto(montoStr: string): string | null {
  const cents = bsToCents(montoStr)
  if (cents == null) return "Ingresa un monto válido, p. ej. 265,00"
  if (cents <= 0) return "Ingresa un monto mayor a 0"
  return null
}

/** días_trabajados: al menos 1, sin duplicados y con fechas válidas (R2). */
export function validarDiasTrabajados(dias: Iterable<string>): string | null {
  const lista = [...dias]
  if (lista.length === 0) return "Selecciona al menos un día"
  if (new Set(lista).size !== lista.length) return "Hay días repetidos"
  if (lista.some((d) => !esFechaISOValida(d))) return "Hay fechas inválidas en los días trabajados"
  return null
}

/** método: uno de `efectivo`, `qr`, `transaccion` (R2). */
export function validarMetodoPago(metodo: string): string | null {
  if (!METODOS_PAGO.some((m) => m.value === metodo)) return "Selecciona un método de pago"
  return null
}

/** notas: opcionales, máximo 500 caracteres; cubre valores programáticos/OCR (R2.8/R2.9). */
export function validarNotas(notas: string): string | null {
  if (notas.length > MAX_NOTAS) return `Máximo ${MAX_NOTAS} caracteres`
  return null
}

/** alias (fuente/cuenta): requerido, trim no vacío (R2). */
export function validarAlias(alias: string): string | null {
  if (alias.trim() === "") return "El alias es obligatorio"
  return null
}

/** color: hexadecimal válido `#RRGGBB` (R2). */
export function validarColor(color: string): string | null {
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    return "Ingresa un color hexadecimal válido, p. ej. #3b82f6"
  }
  return null
}

/** tasa: número entre 0 y 100 (R2); vacío es inválido. */
export function validarTasa(tasa: string): string | null {
  const limpio = tasa.trim()
  const n = Number(limpio.replace(",", "."))
  if (limpio === "" || !Number.isFinite(n)) return "Ingresa una tasa válida entre 0 y 100"
  if (n < 0 || n > 100) return "La tasa debe estar entre 0 y 100"
  return null
}

/** modo de split (Generar split): uno de `preciso`, `redondeado`, `enteros` (R2). */
export function validarModoSplit(modo: string): string | null {
  if (!MODOS_SPLIT.includes(modo as ModoSplit)) return "Selecciona un modo de cálculo"
  return null
}

/**
 * split_auto_modo (Fuente): opcional; vacío es válido y significa "usar el modo por
 * defecto" (D14/R2). Si se elige un valor, debe ser un modo válido.
 */
export function validarSplitAutoModo(modo: string | null | undefined): string | null {
  const valor = (modo ?? "").trim()
  if (valor === "") return null
  return validarModoSplit(valor)
}
