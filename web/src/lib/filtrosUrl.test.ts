import { describe, expect, it } from "vitest"
import {
  leerFiltros,
  leerTab,
  RANGOS,
  serializarFiltros,
  serializarTab,
  TABS,
  validarFiltros,
} from "./filtrosUrl"

describe("leerFiltros — rango", () => {
  it("rango ausente o inválido cae en ytd", () => {
    expect(leerFiltros("")).toEqual({ rango: "ytd" })
    expect(leerFiltros("?rango=")).toEqual({ rango: "ytd" })
    expect(leerFiltros("?rango=foo")).toEqual({ rango: "ytd" })
  })

  it("acepta los presets válidos", () => {
    expect(leerFiltros("?rango=ytd")).toEqual({ rango: "ytd" })
    expect(leerFiltros("?rango=365")).toEqual({ rango: "365" })
    expect(leerFiltros("?rango=anio")).toEqual({ rango: "anio" })
  })

  it("ignora fechas fuera de custom", () => {
    expect(leerFiltros("?rango=365&desde=2026-01-01&hasta=2026-12-31")).toEqual({
      rango: "365",
    })
    expect(leerFiltros("?desde=2026-01-01&hasta=2026-12-31")).toEqual({ rango: "ytd" })
  })
})

describe("leerFiltros — custom y fechas", () => {
  it("acepta custom con ambas fechas válidas y ordenadas", () => {
    expect(leerFiltros("?rango=custom&desde=2025-06-01&hasta=2025-12-31")).toEqual({
      rango: "custom",
      desde: "2025-06-01",
      hasta: "2025-12-31",
    })
  })

  it("descarta fechas inválidas y degrada custom a ytd", () => {
    expect(leerFiltros("?rango=custom&desde=2026-02-30&hasta=2026-03-01")).toEqual({
      rango: "ytd",
    })
    expect(leerFiltros("?rango=custom&desde=01/02/2026&hasta=2026-03-01")).toEqual({
      rango: "ytd",
    })
  })

  it("descarta custom incompleto o invertido", () => {
    expect(leerFiltros("?rango=custom")).toEqual({ rango: "ytd" })
    expect(leerFiltros("?rango=custom&desde=2026-01-01")).toEqual({ rango: "ytd" })
    expect(leerFiltros("?rango=custom&desde=2026-06-01&hasta=2026-01-01")).toEqual({
      rango: "ytd",
    })
  })
})

describe("leerFiltros — fuente y método", () => {
  it("acepta fuente entero positivo y método válido", () => {
    expect(leerFiltros("?rango=ytd&fuente=2&metodo=qr")).toEqual({
      rango: "ytd",
      fuente: 2,
      metodo: "qr",
    })
  })

  it("descarta fuente no entera, negativa, cero o no numérica", () => {
    for (const fuente of ["-1", "0", "2.5", "abc", ""]) {
      expect(leerFiltros(`?rango=ytd&fuente=${fuente}`)).toEqual({ rango: "ytd" })
    }
  })

  it("en fase 2 descarta una fuente que no existe", () => {
    expect(leerFiltros("?rango=ytd&fuente=999", { fuentesValidas: new Set([1, 2]) })).toEqual({
      rango: "ytd",
    })
    expect(leerFiltros("?rango=ytd&fuente=2", { fuentesValidas: new Set([1, 2]) })).toEqual({
      rango: "ytd",
      fuente: 2,
    })
  })

  it("descarta métodos desconocidos", () => {
    expect(leerFiltros("?rango=ytd&metodo=tarjeta")).toEqual({ rango: "ytd" })
    expect(leerFiltros("?rango=ytd&metodo=")).toEqual({ rango: "ytd" })
  })

  it("ignora parámetros desconocidos", () => {
    expect(leerFiltros("?rango=365&page=3&otro=x")).toEqual({ rango: "365" })
  })
})

describe("validarFiltros", () => {
  it("no exige fechas fuera de custom", () => {
    expect(validarFiltros({ rango: "ytd" })).toEqual({})
    expect(validarFiltros({ rango: "anio" })).toEqual({})
  })

  it("custom sin ambas fechas es inválido", () => {
    expect(validarFiltros({ rango: "custom" })).toMatchObject({
      desde: expect.any(String),
      hasta: expect.any(String),
    })
    expect(validarFiltros({ rango: "custom", desde: "2026-01-01" })).toHaveProperty("hasta")
  })

  it("detecta fechas reales inválidas y rangos invertidos", () => {
    expect(
      validarFiltros({ rango: "custom", desde: "2026-02-30", hasta: "2026-03-01" }),
    ).toHaveProperty("desde")
    expect(
      validarFiltros({ rango: "custom", desde: "2026-06-01", hasta: "2026-01-01" }),
    ).toHaveProperty("hasta")
  })

  it("acepta custom válido", () => {
    expect(
      validarFiltros({ rango: "custom", desde: "2025-06-01", hasta: "2025-12-31" }),
    ).toEqual({})
  })
})

describe("serializarFiltros", () => {
  it("serializa rango siempre presente y opcionales solo con valor", () => {
    expect(serializarFiltros({ rango: "ytd" })).toBe("rango=ytd")
    expect(serializarFiltros({ rango: "anio", fuente: 2, metodo: "efectivo" })).toBe(
      "rango=anio&fuente=2&metodo=efectivo",
    )
  })

  it("respeta el orden canónico rango, desde, hasta, fuente, metodo", () => {
    expect(
      serializarFiltros({
        metodo: "qr",
        fuente: 2,
        hasta: "2025-12-31",
        desde: "2025-06-01",
        rango: "custom",
      }),
    ).toBe("rango=custom&desde=2025-06-01&hasta=2025-12-31&fuente=2&metodo=qr")
  })

  it("degrada custom inválido a ytd", () => {
    expect(serializarFiltros({ rango: "custom" })).toBe("rango=ytd")
    expect(
      serializarFiltros({ rango: "custom", desde: "2026-06-01", hasta: "2026-01-01" }),
    ).toBe("rango=ytd")
  })

  it("es idempotente al releer", () => {
    const filtros = {
      rango: "custom" as const,
      desde: "2025-06-01",
      hasta: "2025-12-31",
      fuente: 2,
      metodo: "qr" as const,
    }
    const serializado = serializarFiltros(filtros)
    const releido = leerFiltros(serializado)
    expect(serializarFiltros(releido)).toBe(serializado)
    expect(serializarFiltros(leerFiltros(serializarFiltros(releido)))).toBe(serializado)
  })
})

describe("leerTab / serializarTab", () => {
  it("default e inválido → cuentas", () => {
    expect(leerTab("")).toBe("cuentas")
    expect(leerTab("?tab=otro")).toBe("cuentas")
    expect(leerTab("?tab=")).toBe("cuentas")
  })

  it("lee tabs válidos", () => {
    expect(leerTab("?tab=fuentes")).toBe("fuentes")
    expect(leerTab("?tab=splits")).toBe("splits")
  })

  it("serializa el tab canónico y degrada inválidos", () => {
    expect(serializarTab("cuentas")).toBe("tab=cuentas")
    expect(serializarTab("splits")).toBe("tab=splits")
    expect(serializarTab("otro")).toBe("tab=cuentas")
  })
})

describe("constantes de contrato", () => {
  it("RANGOS y TABS coinciden con la SPEC", () => {
    expect(RANGOS).toEqual(["ytd", "365", "anio", "custom"])
    expect(TABS).toEqual(["cuentas", "fuentes", "splits"])
  })
})
