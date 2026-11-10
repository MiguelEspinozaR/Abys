import { describe, expect, it } from "vitest"
import {
  esFechaISOValida,
  MAX_NOTAS,
  validarAlias,
  validarColor,
  validarDiasTrabajados,
  validarFechaPago,
  validarFuente,
  validarMetodoPago,
  validarModoSplit,
  validarMonto,
  validarNotas,
  validarSplitAutoModo,
  validarTasa,
} from "./validators"

describe("validarFuente", () => {
  it("rechaza vacío y valores fuera de la lista", () => {
    expect(validarFuente("", ["1", "2"])).toBe("Selecciona una fuente")
    expect(validarFuente("9", ["1", "2"])).toBe("Selecciona una fuente válida")
  })

  it("acepta un id presente en fuentes", () => {
    expect(validarFuente("2", ["1", "2"])).toBeNull()
    expect(validarFuente("2", new Set(["1", "2"]))).toBeNull()
  })
})

describe("validarFechaPago", () => {
  it("requiere fecha", () => {
    expect(validarFechaPago("")).toBe("Selecciona la fecha de pago")
  })

  it("acepta fechas válidas, incluidas futuras", () => {
    expect(validarFechaPago("2026-08-27")).toBeNull()
    expect(validarFechaPago("2099-12-31")).toBeNull()
  })

  it("rechaza fechas inexistentes y formatos raros", () => {
    expect(validarFechaPago("2026-02-30")).not.toBeNull()
    expect(validarFechaPago("2026-13-01")).not.toBeNull()
    expect(validarFechaPago("27-08-2026")).not.toBeNull()
    expect(validarFechaPago("hoy")).not.toBeNull()
  })
})

describe("esFechaISOValida", () => {
  it("valida mes y día reales", () => {
    expect(esFechaISOValida("2024-02-29")).toBe(true) // bisiesto
    expect(esFechaISOValida("2023-02-29")).toBe(false)
    expect(esFechaISOValida("2026-11-10")).toBe(true)
  })
})

describe("validarMonto", () => {
  it("requiere monto parseable en es-BO", () => {
    expect(validarMonto("")).toBe("Ingresa un monto válido, p. ej. 265,00")
    expect(validarMonto("abc")).toBe("Ingresa un monto válido, p. ej. 265,00")
    expect(validarMonto("-50")).toBe("Ingresa un monto válido, p. ej. 265,00")
  })

  it("rechaza 0 y montos menores o iguales a 0", () => {
    expect(validarMonto("0")).toBe("Ingresa un monto mayor a 0")
    expect(validarMonto("0,00")).toBe("Ingresa un monto mayor a 0")
    expect(validarMonto("-0,01")).toBe("Ingresa un monto válido, p. ej. 265,00") // negativo no parseable
  })

  it("acepta formatos es-BO y la ambigüedad existente del parser (D19)", () => {
    expect(validarMonto("265,00")).toBeNull()
    expect(validarMonto("1.234,56")).toBeNull()
    expect(validarMonto("265")).toBeNull()
    expect(validarMonto("1.234")).toBeNull() // 1,23 Bs según el parser actual
  })
})

describe("validarDiasTrabajados", () => {
  it("requiere al menos un día", () => {
    expect(validarDiasTrabajados([])).toBe("Selecciona al menos un día")
    expect(validarDiasTrabajados(new Set<string>())).toBe("Selecciona al menos un día")
  })

  it("acepta días válidos y sin duplicados", () => {
    expect(validarDiasTrabajados(["2026-11-09", "2026-11-10"])).toBeNull()
    expect(validarDiasTrabajados(new Set(["2026-11-09"]))).toBeNull()
  })

  it("rechaza duplicados y fechas inválidas", () => {
    expect(validarDiasTrabajados(["2026-11-09", "2026-11-09"])).toBe("Hay días repetidos")
    expect(validarDiasTrabajados(["mañana"])).toBe(
      "Hay fechas inválidas en los días trabajados",
    )
  })
})

describe("validarMetodoPago", () => {
  it("acepta los métodos válidos", () => {
    expect(validarMetodoPago("efectivo")).toBeNull()
    expect(validarMetodoPago("qr")).toBeNull()
    expect(validarMetodoPago("transaccion")).toBeNull()
  })

  it("rechaza métodos desconocidos y vacío", () => {
    expect(validarMetodoPago("")).toBe("Selecciona un método de pago")
    expect(validarMetodoPago("tarjeta")).toBe("Selecciona un método de pago")
  })
})

describe("validarNotas", () => {
  it("acepta notas vacías y de hasta 500 caracteres", () => {
    expect(validarNotas("")).toBeNull()
    expect(validarNotas("a".repeat(500))).toBeNull()
  })

  it("rechaza más de 500 caracteres (incluye OCR programático)", () => {
    expect(validarNotas("a".repeat(501))).toBe("Máximo 500 caracteres")
    expect(validarNotas("a".repeat(600))).toBe("Máximo 500 caracteres")
    expect(MAX_NOTAS).toBe(500)
  })
})

describe("validarAlias", () => {
  it("requiere trim no vacío", () => {
    expect(validarAlias("")).toBe("El alias es obligatorio")
    expect(validarAlias("   ")).toBe("El alias es obligatorio")
  })

  it("acepta alias con contenido (trim preserva espacios internos)", () => {
    expect(validarAlias("Athena")).toBeNull()
    expect(validarAlias("  Box  ")).toBeNull()
  })
})

describe("validarColor", () => {
  it("acepta #RRGGBB en mayúsculas y minúsculas", () => {
    expect(validarColor("#3b82f6")).toBeNull()
    expect(validarColor("#3B82F6")).toBeNull()
    expect(validarColor("#000000")).toBeNull()
  })

  it("rechaza formatos inválidos", () => {
    expect(validarColor("")).not.toBeNull()
    expect(validarColor("3b82f6")).not.toBeNull()
    expect(validarColor("#3b82f")).not.toBeNull()
    expect(validarColor("#3b82f66")).not.toBeNull()
    expect(validarColor("#xyzwvu")).not.toBeNull()
  })
})

describe("validarTasa", () => {
  it("requiere un número entre 0 y 100 (vacío inválido)", () => {
    expect(validarTasa("")).toBe("Ingresa una tasa válida entre 0 y 100")
    expect(validarTasa("abc")).toBe("Ingresa una tasa válida entre 0 y 100")
    expect(validarTasa("1.2.3")).toBe("Ingresa una tasa válida entre 0 y 100")
  })

  it("acepta 0, 100 y valores intermedios, con coma o punto decimal", () => {
    expect(validarTasa("0")).toBeNull()
    expect(validarTasa("100")).toBeNull()
    expect(validarTasa("25")).toBeNull()
    expect(validarTasa("25,5")).toBeNull()
    expect(validarTasa("25.5")).toBeNull()
    expect(validarTasa(" 30 ")).toBeNull()
  })

  it("rechaza negativos y mayores a 100", () => {
    expect(validarTasa("-1")).toBe("La tasa debe estar entre 0 y 100")
    expect(validarTasa("-0.01")).toBe("La tasa debe estar entre 0 y 100")
    expect(validarTasa("100.01")).toBe("La tasa debe estar entre 0 y 100")
    expect(validarTasa("101")).toBe("La tasa debe estar entre 0 y 100")
  })
})

describe("validarModoSplit / validarSplitAutoModo", () => {
  it("acepta los modos válidos", () => {
    for (const modo of ["preciso", "redondeado", "enteros"]) {
      expect(validarModoSplit(modo)).toBeNull()
    }
  })

  it("rechaza modos desconocidos", () => {
    expect(validarModoSplit("")).toBe("Selecciona un modo de cálculo")
    expect(validarModoSplit("rapido")).toBe("Selecciona un modo de cálculo")
  })

  it("split_auto_modo vacío es válido: usa el modo por defecto (D14)", () => {
    expect(validarSplitAutoModo("")).toBeNull()
    expect(validarSplitAutoModo(null)).toBeNull()
    expect(validarSplitAutoModo(undefined)).toBeNull()
    expect(validarSplitAutoModo("  ")).toBeNull()
  })

  it("split_auto_modo con valor debe ser un modo válido", () => {
    expect(validarSplitAutoModo("preciso")).toBeNull()
    expect(validarSplitAutoModo("invalido")).toBe("Selecciona un modo de cálculo")
  })
})
