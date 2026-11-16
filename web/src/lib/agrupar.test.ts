import { describe, expect, it } from "vitest"
import {
  agruparPorAnio,
  anioDeFecha,
  contarPorAnio,
  paginasNecesarias,
} from "./agrupar"

interface Fila {
  id: number
  fecha: string
  split_id?: number
}

const fechaDe = (fila: Fila) => fila.fecha

describe("anioDeFecha", () => {
  it("devuelve el año de una fecha real", () => {
    expect(anioDeFecha("2026-11-15")).toBe(2026)
    expect(anioDeFecha("2024-02-29")).toBe(2024)
  })

  it("rechaza fechas inexistentes o con formato inválido", () => {
    expect(anioDeFecha("2026-02-30")).toBeNull()
    expect(anioDeFecha("2023-02-29")).toBeNull()
    expect(anioDeFecha("15/11/2026")).toBeNull()
    expect(anioDeFecha("")).toBeNull()
    expect(anioDeFecha(null)).toBeNull()
    expect(anioDeFecha(undefined)).toBeNull()
  })
})

describe("agruparPorAnio", () => {
  it("devuelve vacío sin filas", () => {
    expect(agruparPorAnio([], fechaDe)).toEqual([])
  })

  it("ordena los años de forma descendente aunque las filas lleguen desordenadas", () => {
    const filas: Fila[] = [
      { id: 1, fecha: "2024-06-01" },
      { id: 2, fecha: "2026-01-10" },
      { id: 3, fecha: "2025-12-31" },
      { id: 4, fecha: "2026-03-05" },
    ]

    expect(agruparPorAnio(filas, fechaDe).map((g) => g.anio)).toEqual([2026, 2025, 2024])
  })

  it("omite fechas inválidas sin romper el orden del backend dentro del año", () => {
    const filas: Fila[] = [
      { id: 10, fecha: "2026-01-01" },
      { id: 11, fecha: "2026-02-30" },
      { id: 12, fecha: "2026-01-02" },
    ]

    const grupos = agruparPorAnio(filas, fechaDe)
    expect(grupos).toHaveLength(1)
    expect(grupos[0].anio).toBe(2026)
    expect(grupos[0].filas.map((f) => f.id)).toEqual([10, 12])
  })

  it("trata el 29 de febrero como fecha válida en un año bisiesto", () => {
    const grupos = agruparPorAnio(
      [
        { id: 1, fecha: "2024-02-29" },
        { id: 2, fecha: "2023-02-29" },
      ],
      fechaDe,
    )

    expect(grupos).toHaveLength(1)
    expect(grupos[0]).toEqual({
      anio: 2024,
      filas: [{ id: 1, fecha: "2024-02-29" }],
    })
  })

  it("preserva filas duplicadas del backend (el dedupe es responsabilidad de la carga)", () => {
    const repetida: Fila = { id: 7, fecha: "2026-05-01" }
    const grupos = agruparPorAnio([repetida, repetida], fechaDe)

    expect(grupos[0].filas).toEqual([repetida, repetida])
  })

  it("conserva el orden de llegada, no ordena por fecha dentro del año", () => {
    const filas: Fila[] = [
      { id: 1, fecha: "2026-10-01" },
      { id: 2, fecha: "2026-01-01" },
      { id: 3, fecha: "2026-07-01" },
    ]

    expect(agruparPorAnio(filas, fechaDe)[0].filas.map((f) => f.id)).toEqual([1, 2, 3])
  })
})

describe("contarPorAnio", () => {
  it("cuenta por año en orden descendente y omite fechas inválidas", () => {
    const filas: Fila[] = [
      { id: 1, fecha: "2024-01-01" },
      { id: 2, fecha: "2026-01-01" },
      { id: 3, fecha: "2026-02-01" },
      { id: 4, fecha: "2026-13-01" },
      { id: 5, fecha: "2025-03-01" },
    ]

    expect([...contarPorAnio(filas, fechaDe).entries()]).toEqual([
      [2026, 2],
      [2025, 1],
      [2024, 1],
    ])
  })

  it("devuelve un mapa vacío sin filas válidas", () => {
    expect(contarPorAnio([{ id: 1, fecha: "2026-99-99" }], fechaDe).size).toBe(0)
  })
})

describe("paginasNecesarias", () => {
  it("calcula el techo de páginas del tope efectivo (500)", () => {
    expect(paginasNecesarias(0, 500)).toBe(0)
    expect(paginasNecesarias(1, 500)).toBe(1)
    expect(paginasNecesarias(500, 500)).toBe(1)
    expect(paginasNecesarias(501, 500)).toBe(2)
    expect(paginasNecesarias(1500, 500)).toBe(3)
  })

  it("protege contra tamaños de página inválidos", () => {
    expect(paginasNecesarias(10, 0)).toBe(0)
    expect(paginasNecesarias(10, -1)).toBe(0)
    expect(paginasNecesarias(-5, 500)).toBe(0)
    expect(paginasNecesarias(Number.NaN, 500)).toBe(0)
  })
})

describe("cruce de splits por pago_id", () => {
  it("agrupa solo los pagos que tienen split, cruzando por pago_id/split_id", () => {
    // Simula el índice que /splits construye: pago_id -> split.
    const splits = [
      { id: 100, pago_id: 2 },
      { id: 101, pago_id: 4 },
    ]
    const splitsPorPago = new Map(splits.map((s) => [s.pago_id, s]))

    const pagos: Fila[] = [
      { id: 1, fecha: "2025-12-31" },
      { id: 2, fecha: "2026-01-01", split_id: 100 },
      { id: 3, fecha: "2026-02-01" },
      { id: 4, fecha: "2024-07-01", split_id: 101 },
    ]

    const conSplit = pagos.filter((p) => splitsPorPago.has(p.id))
    const grupos = agruparPorAnio(conSplit, fechaDe)

    expect(grupos.map((g) => g.anio)).toEqual([2026, 2024])
    expect(grupos[0].filas.map((f) => f.id)).toEqual([2])
    expect(grupos[1].filas.map((f) => f.id)).toEqual([4])
    expect(grupos.flatMap((g) => g.filas.map((f) => f.split_id))).toEqual([100, 101])
  })
})
