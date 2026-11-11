import { describe, expect, it } from "vitest"
import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_MB,
  TIPOS_PERMITIDOS,
  validarArchivo,
} from "./uploads"

/** Archivo mínimo para probar la validación pura sin reservar memoria real. */
function archivo(type: string, size: number) {
  return { type, size }
}

describe("constantes de uploads", () => {
  it("define el límite de 10 MB y los tipos exactos", () => {
    expect(MAX_UPLOAD_MB).toBe(10)
    expect(MAX_UPLOAD_BYTES).toBe(10 * 1024 * 1024)
    expect(TIPOS_PERMITIDOS).toEqual([
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
    ])
  })
})

describe("validarArchivo", () => {
  it("rechaza PDF y texto plano", () => {
    expect(validarArchivo(archivo("application/pdf", 1024))).not.toBeNull()
    expect(validarArchivo(archivo("text/plain", 1024))).not.toBeNull()
  })

  it("rechaza tipos de imagen fuera de la lista exacta", () => {
    expect(validarArchivo(archivo("image/jpg", 1024))).not.toBeNull()
    expect(validarArchivo(archivo("image/svg+xml", 1024))).not.toBeNull()
    expect(validarArchivo(archivo("", 1024))).not.toBeNull()
  })

  it("rechaza archivos de 11 MB aunque el tipo sea válido", () => {
    expect(validarArchivo(archivo("image/png", 11 * 1024 * 1024))).not.toBeNull()
  })

  it("acepta PNG/JPG/WEBP/GIF dentro del límite", () => {
    for (const tipo of TIPOS_PERMITIDOS) {
      expect(validarArchivo(archivo(tipo, 1024))).toBeNull()
    }
  })

  it("acepta exactamente 10 MB y rechaza un byte más", () => {
    expect(validarArchivo(archivo("image/jpeg", MAX_UPLOAD_BYTES))).toBeNull()
    expect(validarArchivo(archivo("image/jpeg", MAX_UPLOAD_BYTES + 1))).not.toBeNull()
  })
})
