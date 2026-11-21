import { describe, expect, it } from "vitest"
import { formatBs } from "./format"
import type { Transaccion } from "@/services/types"
import { sumaMontosSeleccionados } from "./subtotal"

function tx(id: number, monto_enteros: number): Transaccion {
  return {
    id,
    split_id: 100,
    cuenta_id: 1,
    alias_snapshot: `Cuenta ${id}`,
    monto_enteros,
    tasa_bps: 2000,
    realizado: false,
    fecha_realizacion: null,
    created_at: "2026-11-20T12:00:00Z",
    updated_at: "2026-11-20T12:00:00Z",
  }
}

describe("sumaMontosSeleccionados", () => {
  it("devuelve 0 con lista vacía o sin selección", () => {
    expect(sumaMontosSeleccionados([], new Set())).toBe(0)
    expect(sumaMontosSeleccionados([tx(1, 500)], new Set())).toBe(0)
  })

  it("suma una sola transacción seleccionada", () => {
    expect(sumaMontosSeleccionados([tx(1, 12345)], new Set([1]))).toBe(12345)
  })

  it("suma solo las transacciones seleccionadas entre varias", () => {
    const txs = [tx(1, 1000), tx(2, 2500), tx(3, 4000)]
    expect(sumaMontosSeleccionados(txs, new Set([1, 3]))).toBe(5000)
    expect(sumaMontosSeleccionados(txs, new Set([1, 2, 3]))).toBe(7500)
  })

  it("descuenta una fila al desmarcarla", () => {
    const txs = [tx(1, 1000), tx(2, 2500)]
    expect(sumaMontosSeleccionados(txs, new Set([1, 2]))).toBe(3500)
    const seleccionadas = new Set([1, 2])
    seleccionadas.delete(2)
    expect(sumaMontosSeleccionados(txs, seleccionadas)).toBe(1000)
  })

  it("suma en centavos sin perder fracciones", () => {
    const txs = [tx(1, 105), tx(2, 207), tx(3, 1)]
    expect(sumaMontosSeleccionados(txs, new Set([1, 2]))).toBe(312)
    expect(sumaMontosSeleccionados(txs, new Set([1, 2, 3]))).toBe(313)
  })

  it("ignora ids seleccionados que no están en la lista", () => {
    expect(sumaMontosSeleccionados([tx(1, 500)], new Set([1, 999]))).toBe(500)
  })

  it("suma 30 filas seleccionadas con formato es-BO (AC4)", () => {
    const txs = Array.from({ length: 30 }, (_, indice) => tx(indice + 1, (indice + 1) * 100))
    const total = sumaMontosSeleccionados(txs, new Set(txs.map((fila) => fila.id)))

    expect(txs).toHaveLength(30)
    expect(total).toBe(46500)
    expect(formatBs(total)).toBe("465,00 Bs")
  })
})
