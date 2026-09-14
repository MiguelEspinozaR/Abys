/**
 * Tipos TypeScript alineados 1:1 con los contratos reales de la API
 * (verificados por curl contra http://localhost:8080/api/v1).
 */

/** Envoltorio genérico de respuestas de la API: { data, meta?, status? }. */
export interface ApiEnvelope<T> {
  data: T
  status?: string
  meta?: PagosMeta
}

export interface PagosMeta {
  page: number
  page_size: number
  total: number
  total_pages: number
}

/** Error tipado devuelto por la API: { error: { code, message } }. */
export interface ApiErrorBody {
  error: {
    code: string
    message: string
  }
}

export interface Fuente {
  id: number
  alias: string
  color: string
  logo_ruta: string | null
  created_at: string
  updated_at: string
}

export interface Cuenta {
  id: number
  alias: string
  banco: string | null
  numero: string | null
  qr_ruta: string | null
  es_general: boolean
  tasa_bps: number
  created_at: string
  updated_at: string
}

export type MetodoPago = "efectivo" | "qr" | "transaccion"

export interface DiaTrabajado {
  id: number
  pago_id: number
  fecha: string // YYYY-MM-DD
}

export interface Pago {
  id: number
  fuente_id: number
  fecha_pago: string // YYYY-MM-DD
  monto_enteros: number
  metodo_pago: MetodoPago
  notas: string | null
  imagen_ruta: string | null
  created_at: string
  updated_at: string
  fuente_alias?: string | null
  fuente_color?: string | null
  dias_trabajados: DiaTrabajado[]
  /** Presentes solo cuando el pago ya tiene split. */
  split_id?: number | null
  split_modo?: string | null
}

export interface Transaccion {
  id: number
  split_id: number
  cuenta_id: number
  alias_snapshot: string
  monto_enteros: number
  tasa_bps: number
  realizado: boolean
  fecha_realizacion: string | null
  created_at: string
  updated_at: string
}

export interface Split {
  id: number
  pago_id: number
  modo_calculo: string // redondeado | enteros | preciso
  total_pendiente: number
  total_realizado: number
  transacciones: Transaccion[]
  created_at: string
  updated_at: string
}

export interface DashboardSummary {
  mes: number
  anio: number
  total_centavos: number
  cantidad_pagos: number
  dias_trabajados: number
}

export interface HistoryMonth {
  anio: number
  mes: number
  total_centavos: number
  cantidad_pagos: number
}

export interface HistoryData {
  por_mes: HistoryMonth[]
}

export interface WeeklyDay {
  fecha: string
  total_centavos: number
  cantidad_pagos: number
}

export interface WeeklyData {
  semana_inicio: string
  semana_fin: string
  dias: WeeklyDay[]
}

export interface MonthlyWeek {
  semana: number
  inicio: string
  fin: string
  total_centavos: number
  cantidad_pagos: number
}

export interface MonthlyData {
  mes: number
  anio: number
  semanas: MonthlyWeek[]
}

export interface YearlyData {
  anio: number
  meses: { mes: number; total_centavos: number; cantidad_pagos: number }[]
}

export interface HealthTable {
  nombre: string
  registros: number
}

export interface HealthInfo {
  conexion: string
  latencia_ms: number
  version_pg: string
  tamano_db: string
  tablas: HealthTable[]
}

export interface HistorialTasa {
  id: number
  cuenta_id: number
  tasa_bps: number
  aplicada_desde: string
  created_at: string
}

export interface CambioTasaResponse {
  tasa_bps: number
  splits_recalculados: number
  registrado: boolean
}

/** Body de POST/PUT de pagos (sin id). */
export interface PagoPayload {
  fuente_id: number
  fecha_pago: string
  monto_enteros: number
  metodo_pago: MetodoPago
  notas?: string | null
  dias_trabajados?: string[]
}

export interface FuentePayload {
  alias: string
  color: string
  logo_ruta?: string | null
}

export interface CuentaPayload {
  alias: string
  numero?: string | null
  banco?: string | null
}

export interface GenerarSplitPayload {
  pago_id: number
  modo_calculo: "redondeado" | "enteros" | "preciso"
}

export interface CambiarTasaPayload {
  tasa: number // en %
  aplicar_pendientes: boolean
}