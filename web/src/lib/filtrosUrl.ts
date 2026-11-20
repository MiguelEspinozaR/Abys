/**
 * Contrato de la URL del histórico (SPEC historial-a11y, R1/D5-D7).
 *
 * La URL es la fuente de verdad del estado *aplicado*. Este módulo solo lee,
 * valida y serializa; no usa React ni el DOM.
 *
 * Forma canónica:
 *   rango siempre presente (default `ytd`), `desde`/`hasta` solo en `custom`
 *   (ambos, `desde <= hasta`), `fuente` entero positivo y `metodo` válido solo
 *   cuando tienen valor. Orden fijo: rango, desde, hasta, fuente, metodo.
 */

import { esFechaISOValida } from "./validators"
import type { RangoPreset } from "./rango"

export const RANGOS = ["ytd", "365", "anio", "custom"] as const

export const TAB_DEFAULT = "cuentas" as const
export const TABS = ["cuentas", "fuentes", "registro", "splits"] as const
export type TabConfiguracion = (typeof TABS)[number]

const METODOS = ["efectivo", "qr", "transaccion"] as const
export type MetodoFiltro = (typeof METODOS)[number]

export interface FiltrosUrl {
  rango: RangoPreset
  desde?: string
  hasta?: string
  fuente?: number
  metodo?: MetodoFiltro
}

/** Errores inline por campo; objeto vacío = filtros válidos. */
export interface ErroresFiltros {
  desde?: string
  hasta?: string
}

function aSearchParams(search: string | URLSearchParams): URLSearchParams {
  if (search instanceof URLSearchParams) return search
  return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
}

function esRango(valor: string | null): valor is RangoPreset {
  return valor !== null && (RANGOS as readonly string[]).includes(valor)
}

function esMetodo(valor: string | null): valor is MetodoFiltro {
  return valor !== null && (METODOS as readonly string[]).includes(valor)
}

function esTab(valor: string | null): valor is TabConfiguracion {
  return valor !== null && (TABS as readonly string[]).includes(valor)
}

/**
 * Normaliza a la forma canónica. Si `custom` no tiene ambas fechas válidas y
 * ordenadas, se degrada a `ytd` para que la URL canónica siempre sea válida.
 */
function normalizar(filtros: FiltrosUrl): FiltrosUrl {
  const rango: RangoPreset = esRango(filtros.rango) ? filtros.rango : "ytd"

  if (rango === "custom") {
    const { desde, hasta } = filtros
    const valido =
      desde !== undefined &&
      hasta !== undefined &&
      esFechaISOValida(desde) &&
      esFechaISOValida(hasta) &&
      desde <= hasta

    if (valido) return { rango, desde, hasta, ...opcionales(filtros) }
    return { rango: "ytd", ...opcionales(filtros) }
  }

  return { rango, ...opcionales(filtros) }
}

function opcionales(filtros: FiltrosUrl): Pick<FiltrosUrl, "fuente" | "metodo"> {
  const resultado: Pick<FiltrosUrl, "fuente" | "metodo"> = {}
  if (Number.isInteger(filtros.fuente) && (filtros.fuente ?? 0) > 0) {
    resultado.fuente = filtros.fuente
  }
  if (esMetodo(filtros.metodo ?? null)) resultado.metodo = filtros.metodo
  return resultado
}

/**
 * Lee y sanitiza los filtros desde la URL.
 *
 * - `rango` inválido/ausente → `ytd`.
 * - Fechas solo se aceptan con `rango=custom`, válidas y `desde <= hasta`; si
 *   `custom` no queda completo se degrada a `ytd`.
 * - `fuente` debe ser un entero positivo; si se pasa `fuentesValidas` (fase 2,
 *   cuando `/fuentes` ya cargó) además debe existir.
 * - `metodo` debe ser `efectivo|qr|transaccion`.
 */
export function leerFiltros(
  search: string | URLSearchParams,
  opciones: { fuentesValidas?: ReadonlySet<number> } = {},
): FiltrosUrl {
  const params = aSearchParams(search)

  let rango: RangoPreset = "ytd"
  const rangoRaw = params.get("rango")
  if (esRango(rangoRaw)) rango = rangoRaw

  let desde: string | undefined
  let hasta: string | undefined
  if (rango === "custom") {
    const desdeRaw = params.get("desde")
    const hastaRaw = params.get("hasta")
    if (
      desdeRaw !== null &&
      hastaRaw !== null &&
      esFechaISOValida(desdeRaw) &&
      esFechaISOValida(hastaRaw) &&
      desdeRaw <= hastaRaw
    ) {
      desde = desdeRaw
      hasta = hastaRaw
    } else {
      rango = "ytd"
    }
  }

  let fuente: number | undefined
  const fuenteRaw = params.get("fuente")
  if (fuenteRaw !== null && /^\d+$/.test(fuenteRaw)) {
    const id = Number(fuenteRaw)
    const existe = opciones.fuentesValidas === undefined || opciones.fuentesValidas.has(id)
    if (Number.isInteger(id) && id > 0 && existe) fuente = id
  }

  const metodoRaw = params.get("metodo")
  const metodo = esMetodo(metodoRaw) ? metodoRaw : undefined

  return {
    rango,
    ...(desde !== undefined ? { desde, hasta } : {}),
    ...(fuente !== undefined ? { fuente } : {}),
    ...(metodo !== undefined ? { metodo } : {}),
  }
}

/**
 * Valida el borrador antes de aplicarlo. `custom` exige ambas fechas, que sean
 * fechas reales y que `desde <= hasta`.
 */
export function validarFiltros(filtros: FiltrosUrl): ErroresFiltros {
  if (filtros.rango !== "custom") return {}

  const errores: ErroresFiltros = {}
  if (!filtros.desde) {
    errores.desde = "Indica la fecha desde"
  } else if (!esFechaISOValida(filtros.desde)) {
    errores.desde = "Ingresa una fecha válida (AAAA-MM-DD)"
  }

  if (!filtros.hasta) {
    errores.hasta = "Indica la fecha hasta"
  } else if (!esFechaISOValida(filtros.hasta)) {
    errores.hasta = "Ingresa una fecha válida (AAAA-MM-DD)"
  }

  if (
    !errores.desde &&
    !errores.hasta &&
    filtros.desde !== undefined &&
    filtros.hasta !== undefined &&
    filtros.desde > filtros.hasta
  ) {
    errores.hasta = "La fecha hasta debe ser igual o posterior a desde"
  }

  return errores
}

/** Serializa en la forma canónica (sin `?`), con orden fijo e idempotente. */
export function serializarFiltros(filtros: FiltrosUrl): string {
  const normalizado = normalizar(filtros)
  const params = new URLSearchParams()

  params.set("rango", normalizado.rango)
  if (normalizado.rango === "custom" && normalizado.desde && normalizado.hasta) {
    params.set("desde", normalizado.desde)
    params.set("hasta", normalizado.hasta)
  }
  if (normalizado.fuente !== undefined) params.set("fuente", String(normalizado.fuente))
  if (normalizado.metodo !== undefined) params.set("metodo", normalizado.metodo)

  return params.toString()
}

/** Tab de `/configuracion`; default `cuentas`, inválido → `cuentas`. */
export function leerTab(search: string | URLSearchParams): TabConfiguracion {
  const tab = aSearchParams(search).get("tab")
  return esTab(tab) ? tab : TAB_DEFAULT
}

/** Serializa el tab canónico (sin `?`), degradando valores inválidos. */
export function serializarTab(tab: TabConfiguracion | string): string {
  const valido = esTab(tab) ? tab : TAB_DEFAULT
  return new URLSearchParams({ tab: valido }).toString()
}
