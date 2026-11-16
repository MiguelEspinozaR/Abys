import { describe, expect, it } from "vitest"
import { normalizarColor, oklchToRgb } from "./themeColor"

function parseRgb(s: string) {
  const m = /rgba?\(([^)]+)\)/i.exec(s)
  if (!m) return null
  const [r, g, b, a] = m[1].split(/[,\s/]+/).filter(Boolean).map(Number)
  return { r, g, b, a }
}

describe("oklchToRgb / normalizarColor", () => {
  it("convierte dark oklch(0.145 0 0) a ~rgb(10,10,10)", () => {
    expect(oklchToRgb(0.145, 0, 0)).toBe("rgb(10, 10, 10)")
    expect(normalizarColor("oklch(0.145 0 0)")).toBe("rgb(10, 10, 10)")
  })

  it("convierte light oklch(1 0 0) a rgb(255,255,255)", () => {
    expect(oklchToRgb(1, 0, 0)).toBe("rgb(255, 255, 255)")
    expect(normalizarColor("oklch(1 0 0)")).toBe("rgb(255, 255, 255)")
  })

  it("soporta porcentajes y alpha", () => {
    expect(normalizarColor("oklch(100% 0 0)")).toBe("rgb(255, 255, 255)")
    const a = parseRgb(normalizarColor("oklch(0.145 0 0 / 0.5)")!)
    expect(a).toBeTruthy()
    expect(a!.r).toBe(10)
    expect(a!.g).toBe(10)
    expect(a!.b).toBe(10)
    expect(a!.a).toBeCloseTo(0.5, 2)
  })

  it("hace passthrough de hex y rgb", () => {
    expect(normalizarColor("#0a0a0a")).toBe("#0a0a0a")
    expect(normalizarColor("#FFF")).toBe("#fff")
    expect(normalizarColor("rgb(10, 10, 10)")).toBe("rgb(10, 10, 10)")
    expect(normalizarColor("rgba(10,10,10,1)")).toBe("rgb(10, 10, 10)")
  })

  it("fallback en entrada inválida devuelve el valor original", () => {
    expect(normalizarColor("not-a-color")).toBe("not-a-color")
    expect(normalizarColor("oklch(bad)")).toBe("oklch(bad)")
    expect(normalizarColor("")).toBeNull()
  })
})
