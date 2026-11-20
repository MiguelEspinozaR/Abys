import { describe, expect, it } from "vitest"
import { construirDiasPayload } from "./pagoPayload"

const base = {
  diasOrdenados: ["2026-11-20", "2026-11-21"],
  montosDetallados: [15000, 20000],
  totalDistribuidoCents: 60001,
  modoRedondeo: "preciso" as const,
}

describe("construirDiasPayload", () => {
  it("detallado lleva solo fecha y monto_enteros (sin campo de modo)", () => {
    const dias = construirDiasPayload({ ...base, modoRegistro: "detallado" })
    expect(dias).toEqual([
      { fecha: "2026-11-20", monto_enteros: 15000 },
      { fecha: "2026-11-21", monto_enteros: 20000 },
    ])
    for (const dia of dias) {
      expect(Object.keys(dia).sort()).toEqual(["fecha", "monto_enteros"])
    }
  })

  it("distribuido calcula con el modo pero no lo incluye en el payload", () => {
    const dias = construirDiasPayload({
      ...base,
      modoRegistro: "distribuido",
      modoRedondeo: "preciso",
    })
    expect(dias).toEqual([
      { fecha: "2026-11-20", monto_enteros: 30000 },
      { fecha: "2026-11-21", monto_enteros: 30001 },
    ])
    for (const dia of dias) {
      expect(Object.keys(dia).sort()).toEqual(["fecha", "monto_enteros"])
    }
  })

  it("el modo de redondeo afecta al cálculo, nunca a la forma del objeto", () => {
    const args = {
      ...base,
      modoRegistro: "distribuido" as const,
      diasOrdenados: ["2026-11-20", "2026-11-21", "2026-11-22"],
      totalDistribuidoCents: 150,
    }
    expect(construirDiasPayload({ ...args, modoRedondeo: "enteros" })).toEqual([
      { fecha: "2026-11-20", monto_enteros: 0 },
      { fecha: "2026-11-21", monto_enteros: 0 },
      { fecha: "2026-11-22", monto_enteros: 150 },
    ])
    expect(construirDiasPayload({ ...args, modoRedondeo: "preciso" })).toEqual([
      { fecha: "2026-11-20", monto_enteros: 50 },
      { fecha: "2026-11-21", monto_enteros: 50 },
      { fecha: "2026-11-22", monto_enteros: 50 },
    ])
  })

  it("devuelve [] si falta algún monto o no hay días/total", () => {
    expect(
      construirDiasPayload({
        ...base,
        modoRegistro: "detallado",
        montosDetallados: [15000, null],
      }),
    ).toEqual([])
    expect(
      construirDiasPayload({
        ...base,
        modoRegistro: "distribuido",
        diasOrdenados: [],
      }),
    ).toEqual([])
    expect(
      construirDiasPayload({
        ...base,
        modoRegistro: "distribuido",
        totalDistribuidoCents: null,
      }),
    ).toEqual([])
  })
})
