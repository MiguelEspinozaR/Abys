import { describe, expect, it } from "vitest"
import type { Fuente, Pago } from "@/services/types"
import {
  BG_FUENTE_FALLBACK,
  COLOR_FUENTE_FALLBACK,
  construirFuentesPorDia,
  esColorHex,
  fuentesParaLeyenda,
  top3Fuentes,
} from "./fuentesDots"

const HOY = "2026-11-20"
const AYER = "2026-11-19"

function fuente(id: number, alias: string, color: string): Fuente {
  return {
    id,
    alias,
    color,
    logo_ruta: null,
    split_auto: false,
    split_auto_modo: null,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
  }
}

function pago(
  id: number,
  fuente_id: number,
  dias: { fecha: string; monto_enteros: number }[],
  extra: Partial<Pick<Pago, "fuente_color" | "fuente_alias">> = {},
): Pago {
  return {
    id,
    fuente_id,
    fecha_pago: HOY,
    monto_enteros: dias.reduce((acc, d) => acc + d.monto_enteros, 0),
    metodo_pago: "efectivo",
    notas: null,
    imagen_ruta: null,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
    dias_trabajados: dias.map((d, i) => ({
      id: i + 1,
      pago_id: id,
      fecha: d.fecha,
      monto_enteros: d.monto_enteros,
    })),
    ...extra,
  }
}

describe("construirFuentesPorDia", () => {
  it("agrupa tres fuentes de un día con alias, color del pago y totales", () => {
    const map = construirFuentesPorDia(
      [
        pago(1, 10, [{ fecha: HOY, monto_enteros: 1_500 }], {
          fuente_color: "#111111",
        }),
        pago(2, 20, [{ fecha: HOY, monto_enteros: 3_000 }]),
        pago(3, 30, [{ fecha: HOY, monto_enteros: 5_000 }]),
      ],
      [
        fuente(10, "Efectivo", "#aaaaaa"),
        fuente(20, "QR", "#bbbbbb"),
        fuente(30, "Banco", "#cccccc"),
      ],
    )

    expect([...map.keys()]).toEqual([HOY])
    expect(map.get(HOY)?.size).toBe(3)
    // El snapshot del pago gana al color actual de la fuente.
    expect(map.get(HOY)?.get(10)).toEqual({
      alias: "Efectivo",
      color: "#111111",
      total_centavos: 1_500,
    })
    expect(map.get(HOY)?.get(20)).toEqual({
      alias: "QR",
      color: "#bbbbbb",
      total_centavos: 3_000,
    })
    expect(top3Fuentes(map, HOY).map((f) => f.fuente_id)).toEqual([30, 20, 10])
  })

  it("con más de tres fuentes elige las de mayor monto del día", () => {
    const montos: [number, number][] = [
      [1, 100],
      [2, 500],
      [3, 300],
      [4, 400],
      [5, 200],
    ]
    const map = construirFuentesPorDia(
      montos.map(([id, monto]) => pago(id, id, [{ fecha: HOY, monto_enteros: monto }])),
      montos.map(([id]) => fuente(id, `Fuente ${id}`, `#00000${id}`)),
    )

    expect(map.get(HOY)?.size).toBe(5)
    expect(top3Fuentes(map, HOY).map((f) => f.fuente_id)).toEqual([2, 4, 3])
    // La leyenda no aplica el límite de 3: viene de todo el mapa.
    expect(fuentesParaLeyenda(map).map((f) => f.fuente_id)).toEqual([1, 2, 3, 4, 5])
  })

  it("desempata por fuente_id ascendente cuando empatan los montos", () => {
    const ids = [9, 2, 5, 7]
    const map = construirFuentesPorDia(
      ids.map((id, i) => pago(i + 1, id, [{ fecha: HOY, monto_enteros: 1_000 }])),
      ids.map((id) => fuente(id, `F${id}`, "#123456")),
    )

    expect(top3Fuentes(map, HOY).map((f) => f.fuente_id)).toEqual([2, 5, 7])
    expect(top3Fuentes(map, HOY)).toHaveLength(3)
  })

  it("cae al color de Fuente si el snapshot no es hex válido", () => {
    const map = construirFuentesPorDia(
      [
        pago(1, 10, [{ fecha: HOY, monto_enteros: 100 }], {
          fuente_color: "no-es-hex",
        }),
        pago(2, 20, [{ fecha: HOY, monto_enteros: 200 }], {
          fuente_color: "   ",
        }),
        pago(3, 30, [{ fecha: HOY, monto_enteros: 300 }], {
          fuente_color: " #abcdef ",
        }),
      ],
      [
        fuente(10, "A", "#abcdef"),
        fuente(20, "B", "rgb(1,2,3)"),
        fuente(30, "C", "#999999"),
      ],
    )

    expect(map.get(HOY)?.get(10)?.color).toBe("#abcdef")
    expect(map.get(HOY)?.get(20)?.color).toBe(BG_FUENTE_FALLBACK)
    expect(map.get(HOY)?.get(30)?.color).toBe("#abcdef")
  })

  it("usa la clase gris estática cuando no hay color válido ni fuente", () => {
    const map = construirFuentesPorDia(
      [
        pago(1, 99, [{ fecha: HOY, monto_enteros: 100 }], {
          fuente_alias: "Fuente borrada",
        }),
      ],
      [],
    )

    expect(COLOR_FUENTE_FALLBACK).toBe(BG_FUENTE_FALLBACK)
    expect(map.get(HOY)?.get(99)).toEqual({
      alias: "Fuente borrada",
      color: BG_FUENTE_FALLBACK,
      total_centavos: 100,
    })
    expect(esColorHex(map.get(HOY)!.get(99)!.color)).toBe(false)
  })

  it("acumula montos de la misma fuente y día y separa por fecha", () => {
    const map = construirFuentesPorDia(
      [
        pago(1, 10, [
          { fecha: HOY, monto_enteros: 1_000 },
          { fecha: AYER, monto_enteros: 500 },
        ]),
        pago(2, 10, [{ fecha: HOY, monto_enteros: 250 }]),
        pago(3, 20, [{ fecha: HOY, monto_enteros: 700 }]),
      ],
      [fuente(10, "A", "#111111"), fuente(20, "B", "#222222")],
    )

    expect([...map.keys()].sort()).toEqual([AYER, HOY])
    expect(map.get(HOY)?.get(10)?.total_centavos).toBe(1_250)
    expect(map.get(HOY)?.get(20)?.total_centavos).toBe(700)
    expect(map.get(AYER)?.get(10)?.total_centavos).toBe(500)
    expect(map.get(AYER)?.has(20)).toBe(false)
  })

  it("devuelve mapa, top3 y leyenda vacíos sin fuentes", () => {
    const map = construirFuentesPorDia(
      [pago(1, 10, [])],
      [fuente(10, "A", "#111111")],
    )

    expect(map.size).toBe(0)
    expect(top3Fuentes(map, HOY)).toEqual([])
    expect(top3Fuentes(undefined, HOY)).toEqual([])
    expect(fuentesParaLeyenda(map)).toEqual([])
    expect(fuentesParaLeyenda(undefined)).toEqual([])
  })

  it("deriva la leyenda de todo el mapa, sin duplicados y ordenada por id", () => {
    const map = construirFuentesPorDia(
      [
        pago(1, 30, [{ fecha: HOY, monto_enteros: 400 }]),
        pago(2, 10, [{ fecha: HOY, monto_enteros: 100 }]),
        pago(3, 40, [{ fecha: AYER, monto_enteros: 200 }], {
          fuente_color: "#444444",
          fuente_alias: "Histórica",
        }),
        pago(4, 30, [{ fecha: AYER, monto_enteros: 300 }]),
      ],
      [fuente(10, "A", "#111111"), fuente(30, "C", "#333333")],
    )

    expect(fuentesParaLeyenda(map)).toEqual([
      { fuente_id: 10, alias: "A", color: "#111111" },
      { fuente_id: 30, alias: "C", color: "#333333" },
      { fuente_id: 40, alias: "Histórica", color: "#444444" },
    ])
  })
})

describe("esColorHex", () => {
  it("acepta solo #RRGGBB para poder aplicarlo con inline style", () => {
    expect(esColorHex("#3b82f6")).toBe(true)
    expect(esColorHex("#FFF")).toBe(false)
    expect(esColorHex("rgb(1, 2, 3)")).toBe(false)
    expect(esColorHex(BG_FUENTE_FALLBACK)).toBe(false)
    expect(esColorHex(null)).toBe(false)
  })
})
