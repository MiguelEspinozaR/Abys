import { describe, expect, it } from "vitest"
import { GRUPOS, tituloDeRuta } from "./nav"

describe("tituloDeRuta", () => {
  it("resuelve la raíz como Dashboard", () => {
    expect(tituloDeRuta("/")).toBe("Dashboard")
  })

  it("resuelve rutas simples", () => {
    expect(tituloDeRuta("/registrar")).toBe("Registrar")
    expect(tituloDeRuta("/splits")).toBe("Splits")
    expect(tituloDeRuta("/configuracion")).toBe("Configuración")
  })

  it("resuelve subrutas por prefijo", () => {
    expect(tituloDeRuta("/ingresos/123")).toBe("Ingresos")
  })

  it("devuelve Abys para rutas desconocidas", () => {
    expect(tituloDeRuta("/desconocido")).toBe("Abys")
  })

  it("no confunde la raíz con subrutas", () => {
    expect(tituloDeRuta("/health")).toBe("Health")
  })
})

describe("GRUPOS", () => {
  it("incluye las secciones de Finanzas y Sistema", () => {
    expect(GRUPOS.map((g) => g.titulo)).toEqual(["Finanzas", "Sistema"])
    expect(GRUPOS.flatMap((g) => g.items)).toHaveLength(6)
  })
})
