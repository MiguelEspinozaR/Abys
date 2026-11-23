/**
 * Constructor puro de `dias_trabajados` para el payload de /pagos (R4.3/AC9).
 *
 * El modo de redondeo se usa solo para calcular los montos: nunca se añade al
 * objeto enviado. Cada día lleva exclusivamente `fecha` y `monto_enteros`.
 */

import type { DiaTrabajadoInput } from "@/services/types"
import type { ModoDistribucion, ModoRegistro } from "@/lib/dominio"
import { distribuir } from "./distribuir"

export interface ConstruirDiasPayloadArgs {
  modoRegistro: ModoRegistro
  diasOrdenados: readonly string[]
  /** Montos ya convertidos a centavos, en el mismo orden que `diasOrdenados`. */
  montosDetallados: readonly (number | null)[]
  totalDistribuidoCents: number | null
  modoRedondeo: ModoDistribucion
}

export function construirDiasPayload({
  modoRegistro,
  diasOrdenados,
  montosDetallados,
  totalDistribuidoCents,
  modoRedondeo,
}: ConstruirDiasPayloadArgs): DiaTrabajadoInput[] {
  if (modoRegistro === "distribuido") {
    if (diasOrdenados.length === 0 || totalDistribuidoCents == null) return []
    const montos = distribuir(totalDistribuidoCents, diasOrdenados.length, modoRedondeo)
    if (montos.length !== diasOrdenados.length) return []
    return diasOrdenados.map((fecha, i) => ({ fecha, monto_enteros: montos[i] }))
  }

  const dias: DiaTrabajadoInput[] = []
  for (let i = 0; i < diasOrdenados.length; i++) {
    const monto_enteros = montosDetallados[i]
    if (monto_enteros == null) return []
    dias.push({ fecha: diasOrdenados[i], monto_enteros })
  }
  return dias
}
