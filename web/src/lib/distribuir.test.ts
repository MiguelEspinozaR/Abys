import { describe, expect, it } from "vitest"
import { MODOS_DISTRIBUCION, aplicarModo, distribuir } from "./distribuir"
import type { ModoDistribucion } from "./distribuir"

const suma = (montos: number[]) => montos.reduce((acc, monto) => acc + monto, 0)
const modos: ModoDistribucion[] = MODOS_DISTRIBUCION.map((m) => m.value)

describe("aplicarModo", () => {
  it("redondeado es half-up a 1 Bs", () => {
    expect(aplicarModo(49, "redondeado")).toBe(0)
    expect(aplicarModo(50, "redondeado")).toBe(100)
    expect(aplicarModo(149, "redondeado")).toBe(100)
    expect(aplicarModo(150, "redondeado")).toBe(200)
  })

  it("enteros trunca a 1 Bs y preciso conserva centavos", () => {
    expect(aplicarModo(199, "enteros")).toBe(100)
    expect(aplicarModo(199, "preciso")).toBe(199)
  })
})

describe("distribuir", () => {
  it("600 Bs entre 3 días reparte 200/200/200 en los tres modos", () => {
    for (const modo of modos) {
      expect(distribuir(60000, 3, modo)).toEqual([20000, 20000, 20000])
    }
  })

  it("el residuo va al último día (600,01 Bs / 3)", () => {
    for (const modo of modos) {
      expect(distribuir(60001, 3, modo)).toEqual([20000, 20000, 20001])
    }
  })

  it("150 centavos entre 2 días según el modo (espejo de splitcalc)", () => {
    expect(distribuir(150, 2, "redondeado")).toEqual([100, 50])
    expect(distribuir(150, 2, "enteros")).toEqual([0, 150])
    expect(distribuir(150, 2, "preciso")).toEqual([75, 75])
  })

  it("633,33 Bs entre 3 días según el modo", () => {
    expect(distribuir(63333, 3, "redondeado")).toEqual([21100, 21100, 21133])
    expect(distribuir(63333, 3, "enteros")).toEqual([21100, 21100, 21133])
    expect(distribuir(63333, 3, "preciso")).toEqual([21111, 21111, 21111])
  })

  it("100 centavos entre 3 días en enteros deja todo al último día", () => {
    expect(distribuir(100, 3, "enteros")).toEqual([0, 0, 100])
  })

  it("un centavo entre 3 días queda en el último", () => {
    for (const modo of modos) {
      expect(distribuir(1, 3, modo)).toEqual([0, 0, 1])
    }
  })

  it("un solo día recibe el total sin redondear", () => {
    for (const modo of modos) {
      expect(distribuir(12345, 1, modo)).toEqual([12345])
      expect(distribuir(1, 1, modo)).toEqual([1])
    }
  })

  it("total 0 reparte ceros", () => {
    for (const modo of modos) {
      expect(distribuir(0, 4, modo)).toEqual([0, 0, 0, 0])
    }
  })

  it("mantiene Σ exacta y último >= 0 incluso con redondeo hacia arriba", () => {
    expect(distribuir(151, 3, "redondeado")).toEqual([0, 0, 151])
    for (let total = 0; total <= 200; total++) {
      for (let n = 1; n <= 10; n++) {
        for (const modo of modos) {
          const montos = distribuir(total, n, modo)
          expect(montos).toHaveLength(n)
          expect(suma(montos)).toBe(total)
          expect(montos[n - 1]).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it("rechaza totales o cantidades inválidas", () => {
    expect(() => distribuir(-1, 2, "preciso")).toThrow()
    expect(() => distribuir(1.5, 2, "preciso")).toThrow()
    expect(() => distribuir(100, 0, "preciso")).toThrow()
    expect(() => distribuir(100, 2.5, "preciso")).toThrow()
  })
})
