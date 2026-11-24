import { describe, expect, it } from "vitest"
import { MENSAJE_ERROR_GENERICO } from "./api-errors"
import { esErrorDeChunk, mensajeErrorCarga } from "./errorChunk"

const COPY_CHUNK = {
  titulo: "No se pudo cargar esta sección",
  descripcion:
    "Es posible que la aplicación se haya actualizado mientras esta pestaña estaba abierta. Vuelve a intentarlo.",
}

const COPY_GENERAL = {
  titulo: "Algo salió mal",
  descripcion: MENSAJE_ERROR_GENERICO,
}

describe("esErrorDeChunk", () => {
  it("detecta el fallo real de import() dinámico con la URL del chunk", () => {
    const error = new TypeError(
      "Failed to fetch dynamically imported module: https://test3.mikylab.com/assets/DashboardPage-DrclDJxr.js",
    )

    expect(esErrorDeChunk(error)).toBe(true)
  })

  it("detecta el fallo de importación de un script de módulo", () => {
    expect(esErrorDeChunk("Importing a module script failed")).toBe(true)
  })

  it("detecta un ChunkLoadError", () => {
    expect(esErrorDeChunk(new Error("ChunkLoadError: Loading chunk 7 failed."))).toBe(true)
  })

  it("detecta el mensaje en un objeto con message que no es una instancia de Error", () => {
    expect(esErrorDeChunk({ message: "ChunkLoadError" })).toBe(true)
  })

  it("no clasifica como chunk un error de red genérico de API", () => {
    expect(esErrorDeChunk(new TypeError("Failed to fetch"))).toBe(false)
  })

  it("no clasifica como chunk errores genéricos, strings ni valores nulos", () => {
    expect(esErrorDeChunk(new Error("boom"))).toBe(false)
    expect(esErrorDeChunk("falló la operación")).toBe(false)
    expect(esErrorDeChunk(null)).toBe(false)
    expect(esErrorDeChunk(undefined)).toBe(false)
  })
})

describe("mensajeErrorCarga", () => {
  it("usa el copy del chunk y no expone stack ni la URL del módulo", () => {
    const error = new TypeError(
      "Failed to fetch dynamically imported module: /assets/DashboardPage-DrclDJxr.js\n    at importDashboard (router.tsx:6:1)",
    )

    expect(mensajeErrorCarga(error)).toEqual(COPY_CHUNK)
    const serialized = JSON.stringify(mensajeErrorCarga(error))
    expect(serialized).not.toContain("DashboardPage")
    expect(serialized).not.toContain("router.tsx")
    expect(serialized).not.toContain("    at ")
  })

  it("usa el copy del chunk para ChunkLoadError", () => {
    expect(mensajeErrorCarga("ChunkLoadError")).toEqual(COPY_CHUNK)
  })

  it("usa el copy general y reutiliza MENSAJE_ERROR_GENERICO para un error de red de API", () => {
    expect(mensajeErrorCarga(new TypeError("Failed to fetch"))).toEqual(COPY_GENERAL)
    expect(mensajeErrorCarga(new TypeError("Failed to fetch")).descripcion).toBe(
      MENSAJE_ERROR_GENERICO,
    )
  })

  it("usa el copy general para Error, string, null y undefined", () => {
    expect(mensajeErrorCarga(new Error("boom"))).toEqual(COPY_GENERAL)
    expect(mensajeErrorCarga("falló la operación")).toEqual(COPY_GENERAL)
    expect(mensajeErrorCarga(null)).toEqual(COPY_GENERAL)
    expect(mensajeErrorCarga(undefined)).toEqual(COPY_GENERAL)
  })
})
