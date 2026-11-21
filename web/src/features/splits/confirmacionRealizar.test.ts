import { describe, expect, it } from "vitest"
import { formatBs } from "@/lib/format"
import {
  idsParaReintento,
  puedeRealizar,
  textoConfirmacion,
} from "./confirmacionRealizar"
import type { ResultadoRealizacion } from "./realizarSeleccionados"

describe("textoConfirmacion", () => {
  it("muestra la cantidad y el monto es-BO del subtotal (U2a)", () => {
    const texto = textoConfirmacion(3, 12345)
    expect(texto).toContain("3")
    expect(texto).toContain(formatBs(12345))
    expect(texto).toContain("123,45 Bs")
  })
})

describe("idsParaReintento", () => {
  it("devuelve solo los ids fallidos, en orden (U2b)", () => {
    const resultado: ResultadoRealizacion = {
      ok: [1, 3],
      fallidos: [
        { id: 2, mensaje: "500" },
        { id: 9, mensaje: "timeout" },
      ],
    }
    expect(idsParaReintento(resultado)).toEqual([2, 9])
    expect(idsParaReintento({ ok: [1], fallidos: [] })).toEqual([])
  })
})

describe("puedeRealizar", () => {
  it("es falso sin selección, incluso en cuenta normal (U2c)", () => {
    expect(puedeRealizar({ es_general: false }, new Set())).toBe(false)
  })

  it("es falso en la cuenta General aunque haya selección (U2c)", () => {
    expect(puedeRealizar({ es_general: true }, new Set([1, 2]))).toBe(false)
  })

  it("es verdadero en cuenta normal con selección (U2c)", () => {
    expect(puedeRealizar({ es_general: false }, new Set([1]))).toBe(true)
  })
})
