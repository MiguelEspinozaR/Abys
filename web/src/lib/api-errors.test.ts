import { describe, expect, it } from "vitest"
import type { ApiRequestError } from "@/services/api"
import {
  ERRORES_API_CUENTA,
  ERRORES_API_EDITAR_PAGO,
  ERRORES_API_FUENTE,
  ERRORES_API_GENERAR_SPLIT,
  ERRORES_API_REGISTRAR,
  ERRORES_API_TASA,
  MENSAJE_ERROR_GENERICO,
  resolverErrorApi,
} from "./api-errors"

/** Construye el mínimo estructural de un ApiRequestError sin tocar la red. */
function errorApi(
  code: string,
  status: number,
  message = "el backend explica el problema",
): ApiRequestError {
  return { name: "ApiRequestError", code, status, message } as ApiRequestError
}

describe("resolverErrorApi — 400 VALIDATION_ERROR", () => {
  it("asigna el campo explícito del formulario cuando existe (conocido)", () => {
    const r = resolverErrorApi(
      errorApi("VALIDATION_ERROR", 400, "el alias de la cuenta es obligatorio"),
      ERRORES_API_CUENTA,
    )
    expect(r).toEqual({
      campo: "alias",
      mensaje: "el alias de la cuenta es obligatorio",
      reintentar: false,
    })
  })

  it("usa el resumen cuando el formulario no define campo para 400 (desconocido)", () => {
    const r = resolverErrorApi(
      errorApi("VALIDATION_ERROR", 400, "alias o color inválido"),
      ERRORES_API_FUENTE,
    )
    expect(r.campo).toBeUndefined()
    expect(r.mensaje).toBe("alias o color inválido")
    expect(r.reintentar).toBe(false)
  })

  it("también mapea por status 400 aunque el code no sea el esperado", () => {
    const r = resolverErrorApi(errorApi("ERROR", 400), ERRORES_API_TASA)
    expect(r.campo).toBe("tasa")
  })
})

describe("resolverErrorApi — 409 BUSINESS_RULE_CONFLICT", () => {
  it("mapea al campo tasa cuando la regla es de tasas", () => {
    const r = resolverErrorApi(
      errorApi("BUSINESS_RULE_CONFLICT", 409, "la suma de tasas superaría 100%"),
      ERRORES_API_TASA,
    )
    expect(r.campo).toBe("tasa")
    expect(r.mensaje).toBe("la suma de tasas superaría 100%")
  })

  it("cae al resumen en formularios sin campo de conflicto", () => {
    const r = resolverErrorApi(
      errorApi("BUSINESS_RULE_CONFLICT", 409, "la fuente ya existe"),
      ERRORES_API_FUENTE,
    )
    expect(r.campo).toBeUndefined()
    expect(r.reintentar).toBe(false)
  })
})

describe("resolverErrorApi — 422 IMMUTABLE_DATA", () => {
  it("mapea al campo monto en pagos con split", () => {
    const r = resolverErrorApi(
      errorApi(
        "IMMUTABLE_DATA",
        422,
        "no se puede cambiar el monto de un pago con split",
      ),
      ERRORES_API_EDITAR_PAGO,
    )
    expect(r.campo).toBe("monto")
    expect(r.mensaje).toBe("no se puede cambiar el monto de un pago con split")
  })

  it("no inventa campo monto en formularios que no lo declaran", () => {
    const r = resolverErrorApi(errorApi("IMMUTABLE_DATA", 422), ERRORES_API_GENERAR_SPLIT)
    expect(r.campo).toBeUndefined()
  })
})

describe("resolverErrorApi — red, 500 y mensajes", () => {
  it("NETWORK_ERROR/status 0 va al resumen y permite reintentar", () => {
    const r = resolverErrorApi(
      errorApi("NETWORK_ERROR", 0, "No se pudo conectar con el servidor."),
      ERRORES_API_REGISTRAR,
    )
    expect(r).toEqual({
      campo: undefined,
      mensaje: "No se pudo conectar con el servidor.",
      reintentar: true,
    })
  })

  it("INTERNAL_ERROR/500 va al resumen sin reintento automático", () => {
    const r = resolverErrorApi(errorApi("INTERNAL_ERROR", 500), ERRORES_API_REGISTRAR)
    expect(r.campo).toBeUndefined()
    expect(r.mensaje).toBe("el backend explica el problema")
    expect(r.reintentar).toBe(false)
  })

  it("muestra el mensaje del backend tal cual, sin interpretarlo", () => {
    const mensaje = "campo alias inválido según regla X"
    const r = resolverErrorApi(errorApi("VALIDATION_ERROR", 400, mensaje), ERRORES_API_FUENTE)
    expect(r.mensaje).toBe(mensaje)
    expect(r.campo).toBeUndefined()
  })

  it("usa un mensaje genérico si el backend no envía texto", () => {
    const r = resolverErrorApi(errorApi("INTERNAL_ERROR", 500, "   "), ERRORES_API_REGISTRAR)
    expect(r.mensaje).toBe(MENSAJE_ERROR_GENERICO)
  })

  it("no parsea el texto para asignar campos aunque mencione uno", () => {
    const r = resolverErrorApi(
      errorApi("VALIDATION_ERROR", 400, "monto inválido"),
      ERRORES_API_FUENTE,
    )
    expect(r.campo).toBeUndefined()
  })
})
