import { describe, expect, it } from "vitest"
import {
  METODOS_PAGO_VALIDOS,
  MODOS_REDONDEO_VALIDOS,
  MODOS_REGISTRO_VALIDOS,
  esMetodoPago,
  esModoRedondeo,
  esModoRegistro,
  normalizarModoRedondeo,
  normalizarRegistrarSettings,
} from "./settingsFallback"
import type { RegistrarSettings, SplitSettings } from "@/services/types"

const LOCAL: RegistrarSettings = { metodo_default: "efectivo", modo_default: "detallado" }
const LOCAL_MODO: SplitSettings["modo_default"] = "preciso"

describe("normalizarRegistrarSettings", () => {
  it("acepta todas las combinaciones de las dos uniones", () => {
    for (const metodo_default of METODOS_PAGO_VALIDOS) {
      for (const modo_default of MODOS_REGISTRO_VALIDOS) {
        expect(normalizarRegistrarSettings({ metodo_default, modo_default }, LOCAL)).toEqual({
          metodo_default,
          modo_default,
        })
      }
    }
  })

  it("devuelve el local completo ante undefined, null o valores no-objeto", () => {
    const corruptos: unknown[] = [undefined, null, 42, "efectivo", true, ["efectivo"]]
    for (const raw of corruptos) {
      expect(normalizarRegistrarSettings(raw, LOCAL)).toEqual(LOCAL)
    }
  })

  it("cae al local campo por campo cuando un valor es inválido o corrupt", () => {
    const valoresInvalidos: unknown[] = [
      undefined,
      null,
      "",
      "cheque",
      "truncado",
      7,
      {},
      [],
      "EFECTIVO",
    ]
    for (const valor of valoresInvalidos) {
      expect(
        normalizarRegistrarSettings(
          { metodo_default: valor, modo_default: "distribuido" },
          LOCAL,
        ),
      ).toEqual({ metodo_default: "efectivo", modo_default: "distribuido" })
      expect(
        normalizarRegistrarSettings(
          { metodo_default: "qr", modo_default: valor },
          LOCAL,
        ),
      ).toEqual({ metodo_default: "qr", modo_default: "detallado" })
    }
  })

  it("un objeto vacío (o parcial) conserva los valores locales", () => {
    expect(normalizarRegistrarSettings({}, LOCAL)).toEqual(LOCAL)
    expect(
      normalizarRegistrarSettings(
        { metodo_default: "transaccion" },
        { metodo_default: "efectivo", modo_default: "distribuido" },
      ),
    ).toEqual({ metodo_default: "transaccion", modo_default: "distribuido" })
  })

  it("ignora campos extra y no muta el objeto de entrada", () => {
    const raw = {
      metodo_default: "qr",
      modo_default: "detallado",
      modo_redondeo: "truncado",
      modo: "enteros",
    }
    expect(normalizarRegistrarSettings(raw, LOCAL)).toEqual({
      metodo_default: "qr",
      modo_default: "detallado",
    })
    expect(Object.keys(raw)).toContain("modo_redondeo")
  })
})

describe("normalizarModoRedondeo", () => {
  it("acepta los tres modos del dominio", () => {
    for (const modo of MODOS_REDONDEO_VALIDOS) {
      expect(normalizarModoRedondeo(modo, LOCAL_MODO)).toBe(modo)
    }
  })

  it("devuelve el local ante undefined, null, inválidos y valores corruptos", () => {
    const corruptos: unknown[] = [
      undefined,
      null,
      "",
      "truncado",
      "preciso ",
      "Preciso",
      0,
      true,
      {},
      [],
    ]
    for (const raw of corruptos) {
      expect(normalizarModoRedondeo(raw, LOCAL_MODO)).toBe(LOCAL_MODO)
    }
  })

  it("respeta el local recibido (no asume 'preciso')", () => {
    expect(normalizarModoRedondeo(undefined, "enteros")).toBe("enteros")
    expect(normalizarModoRedondeo("truncado", "redondeado")).toBe("redondeado")
  })
})

describe("predicados de unión", () => {
  it("clasifican solo los valores permitidos", () => {
    expect(METODOS_PAGO_VALIDOS.every(esMetodoPago)).toBe(true)
    expect(MODOS_REGISTRO_VALIDOS.every(esModoRegistro)).toBe(true)
    expect(MODOS_REDONDEO_VALIDOS.every(esModoRedondeo)).toBe(true)
    expect(esMetodoPago("cheque")).toBe(false)
    expect(esModoRegistro("truncado")).toBe(false)
    expect(esModoRedondeo("truncado")).toBe(false)
  })
})
