import { describe, expect, it } from "vitest"
import { extraerDatosComprobante } from "./ocr"

describe("extraerDatosComprobante", () => {
  it("toma el monto debitado y no el saldo ni el número de operación", () => {
    const texto = [
      "BANCO UNION S.A.",
      "Comprobante de transferencia",
      "Operación No. 94412345678",
      "Monto debitado Bs 1.250,00",
      "Saldo Bs 944,00",
      "Fecha 05/10/2026",
    ].join("\n")
    const r = extraerDatosComprobante(texto)
    expect(r.monto_enteros).toBe(125000)
    expect(r.fecha).toBe("2026-10-05")
  })

  it("no confunde un número largo de operación con el monto", () => {
    const texto = "Autorizacion 94412345678\nImporte pagado: Bs 2.480,50"
    expect(extraerDatosComprobante(texto).monto_enteros).toBe(248050)
  })

  it("detecta el monto sin la palabra Bs y con separador de miles", () => {
    const texto = "Pago de servicios\nMonto 1.980,00\nGracias"
    expect(extraerDatosComprobante(texto).monto_enteros).toBe(198000)
  })

  it("descarta años y horas al buscar el monto", () => {
    const texto = "Fecha: 2026-10-05 08:30\nTotal pagado 640,00"
    expect(extraerDatosComprobante(texto).monto_enteros).toBe(64000)
  })

  it("extrae la descripción/comentario del comprobante", () => {
    const texto = ["Monto debitado Bs 500,00", "Descripcion: Pago servicio electrico"].join("\n")
    const r = extraerDatosComprobante(texto)
    expect(r.descripcion).toBe("Pago servicio electrico")
  })

  it("no inventa monto cuando solo hay números fuera de rango", () => {
    const texto = "Operacion 1234567890123\nReferencia 0000"
    expect(extraerDatosComprobante(texto).monto_enteros).toBeUndefined()
  })

  it("valida el rango de la fecha detectada", () => {
    expect(extraerDatosComprobante("fecha 2026-13-45").fecha).toBeUndefined()
  })
})
