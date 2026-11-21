import { formatBs } from "@/lib/format"
import type { Cuenta } from "@/services/types"
import type { ResultadoRealizacion } from "./realizarSeleccionados"

/** Texto del paso de confirmación: cantidad y monto agregado ya formateado. */
export function textoConfirmacion(cantidad: number, subtotal: number): string {
  return `Marcar ${cantidad} transferencias por ${formatBs(subtotal)}?`
}

/** Ids que deben reenviarse en un segundo intento (solo los fallidos). */
export function idsParaReintento(resultado: ResultadoRealizacion): number[] {
  return resultado.fallidos.map((fallido) => fallido.id)
}

/** La acción existe solo con selección y nunca en la cuenta General informativa. */
export function puedeRealizar(
  cuenta: Pick<Cuenta, "es_general">,
  seleccionadas: ReadonlySet<number>,
): boolean {
  return seleccionadas.size > 0 && cuenta.es_general !== true
}
