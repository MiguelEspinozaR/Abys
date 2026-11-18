/**
 * Distribución equitativa de un total (centavos) entre N días trabajados.
 *
 * Espeja la semántica de `backend/internal/splitcalc` (`aplicarModo`):
 *   - `redondeado`: half-up a 1 Bs (100 centavos)
 *   - `enteros`:    truncado a 1 Bs (100 centavos)
 *   - `preciso`:    centavo exacto
 *
 * La base se calcula sobre `floor(total / n)` y el último día absorbe el
 * residuo (`total - base * (n - 1)`), de modo que la suma sea exactamente el
 * total. Si el redondeo hacia arriba dejara al último día en negativo (totales
 * muy pequeños respecto de N), la base se ajusta al múltiplo del paso que cabe
 * en los días restantes: se conserva Σ === total y último >= 0.
 */

export const MODOS_DISTRIBUCION = [
  { value: "redondeado", label: "Redondeado (1 Bs)" },
  { value: "enteros", label: "Enteros (1 Bs)" },
  { value: "preciso", label: "Preciso (centavos)" },
] as const

export type ModoDistribucion = (typeof MODOS_DISTRIBUCION)[number]["value"]

/** Aplica el modo de redondeo de `splitcalc` a un monto en centavos. */
export function aplicarModo(raw: number, modo: ModoDistribucion): number {
  switch (modo) {
    case "redondeado":
      return Math.floor((raw + 50) / 100) * 100
    case "enteros":
      return Math.floor(raw / 100) * 100
    case "preciso":
      return raw
  }
}

/**
 * Reparte `totalCents` entre `n` días. Devuelve exactamente `n` montos en
 * centavos cuya suma es `totalCents`; el último absorbe el sobrante.
 */
export function distribuir(
  totalCents: number,
  n: number,
  modo: ModoDistribucion,
): number[] {
  if (!Number.isInteger(totalCents) || totalCents < 0) {
    throw new Error("el total debe ser un entero de centavos >= 0")
  }
  if (!Number.isInteger(n) || n < 1) {
    throw new Error("la cantidad de días debe ser un entero >= 1")
  }
  if (n === 1) return [totalCents]

  const baseRaw = Math.floor(totalCents / n)
  let base = aplicarModo(baseRaw, modo)

  // El redondeo half-up puede exceder el total cuando n > 1; se baja la base al
  // múltiplo del paso que cabe en los días restantes (residuo al último día).
  if (base * (n - 1) > totalCents) {
    const paso = modo === "preciso" ? 1 : 100
    base = Math.floor(totalCents / (n - 1) / paso) * paso
  }

  const montos = new Array<number>(n).fill(base)
  montos[n - 1] = totalCents - base * (n - 1)
  return montos
}
