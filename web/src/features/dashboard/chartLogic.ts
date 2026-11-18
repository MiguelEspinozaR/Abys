/**
 * Lógica pura de los charts del dashboard (M4).
 *
 * Agrupa, rotula y deriva valores sin tocar React ni Recharts para poder
 * verificarla con tests unitarios. Todos los montos siguen siendo centavos.
 */

import { format } from "date-fns"
import { es } from "date-fns/locale"
import { MESES_ABREV, fromISODate } from "@/lib/format"
import type {
  DistributionData,
  FuenteTotal,
  HistoryData,
  MonthlyData,
  WeeklyDay,
  YearlyData,
} from "@/services/types"

/** Etiqueta corta del mes a partir de su número (1 → "ene"), nunca del índice. */
export function etiquetaMes(mes: number): string {
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) return String(mes)
  return MESES_ABREV[mes - 1] ?? String(mes)
}

/** "2026-10-01" + "2026-10-07" → "1–7". */
export function etiquetaBloque(inicio: string, fin: string): string {
  const dia = (iso: string) => {
    const valor = Number(iso.slice(8, 10))
    return Number.isInteger(valor) && valor >= 1 && valor <= 31 ? valor : null
  }
  const desde = dia(inicio)
  const hasta = dia(fin)
  return desde !== null && hasta !== null ? `${desde}–${hasta}` : "—"
}

/** Dedup por fuente (sumando montos), orden determinista por `fuente_id`. */
export function fuentesUnicas(fuentes: FuenteTotal[]): FuenteTotal[] {
  const porId = new Map<number, FuenteTotal>()
  for (const fuente of fuentes) {
    const anterior = porId.get(fuente.fuente_id)
    porId.set(
      fuente.fuente_id,
      anterior
        ? { ...anterior, total_centavos: anterior.total_centavos + fuente.total_centavos }
        : { ...fuente },
    )
  }
  return [...porId.values()].sort((a, b) => a.fuente_id - b.fuente_id)
}

/** Clave de serie/objeto para una fuente (estable y válida como dataKey). */
export function claveFuente(fuenteId: number): string {
  return `fuente-${fuenteId}`
}

export const VARIANTES_PATRON = 6

/** Variante de patrón determinista por fuente, sin depender del orden de la API. */
export function variantePatron(fuenteId: number): number {
  return ((fuenteId % VARIANTES_PATRON) + VARIANTES_PATRON) % VARIANTES_PATRON
}

/** Id SVG estable para el patrón de una fuente dentro de un gráfico. */
export function idPatron(prefijo: string, fuenteId: number): string {
  return `${prefijo}-patron-fuente-${fuenteId}`
}

/** Valor `fill` que apunta al patrón de una fuente. */
export function patronFill(prefijo: string, fuenteId: number): string {
  return `url(#${idPatron(prefijo, fuenteId)})`
}

export interface FilaSemana {
  nombre: string
  fecha: string
  total_centavos: number
  /** Una clave `fuente-${id}` por fuente de la semana. */
  [clave: string]: string | number
}

/** Filas del apilado semanal: una columna por fuente + el total del día. */
export function filasApiladas(dias: WeeklyDay[]): FilaSemana[] {
  const fuentes = fuentesUnicas(dias.flatMap((dia) => dia.por_fuente))
  return dias.map((dia) => {
    const porId = new Map(dia.por_fuente.map((f) => [f.fuente_id, f.total_centavos]))
    const fila: FilaSemana = {
      nombre: format(fromISODate(dia.fecha), "EEE d", { locale: es }).replace(".", ""),
      fecha: dia.fecha,
      total_centavos: dia.total_centavos,
    }
    for (const fuente of fuentes) {
      fila[claveFuente(fuente.fuente_id)] = porId.get(fuente.fuente_id) ?? 0
    }
    return fila
  })
}

export interface FilaBloque {
  nombre: string
  total_centavos: number
}

export function filasBloques(data: MonthlyData): FilaBloque[] {
  return data.bloques.map((bloque) => ({
    nombre: etiquetaBloque(bloque.inicio, bloque.fin),
    total_centavos: bloque.total_centavos,
  }))
}

export interface FilaMes {
  nombre: string
  total_centavos: number
}

export function filasMeses(data: YearlyData): FilaMes[] {
  return data.meses.map((mes) => ({
    nombre: etiquetaMes(mes.mes),
    total_centavos: mes.total_centavos,
  }))
}

export interface FilaHistorial {
  nombre: string
  total_centavos: number
}

/** Meses visibles del histórico, en el orden devuelto por la API. Sólo totales. */
export function filasHistorial(
  data: HistoryData,
  desde: { anio: number; mes: number },
  hasta: { anio: number; mes: number },
): FilaHistorial[] {
  const clave = (anio: number, mes: number) => anio * 100 + mes
  return data.por_mes
    .filter(
      (punto) =>
        clave(punto.anio, punto.mes) >= clave(desde.anio, desde.mes) &&
        clave(punto.anio, punto.mes) <= clave(hasta.anio, hasta.mes),
    )
    .map((punto) => ({
      nombre: `${String(punto.anio).slice(-2)} ${etiquetaMes(punto.mes)}`.trim(),
      total_centavos: punto.total_centavos,
    }))
}

const nfPorcentaje = new Intl.NumberFormat("es-BO", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

/** Porcentaje visible de una fuente respecto al total del período. */
export function porcentajeFuente(totalCentavos: number, totalGeneral: number): string {
  if (!Number.isFinite(totalCentavos) || !Number.isFinite(totalGeneral) || totalGeneral <= 0) {
    return "0 %"
  }
  return `${nfPorcentaje.format((totalCentavos / totalGeneral) * 100)} %`
}

export interface FilaDistribucion extends FuenteTotal {
  porcentaje: string
}

export function filasDistribucion(data: DistributionData): FilaDistribucion[] {
  return fuentesUnicas(data.por_fuente).map((fuente) => ({
    ...fuente,
    porcentaje: porcentajeFuente(fuente.total_centavos, data.total_centavos),
  }))
}
