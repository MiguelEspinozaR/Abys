import { describe, expect, it } from "vitest"
import {
  aniosDelRango,
  calcularRango,
  hoyEnLaPaz,
  interseccionConAnio,
  sumarDiasISO,
} from "./rango"

describe("hoyEnLaPaz", () => {
  it("usa America/La_Paz, no la zona del navegador, en el cruce UTC", () => {
    // 02:00Z del 1 de enero = 22:00 del 31 de diciembre en La Paz (UTC-4).
    expect(hoyEnLaPaz(new Date("2026-01-01T02:00:00Z"))).toBe("2025-12-31")
    // 04:00Z del 1 de enero = 00:00 del 1 de enero en La Paz.
    expect(hoyEnLaPaz(new Date("2026-01-01T04:00:00Z"))).toBe("2026-01-01")
  })

  it("devuelve la fecha del día en horario laboral boliviano", () => {
    expect(hoyEnLaPaz(new Date("2026-11-15T16:00:00Z"))).toBe("2026-11-15")
  })
})

describe("calcularRango", () => {
  it("ytd empieza el 1 de enero del año actual (incluido enero)", () => {
    expect(calcularRango("ytd", new Date("2026-01-15T15:00:00Z"))).toEqual({
      desde: "2026-01-01",
      hasta: "2026-01-15",
    })
  })

  it("ytd en diciembre conserva el mismo año", () => {
    expect(calcularRango("ytd", new Date("2026-12-31T15:00:00Z"))).toEqual({
      desde: "2026-01-01",
      hasta: "2026-12-31",
    })
  })

  it("365 resta exactamente 365 días", () => {
    expect(calcularRango("365", new Date("2026-11-15T15:00:00Z"))).toEqual({
      desde: "2025-11-15",
      hasta: "2026-11-15",
    })
  })

  it("365 cruza un año bisiesto sin contar el 29 de febrero de más", () => {
    // 2024 es bisiesto: 365 días antes del 1 de marzo de 2024 es el 2 de marzo de 2023.
    expect(calcularRango("365", new Date("2024-03-01T15:00:00Z"))).toEqual({
      desde: "2023-03-02",
      hasta: "2024-03-01",
    })
  })

  it("anio no tiene límites", () => {
    expect(calcularRango("anio", new Date("2026-11-15T15:00:00Z"))).toEqual({})
  })

  it("custom devuelve las fechas sanitizadas", () => {
    expect(
      calcularRango("custom", new Date("2026-11-15T15:00:00Z"), {
        desde: "2025-06-01",
        hasta: "2025-12-31",
      }),
    ).toEqual({ desde: "2025-06-01", hasta: "2025-12-31" })
  })
})

describe("sumarDiasISO", () => {
  it("cruza meses y años", () => {
    expect(sumarDiasISO("2026-01-01", -1)).toBe("2025-12-31")
    expect(sumarDiasISO("2026-01-31", 1)).toBe("2026-02-01")
    expect(sumarDiasISO("2026-12-31", 1)).toBe("2027-01-01")
  })

  it("respeta los años bisiestos", () => {
    expect(sumarDiasISO("2024-02-28", 1)).toBe("2024-02-29")
    expect(sumarDiasISO("2024-02-29", 1)).toBe("2024-03-01")
    expect(sumarDiasISO("2023-02-28", 1)).toBe("2023-03-01")
  })
})

describe("interseccionConAnio", () => {
  it("recorta el rango a los bordes del año", () => {
    expect(
      interseccionConAnio({ desde: "2025-06-01", hasta: "2026-06-30" }, 2026),
    ).toEqual({ desde: "2026-01-01", hasta: "2026-06-30" })

    expect(
      interseccionConAnio({ desde: "2025-06-01", hasta: "2026-06-30" }, 2025),
    ).toEqual({ desde: "2025-06-01", hasta: "2025-12-31" })
  })

  it("sin límites usa el año completo", () => {
    expect(interseccionConAnio({}, 2026)).toEqual({
      desde: "2026-01-01",
      hasta: "2026-12-31",
    })
  })
})

describe("aniosDelRango", () => {
  it("devuelve todos los años del intervalo en orden descendente", () => {
    expect(aniosDelRango("2024-12-31", "2026-01-01")).toEqual([2026, 2025, 2024])
  })

  it("incluye años parciales en los bordes", () => {
    expect(aniosDelRango("2025-12-31", "2026-01-01")).toEqual([2026, 2025])
    expect(aniosDelRango("2024-11-15", undefined)).toEqual([2024])
    expect(aniosDelRango(undefined, "2026-11-15")).toEqual([2026])
  })

  it("sin bordes no hay candidatos", () => {
    expect(aniosDelRango()).toEqual([])
  })

  it("un rango invertido no produce años", () => {
    expect(aniosDelRango("2026-01-01", "2025-01-01")).toEqual([])
  })
})
