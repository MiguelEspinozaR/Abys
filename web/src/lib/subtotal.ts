import type { Transaccion } from "@/services/types"

/**
 * Subtotal (en centavos) de las transacciones marcadas.
 *
 * Función pura: no filtra por `realizado` ni persiste nada. La lista que se
 * recibe ya debe contener solo las transacciones pendientes que se quieren
 * considerar; los ids que no estén en `seleccionadas` se ignoran.
 */
export function sumaMontosSeleccionados(
  txs: Transaccion[],
  seleccionadas: ReadonlySet<number>,
): number {
  let total = 0
  for (const tx of txs) {
    if (seleccionadas.has(tx.id)) {
      total += tx.monto_enteros
    }
  }
  return total
}
