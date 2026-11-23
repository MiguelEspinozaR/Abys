/**
 * Tipos TypeScript alineados 1:1 con los contratos reales de la API
 * (verificados por curl contra http://localhost:8080/api/v1).
 */

import type { MetodoPago, ModoDistribucion, ModoRegistro } from "@/lib/dominio"

// La definición única está en dominio.ts; se reexportan para no romper imports existentes.
export type { MetodoPago, ModoDistribucion, ModoRegistro } from "@/lib/dominio"

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
  split_auto: boolean
  split_auto_modo: "redondeado" | "enteros" | "preciso" | null
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

/** Defaults globales de registro (GET/PUT /settings/registrar). */
export interface RegistrarSettings {
  metodo_default: MetodoPago
  modo_default: ModoRegistro
}

export interface DiaTrabajado {
  id: number
  pago_id: number
  fecha: string // YYYY-MM-DD
  monto_enteros: number // centavos (>= 0)
}

/** Día trabajado enviado en POST/PUT (sin id). */
export interface DiaTrabajadoInput {
  fecha: string // YYYY-MM-DD
  monto_enteros: number // centavos (>= 0)
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

/**
 * Contratos del dashboard (R11.2). Todos los montos van en centavos y se
 * agrupan por `dias_trabajados.fecha`. `por_fuente` incluye fuentes
 * soft-deleted para preservar alias/colores históricos (D15).
 */

/** Desglose por fuente presente en weekly y en las distribuciones. */
export interface FuenteTotal {
  fuente_id: number
  alias: string
  color: string
  total_centavos: number
}

/** GET /dashboard/summary (sin parámetros de mes/año). */
export interface DashboardSummary {
  total_30d_centavos: number
  total_historico_centavos: number
}

export interface HistoryMonth {
  anio: number
  mes: number
  total_centavos: number
}

/** GET /dashboard/history (sólo totales mensuales). */
export interface HistoryData {
  por_mes: HistoryMonth[]
}

export interface WeeklyDay {
  fecha: string
  total_centavos: number
  por_fuente: FuenteTotal[]
}

/** GET /dashboard/weekly?fecha= */
export interface WeeklyData {
  semana_inicio: string
  semana_fin: string
  dias: WeeklyDay[]
}

export interface MonthlyBloque {
  bloque: number
  inicio: string
  fin: string
  total_centavos: number
}

/** GET /dashboard/monthly?mes=&anio= (bloques 1–7, 8–14, …). */
export interface MonthlyData {
  mes: number
  anio: number
  bloques: MonthlyBloque[]
}

export interface YearlyMes {
  mes: number
  total_centavos: number
}

/** GET /dashboard/yearly?anio= (12 meses, 0 en los vacíos). */
export interface YearlyData {
  anio: number
  meses: YearlyMes[]
}

/** Común a las dos distribuciones por fuente. */
export interface DistributionData {
  total_centavos: number
  por_fuente: FuenteTotal[]
}

/** GET /dashboard/distribution/monthly?mes=&anio= */
export interface DistributionMonthlyData extends DistributionData {
  mes: number
  anio: number
}

/** GET /dashboard/distribution/yearly?anio= */
export interface DistributionYearlyData extends DistributionData {
  anio: number
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

/** Body de POST/PUT de pagos (sin id). El total se deriva de Σ días. */
export interface PagoPayload {
  fuente_id: number
  fecha_pago: string
  /** Opcional: el backend deriva el total de Σ días; omitirlo evita 422 por desajuste (R3.2). */
  monto_enteros?: number
  metodo_pago: MetodoPago
  notas?: string | null
  dias_trabajados: DiaTrabajadoInput[]
}

export interface FuentePayload {
  alias: string
  color: string
  logo_ruta?: string | null
  split_auto: boolean
  split_auto_modo?: ModoDistribucion | null
}

export interface SplitSettings {
  modo_default: ModoDistribucion
}

export interface CuentaPayload {
  alias: string
  numero?: string | null
  banco?: string | null
}

export interface GenerarSplitPayload {
  pago_id: number
  modo_calculo: ModoDistribucion
}

export interface CambiarTasaPayload {
  tasa: number // en %
  aplicar_pendientes: boolean
}