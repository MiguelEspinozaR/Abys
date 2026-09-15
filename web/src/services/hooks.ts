import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "./api"
import type {
  CambiarTasaPayload,
  CambioTasaResponse,
  Cuenta,
  CuentaPayload,
  DashboardSummary,
  Fuente,
  FuentePayload,
  GenerarSplitPayload,
  HealthInfo,
  HistorialTasa,
  HistoryData,
  MonthlyData,
  Pago,
  PagoPayload,
  PagosMeta,
  Split,
  Transaccion,
  WeeklyData,
  YearlyData,
} from "./types"

export const queryKeys = {
  fuentes: ["fuentes"] as const,
  cuentas: ["cuentas"] as const,
  pagos: ["pagos"] as const,
  pago: (id: number) => ["pagos", id] as const,
  split: (pagoId: number) => ["split", pagoId] as const,
  splits: ["splits"] as const,
  summary: (mes: number, anio: number) => ["dashboard", "summary", mes, anio] as const,
  history: ["dashboard", "history"] as const,
  weekly: (fecha: string) => ["dashboard", "weekly", fecha] as const,
  monthly: (mes: number, anio: number) => ["dashboard", "monthly", mes, anio] as const,
  yearly: (anio: number) => ["dashboard", "yearly", anio] as const,
  health: ["health"] as const,
  historialTasas: (cuentaId: number) => ["cuentas", cuentaId, "historial-tasas"] as const,
}

/** Filtros de listado de pagos aceptados por la API. */
export interface PagosFiltros {
  fecha_inicio?: string
  fecha_fin?: string
  fuente_id?: number
  metodo_pago?: string
  page?: number
  page_size?: number
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useFuentes() {
  return useQuery({
    queryKey: queryKeys.fuentes,
    queryFn: () => api.get<Fuente[]>("/fuentes"),
    staleTime: 30_000,
  })
}

export function useCuentas() {
  return useQuery({
    queryKey: queryKeys.cuentas,
    queryFn: () => api.get<Cuenta[]>("/cuentas"),
    staleTime: 30_000,
  })
}

export function usePagos(filtros: PagosFiltros = {}) {
  const params = new URLSearchParams()
  if (filtros.fecha_inicio) params.set("fecha_inicio", filtros.fecha_inicio)
  if (filtros.fecha_fin) params.set("fecha_fin", filtros.fecha_fin)
  if (filtros.fuente_id) params.set("fuente_id", String(filtros.fuente_id))
  if (filtros.metodo_pago) params.set("metodo_pago", filtros.metodo_pago)
  params.set("page", String(filtros.page ?? 1))
  params.set("page_size", String(filtros.page_size ?? 20))

  return useQuery({
    queryKey: [queryKeys.pagos, params.toString()],
    queryFn: () =>
      api.getRaw<{ data: Pago[]; meta: PagosMeta }>(`/pagos?${params.toString()}`),
    staleTime: 30_000,
  })
}

export function usePagoDetalle(id: number | null) {
  return useQuery({
    queryKey: queryKeys.pago(id ?? 0),
    queryFn: () => api.get<Pago>(`/pagos/${id}`),
    enabled: id != null,
    staleTime: 30_000,
  })
}

export function useSplitDetalle(pagoId: number | null) {
  return useQuery({
    queryKey: queryKeys.split(pagoId ?? 0),
    queryFn: () => api.get<Split | null>(`/pagos/${pagoId}/split`),
    enabled: pagoId != null,
    staleTime: 15_000,
  })
}

export function useSplits() {
  return useQuery({
    queryKey: queryKeys.splits,
    queryFn: () => api.get<Split[]>("/splits"),
    staleTime: 15_000,
  })
}

export function useSummary(mes: number, anio: number) {
  return useQuery({
    queryKey: queryKeys.summary(mes, anio),
    queryFn: () => api.get<DashboardSummary>(`/dashboard/summary?mes=${mes}&anio=${anio}`),
    staleTime: 30_000,
  })
}

export function useHistory() {
  return useQuery({
    queryKey: queryKeys.history,
    queryFn: () => api.get<HistoryData>("/dashboard/history"),
    staleTime: 60_000,
  })
}

export function useWeekly(fecha: string) {
  return useQuery({
    queryKey: queryKeys.weekly(fecha),
    queryFn: () => api.get<WeeklyData>(`/dashboard/weekly?fecha=${fecha}`),
    staleTime: 30_000,
  })
}

export function useMonthly(mes: number, anio: number) {
  return useQuery({
    queryKey: queryKeys.monthly(mes, anio),
    queryFn: () => api.get<MonthlyData>(`/dashboard/monthly?mes=${mes}&anio=${anio}`),
    staleTime: 30_000,
  })
}

export function useYearly(anio: number) {
  return useQuery({
    queryKey: queryKeys.yearly(anio),
    queryFn: () => api.get<YearlyData>(`/dashboard/yearly?anio=${anio}`),
    staleTime: 30_000,
  })
}

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => api.get<HealthInfo>("/health/db"),
    staleTime: 30_000,
    refetchInterval: false,
  })
}

export function useHistorialTasas(cuentaId: number | null) {
  return useQuery({
    queryKey: queryKeys.historialTasas(cuentaId ?? 0),
    queryFn: () => api.get<HistorialTasa[]>(`/cuentas/${cuentaId}/historial-tasas`),
    enabled: cuentaId != null,
    staleTime: 30_000,
  })
}

// ---------------------------------------------------------------------------
// Mutaciones
// ---------------------------------------------------------------------------

/** Invalida pagos + dashboard (montos cambian). */
function invalidarPagosYDashboard(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: queryKeys.pagos })
  qc.invalidateQueries({ queryKey: ["dashboard"] })
}

export function useCrearPago() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: PagoPayload) => api.post<Pago>("/pagos", payload),
    onSuccess: (pago) => {
      toast.success("Pago registrado", {
        description: `Pago #${pago.id} creado correctamente.`,
      })
      invalidarPagosYDashboard(qc)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useActualizarPago() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: PagoPayload }) =>
      api.put<Pago>(`/pagos/${id}`, payload),
    onSuccess: (pago) => {
      toast.success(`Pago #${pago.id} actualizado`)
      invalidarPagosYDashboard(qc)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useEliminarPago() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<{ deleted: boolean; id: number }>(`/pagos/${id}`),
    onSuccess: (res) => {
      toast.success(`Pago #${res.id} eliminado`)
      invalidarPagosYDashboard(qc)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useSubirComprobante() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, archivo }: { id: number; archivo: File }) => {
      const fd = new FormData()
      fd.append("archivo", archivo)
      return api.postForm<{ id: number; imagen_ruta: string }>(`/pagos/${id}/comprobante`, fd)
    },
    onSuccess: (res) => {
      toast.success(`Comprobante subido a pago #${res.id}`)
      qc.invalidateQueries({ queryKey: queryKeys.pagos })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useGenerarSplit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: GenerarSplitPayload) => api.post<Split>("/splits", payload),
    onSuccess: (split) => {
      toast.success(`Split ${split.modo_calculo} generado`)
      qc.invalidateQueries({ queryKey: queryKeys.pagos })
      qc.invalidateQueries({ queryKey: queryKeys.splits })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useEliminarSplit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<{ eliminado: boolean; id: number }>(`/splits/${id}`),
    onSuccess: () => {
      toast.success("Split eliminado")
      qc.invalidateQueries({ queryKey: queryKeys.pagos })
      qc.invalidateQueries({ queryKey: queryKeys.splits })
      qc.invalidateQueries({ queryKey: ["split"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useMarcarRealizada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api.put<Transaccion>(`/transacciones/${id}/realizar`),
    onSuccess: (tx) => {
      toast.success(`Transacción a ${tx.alias_snapshot} realizada`)
      qc.invalidateQueries({ queryKey: queryKeys.splits })
      qc.invalidateQueries({ queryKey: ["split"] })
      qc.invalidateQueries({ queryKey: queryKeys.pagos })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useCambiarTasa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CambiarTasaPayload }) =>
      api.put<CambioTasaResponse>(`/cuentas/${id}/tasa`, payload),
    onSuccess: (res) => {
      if (res.splits_recalculados > 0) {
        toast.success(
          `Tasa actualizada a ${(res.tasa_bps / 100).toLocaleString("es-BO")}%. ${res.splits_recalculados} split(s) recalculado(s).`,
        )
      } else {
        toast.success(`Tasa actualizada a ${(res.tasa_bps / 100).toLocaleString("es-BO")}%`)
      }
      qc.invalidateQueries({ queryKey: queryKeys.cuentas })
      qc.invalidateQueries({ queryKey: queryKeys.splits })
      qc.invalidateQueries({ queryKey: ["split"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ---------------------------------------------------------------------------
// CRUD de fuentes y cuentas
// ---------------------------------------------------------------------------

export function useCrearFuente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: FuentePayload) => api.post<Fuente>("/fuentes", payload),
    onSuccess: (f) => {
      toast.success(`Fuente "${f.alias}" creada`)
      qc.invalidateQueries({ queryKey: queryKeys.fuentes })
      qc.invalidateQueries({ queryKey: queryKeys.pagos })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useActualizarFuente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: FuentePayload }) =>
      api.put<{ id: number; actualizado: boolean }>(`/fuentes/${id}`, payload),
    onSuccess: () => {
      toast.success("Fuente actualizada")
      qc.invalidateQueries({ queryKey: queryKeys.fuentes })
      qc.invalidateQueries({ queryKey: queryKeys.pagos })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useEliminarFuente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<{ eliminado: boolean; id: number }>(`/fuentes/${id}`),
    onSuccess: () => {
      toast.success("Fuente eliminada")
      qc.invalidateQueries({ queryKey: queryKeys.fuentes })
      qc.invalidateQueries({ queryKey: queryKeys.pagos })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useCrearCuenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CuentaPayload) => api.post<Cuenta>("/cuentas", payload),
    onSuccess: (c) => {
      toast.success(`Cuenta "${c.alias}" creada`)
      qc.invalidateQueries({ queryKey: queryKeys.cuentas })
      qc.invalidateQueries({ queryKey: queryKeys.splits })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useActualizarCuenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CuentaPayload }) =>
      api.put<Cuenta>(`/cuentas/${id}`, payload),
    onSuccess: () => {
      toast.success("Cuenta actualizada")
      qc.invalidateQueries({ queryKey: queryKeys.cuentas })
      qc.invalidateQueries({ queryKey: queryKeys.splits })
      qc.invalidateQueries({ queryKey: ["split"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useEliminarCuenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<{ eliminado: boolean; id: number }>(`/cuentas/${id}`),
    onSuccess: () => {
      toast.success("Cuenta eliminada")
      qc.invalidateQueries({ queryKey: queryKeys.cuentas })
      qc.invalidateQueries({ queryKey: queryKeys.splits })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useSubirQR() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, archivo }: { id: number; archivo: File }) => {
      const fd = new FormData()
      fd.append("archivo", archivo)
      return api.postForm<{ id: number; qr_ruta: string }>(`/cuentas/${id}/qr`, fd)
    },
    onSuccess: () => {
      toast.success("QR subido")
      qc.invalidateQueries({ queryKey: queryKeys.cuentas })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useEliminarQR() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<{ id: number; qr_ruta: null }>(`/cuentas/${id}/qr`),
    onSuccess: () => {
      toast.success("QR eliminado")
      qc.invalidateQueries({ queryKey: queryKeys.cuentas })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}