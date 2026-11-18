import { describe, expect, it } from "vitest"
import type { FuenteTotal } from "@/services/types"
import {
  VARIANTES_PATRON,
  etiquetaBloque,
  etiquetaMes,
  filasApiladas,
  filasBloques,
  filasDistribucion,
  filasHistorial,
  filasMeses,
  fuentesUnicas,
  idPatron,
  patronFill,
  porcentajeFuente,
  variantePatron,
} from "./chartLogic"

const fuente = (id: number, total: number, alias = `Fuente ${id}`): FuenteTotal => ({
  fuente_id: id,
  alias,
  color: `#00000${id}`,
  total_centavos: total,
})

describe("etiquetas de período", () => {
  it("etiquetaMes usa MESES_ABREV y reserva el mes 12 para diciembre", () => {
    expect(etiquetaMes(1)).toBe("ene")
    expect(etiquetaMes(10)).toBe("oct")
    expect(etiquetaMes(12)).toBe("dic")
  })

  it("etiquetaMes cae al número con meses fuera de rango", () => {
    expect(etiquetaMes(0)).toBe("0")
    expect(etiquetaMes(13)).toBe("13")
  })

  it("etiquetaBloque deriva el rango de inicio/fin, incluido el 29–31", () => {
    expect(etiquetaBloque("2026-10-01", "2026-10-07")).toBe("1–7")
    expect(etiquetaBloque("2026-10-08", "2026-10-14")).toBe("8–14")
    expect(etiquetaBloque("2026-10-29", "2026-10-31")).toBe("29–31")
    expect(etiquetaBloque("2026-02-01", "2026-02-28")).toBe("1–28")
  })

  it("etiquetaBloque es robusta con fechas mal formadas", () => {
    expect(etiquetaBloque("", "")).toBe("—")
  })
})

describe("fuentes y patrones", () => {
  it("fuentesUnicas dedup por id sumando montos y ordena por fuente_id", () => {
    expect(
      fuentesUnicas([
        fuente(9, 300, "Nueve"),
        fuente(2, 100, "Dos"),
        fuente(9, 200, "Nueve"),
        fuente(5, 50, "Cinco"),
      ]),
    ).toEqual([
      fuente(2, 100, "Dos"),
      fuente(5, 50, "Cinco"),
      fuente(9, 500, "Nueve"),
    ])
  })

  it("variantePatron es determinista y siempre dentro de la rampa", () => {
    for (let id = -5; id <= 20; id++) {
      expect(variantePatron(id)).toBe(variantePatron(id))
      expect(variantePatron(id)).toBeGreaterThanOrEqual(0)
      expect(variantePatron(id)).toBeLessThan(VARIANTES_PATRON)
    }
    expect(variantePatron(1)).not.toBe(variantePatron(2))
  })

  it("los ids y fills de patrón son estables por fuente y prefijo", () => {
    expect(idPatron("semanal", 7)).toBe("semanal-patron-fuente-7")
    expect(patronFill("dist-mes", 7)).toBe("url(#dist-mes-patron-fuente-7)")
  })
})

describe("filas de charts", () => {
  it("filasApiladas agrupa por fecha y rellena con 0 las fuentes ausentes", () => {
    const filas = filasApiladas([
      {
        fecha: "2026-10-22",
        total_centavos: 450,
        por_fuente: [fuente(2, 200, "Athena"), fuente(5, 250, "Malnova")],
      },
      {
        fecha: "2026-10-23",
        total_centavos: 150,
        por_fuente: [fuente(5, 150, "Malnova")],
      },
    ])

    expect(filas).toHaveLength(2)
    expect(filas[0].fecha).toBe("2026-10-22")
    expect(filas[0].nombre).toContain("22")
    expect(filas[0].total_centavos).toBe(450)
    expect(filas[0]["fuente-2"]).toBe(200)
    expect(filas[0]["fuente-5"]).toBe(250)
    expect(filas[1]["fuente-2"]).toBe(0)
    expect(filas[1]["fuente-5"]).toBe(150)
  })

  it("filasBloques rotula cada bloque con su rango real", () => {
    expect(
      filasBloques({
        mes: 10,
        anio: 2026,
        bloques: [
          { bloque: 1, inicio: "2026-10-01", fin: "2026-10-07", total_centavos: 100 },
          { bloque: 5, inicio: "2026-10-29", fin: "2026-10-31", total_centavos: 200 },
        ],
      }),
    ).toEqual([
      { nombre: "1–7", total_centavos: 100 },
      { nombre: "29–31", total_centavos: 200 },
    ])
  })

  it("filasMeses usa el campo mes, no la posición del array", () => {
    const filas = filasMeses({
      anio: 2026,
      meses: [
        { mes: 10, total_centavos: 100 },
        { mes: 2, total_centavos: 200 },
      ],
    })
    expect(filas).toEqual([
      { nombre: "oct", total_centavos: 100 },
      { nombre: "feb", total_centavos: 200 },
    ])
  })

  it("filasHistorial filtra el rango inclusivo y sólo expone nombre y total", () => {
    const filas = filasHistorial(
      {
        por_mes: [
          { anio: 2025, mes: 11, total_centavos: 100 },
          { anio: 2025, mes: 12, total_centavos: 200 },
          { anio: 2026, mes: 1, total_centavos: 300 },
          { anio: 2026, mes: 2, total_centavos: 400 },
        ],
      },
      { anio: 2025, mes: 12 },
      { anio: 2026, mes: 1 },
    )

    expect(filas).toEqual([
      { nombre: "25 dic", total_centavos: 200 },
      { nombre: "26 ene", total_centavos: 300 },
    ])
    expect(Object.keys(filas[0]).sort()).toEqual(["nombre", "total_centavos"])
  })
})

describe("distribución", () => {
  it("porcentajeFuente formatea en es-BO y tolera totales nulos", () => {
    expect(porcentajeFuente(1, 3)).toBe("33,3 %")
    expect(porcentajeFuente(60000, 60000)).toBe("100 %")
    expect(porcentajeFuente(100, 0)).toBe("0 %")
    expect(porcentajeFuente(Number.NaN, 100)).toBe("0 %")
  })

  it("filasDistribucion calcula el porcentaje de cada fuente", () => {
    expect(
      filasDistribucion({
        total_centavos: 600,
        por_fuente: [fuente(2, 150, "Athena"), fuente(5, 450, "Malnova")],
      }),
    ).toEqual([
      { ...fuente(2, 150, "Athena"), porcentaje: "25 %" },
      { ...fuente(5, 450, "Malnova"), porcentaje: "75 %" },
    ])
  })
})
