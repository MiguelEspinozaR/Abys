import { describe, expect, it } from "vitest"
import {
  bpsToPercentNum,
  bsToCents,
  diaSemanaEs,
  formatBs,
  formatTasaBps,
  percentNumToBps,
  toISODate,
} from "./format"

describe("formatBs", () => {
  it("formatea centavos a Bs con separadores es-BO", () => {
    expect(formatBs(26500)).toBe("265,00 Bs")
    expect(formatBs(123456)).toBe("1.234,56 Bs")
    expect(formatBs(0)).toBe("0,00 Bs")
    expect(formatBs(1)).toBe("0,01 Bs")
  })

  it("acepta string y valores negativos", () => {
    expect(formatBs("1000")).toBe("10,00 Bs")
    expect(formatBs(-50)).toBe("−0,50 Bs")
  })

  it("devuelve — para valores inválidos", () => {
    expect(formatBs("abc")).toBe("—")
  })
})

describe("bsToCents", () => {
  it("parsea formatos es-BO y en-US", () => {
    expect(bsToCents("1.234,56")).toBe(123456)
    expect(bsToCents("1234,56")).toBe(123456)
    expect(bsToCents("1,234.56")).toBe(123456)
    expect(bsToCents("1234.56")).toBe(123456)
  })

  it("acepta enteros y sufijo Bs", () => {
    expect(bsToCents("265")).toBe(26500)
    expect(bsToCents("265 Bs")).toBe(26500)
    expect(bsToCents("12,34 Bs")).toBe(1234)
  })

  it("rechaza vacío, no numérico y negativos", () => {
    expect(bsToCents("")).toBeNull()
    expect(bsToCents("abc")).toBeNull()
    expect(bsToCents("-50")).toBeNull()
  })

  it("redondea fracciones de centavo", () => {
    expect(bsToCents("12.345")).toBe(1235)
  })
})

describe("tasas bps ↔ %", () => {
  it("convierte bps a número de porcentaje y viceversa", () => {
    expect(bpsToPercentNum(2000)).toBe(20)
    expect(percentNumToBps(20.5)).toBe(2050)
  })

  it("formatea bps como porcentaje", () => {
    expect(formatTasaBps(2000)).toBe("20 %")
    expect(formatTasaBps(3050)).toBe("30,5 %")
  })
})

describe("fechas", () => {
  it("devuelve el día de la semana en español sin shift UTC", () => {
    expect(diaSemanaEs("2026-08-27")).toBe("jueves")
    expect(diaSemanaEs("2026-09-11")).toBe("viernes")
  })

  it("toISODate no desplaza la zona horaria", () => {
    expect(toISODate(new Date(2026, 8, 7))).toBe("2026-09-07")
  })
})