import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  normalizarModoRedondeo,
  normalizarRegistrarSettings,
} from "@/lib/settingsFallback"
import { useUiStore } from "@/store/uiStore"
import { realizarSeleccionados } from "@/features/splits/realizarSeleccionados"
import { api } from "./api"
import type {
  CambiarTasaPayload,
  CambioTasaResponse,
  Cuenta,
  CuentaPayload,
  DashboardSummary,
  DistributionMonthlyData,
  DistributionYearlyData,
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
  RegistrarSettings,
  Split,
  SplitSettings,
  Transaccion,
  WeeklyData,
  YearlyData,
} from "./types"

export const queryKeys = {
  fuentes: ["fuentes"] as const,
  cuentas: ["cuentas"] as const,
  pagos: ["pagos"] as const,
  splits: ["splits"] as const,
  splitSettings: ["settings", "split"] as const,
  registrarSettings: ["settings", "registrar"] as const,
  summary: ["dashboard", "summary"] as const,
  history: ["dashboard", "history"] as const,
  weekly: (fecha: string) => ["dashboard", "weekly", fecha] as const,
  monthly: (mes: number, anio: number) => ["dashboard", "monthly", mes, anio] as const,
  yearly: (anio: number) => ["dashboard", "yearly", anio] as const,
  distributionMonthly: (mes: number, anio: number) =>
    ["dashboard", "distribution", "monthly", mes, anio] as const,
  distributionYearly: (anio: number) =>
    ["dashboard", "distribution", "yearly", anio] as const,
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

/** Serializa los filtros de pagos en la query canónica (sin `?`). */
export function serializarFiltrosPagos(filtros: PagosFiltros = {}): string {
  const params = new URLSearchParams()
  if (filtros.fecha_inicio) params.set("fecha_inicio", filtros.fecha_inicio)
  if (filtros.fecha_fin) params.set("fecha_fin", filtros.fecha_fin)
  if (filtros.fuente_id) params.set("fuente_id", String(filtros.fuente_id))
  if (filtros.metodo_pago) params.set("metodo_pago", filtros.metodo_pago)
  params.set("page", String(filtros.page ?? 1))
  params.set("page_size", String(filtros.page_size ?? 20))
  return params.toString()
}

/** Clave propia del histórico: no colisiona con `usePagos` (`["pagos", ...]`). */
export function clavePagosPagina(filtros: PagosFiltros = {}) {
  return ["historial", "pagos", serializarFiltrosPagos(filtros)] as const
}

/**
 * GET de una página de pagos.
 *
 * El hook de página fue purgado, pero este helper (con `clavePagosPagina` y
 * `serializarFiltrosPagos`) se conserva: `useHistorial`
 * (`web/src/hooks/useHistorial.ts`) lo usa directamente para los conteos por
 * año y las páginas expandidas. Es el único punto de construcción de la query
 * paginada.
 */
export function fetchPagosPagina(filtros: PagosFiltros = {}) {
  const params = serializarFiltrosPagos(filtros)
  return api.getRaw<{ data: Pago[]; meta: PagosMeta }>(`/pagos?${params}`)
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

export function useSplits() {
  return useQuery({
    queryKey: queryKeys.splits,
    queryFn: () => api.get<Split[]>("/splits"),
    staleTime: 15_000,
  })
}

/**
 * Settings con fallback local (D4). Precedencia: **backend manda si responde**;
 * el valor de `abys-ui` se usa solo si la petición falla (5xx, red caída o
 * `NETWORK_ERROR`) o si el cuerpo es inválido. Por eso el `queryFn` atrapa el
 * error y devuelve el local en vez de propagarlo como `isError` (AC7).
 * La respuesta válida se replica al store persistido para la próxima sesión.
 */
export function useRegistrarSettings() {
  return useQuery({
    queryKey: queryKeys.registrarSettings,
    queryFn: async (): Promise<RegistrarSettings> => {
      const state = useUiStore.getState()
      const local: RegistrarSettings = {
        metodo_default: state.registrarMetodoDefault,
        modo_default: state.registrarModoDefault,
      }
      try {
        const crudo = await api.get<RegistrarSettings>("/settings/registrar")
        const valor = normalizarRegistrarSettings(crudo, local)
        useUiStore.setState({
          registrarMetodoDefault: valor.metodo_default,
          registrarModoDefault: valor.modo_default,
        })
        return valor
      } catch {
        return local
      }
    },
    staleTime: 60_000,
  })
}

/** Mismo patrón de fallback/replicación que `useRegistrarSettings` (R4.1). */
export function useSplitSettings() {
  return useQuery({
    queryKey: queryKeys.splitSettings,
    queryFn: async (): Promise<SplitSettings> => {
      const local: SplitSettings = {
        modo_default: useUiStore.getState().splitModoDefault,
      }
      try {
        const crudo = await api.get<SplitSettings>("/settings/split")
        const valor: SplitSettings = {
          modo_default: normalizarModoRedondeo(crudo?.modo_default, local.modo_default),
        }
        useUiStore.setState({ splitModoDefault: valor.modo_default })
        return valor
      } catch {
        return local
      }
    },
    staleTime: 60_000,
  })
}

export function useSummary() {
  return useQuery({
    queryKey: queryKeys.summary,
    queryFn: () => api.get<DashboardSummary>("/dashboard/summary"),
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

export function useDistributionMonthly(mes: number, anio: number) {
  return useQuery({
    queryKey: queryKeys.distributionMonthly(mes, anio),
    queryFn: () =>
      api.get<DistributionMonthlyData>(`/dashboard/distribution/monthly?mes=${mes}&anio=${anio}`),
    staleTime: 30_000,
  })
}

export function useDistributionYearly(anio: number) {
  return useQuery({
    queryKey: queryKeys.distributionYearly(anio),
    queryFn: () => api.get<DistributionYearlyData>(`/dashboard/distribution/yearly?anio=${anio}`),
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

/**
 * Invalida el histórico agrupado (`["historial", "pagos", params]`) junto con
 * las invalidaciones de pagos existentes, sin tocar `usePagos` ni sus claves.
 */
function invalidarHistorial(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["historial"] })
}

/** Invalida pagos + dashboard (montos cambian). */
function invalidarPagosYDashboard(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: queryKeys.pagos })
  qc.invalidateQueries({ queryKey: ["dashboard"] })
  invalidarHistorial(qc)
}

export function useCrearPago() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: PagoPayload) =>
      api.postRaw<{ data: Pago; split_auto?: boolean; split_warning?: string }>("/pagos", payload),
    onSuccess: (res) => {
      const pago = res.data
      if (res.split_warning) {
        toast.warning(`Pago #${pago.id} registrado sin split automático`, {
          description: res.split_warning,
        })
      } else if (res.split_auto) {
        toast.success("Pago registrado", {
          description: `Pago #${pago.id} creado con split automático.`,
        })
      } else {
        toast.success("Pago registrado", {
          description: `Pago #${pago.id} creado correctamente.`,
        })
      }
      invalidarPagosYDashboard(qc)
      qc.invalidateQueries({ queryKey: queryKeys.splits })
    },
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
      invalidarHistorial(qc)
    },
  })
}

export function useGenerarSplit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: GenerarSplitPayload) => api.post<Split>("/splits", payload),
    onSuccess: (split) => {
      toast.success(`Split ${split.modo_calculo} generado`)
      qc.invalidateQueries({ queryKey: queryKeys.pagos })
      invalidarHistorial(qc)
      qc.invalidateQueries({ queryKey: queryKeys.splits })
    },
  })
}

export function useEliminarSplit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<{ eliminado: boolean; id: number }>(`/splits/${id}`),
    onSuccess: () => {
      toast.success("Split eliminado")
      qc.invalidateQueries({ queryKey: queryKeys.pagos })
      invalidarHistorial(qc)
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
      invalidarHistorial(qc)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

/**
 * Realización múltiple sin endpoint bulk: un `PUT` por id con `Promise.allSettled`
 * y un único bloque de efectos (una notificación + una ronda de invalidaciones).
 * No llama a `useMarcarRealizada()`, que conserva sus efectos por transacción.
 */
export function useMarcarRealizadas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) =>
      realizarSeleccionados(ids, (id) => api.put<Transaccion>(`/transacciones/${id}/realizar`)),
    onSuccess: (resultado, ids) => {
      const { ok, fallidos } = resultado
      if (fallidos.length === 0) {
        toast.success(`${ok.length} transacciones marcadas como realizadas`)
      } else {
        toast.error(
          `${ok.length} de ${ids.length} transacciones marcadas como realizadas. Fallaron: ${fallidos
            .map((fallido) => `#${fallido.id}`)
            .join(", ")}.`,
        )
      }
      qc.invalidateQueries({ queryKey: queryKeys.splits })
      qc.invalidateQueries({ queryKey: ["split"] })
      qc.invalidateQueries({ queryKey: queryKeys.pagos })
      invalidarHistorial(qc)
    },
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
      invalidarHistorial(qc)
    },
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
      invalidarHistorial(qc)
    },
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
      invalidarHistorial(qc)
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

export function useSubirLogoFuente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, archivo }: { id: number; archivo: File }) => {
      const fd = new FormData()
      fd.append("archivo", archivo)
      return api.postForm<{ id: number; logo_ruta: string }>(`/fuentes/${id}/logo`, fd)
    },
    onSuccess: () => {
      toast.success("Logo actualizado")
      qc.invalidateQueries({ queryKey: queryKeys.fuentes })
    },
  })
}

export function useEliminarLogoFuente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api.delete<{ id: number; logo_ruta: null }>(`/fuentes/${id}/logo`),
    onSuccess: () => {
      toast.success("Logo eliminado")
      qc.invalidateQueries({ queryKey: queryKeys.fuentes })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useActualizarSplitSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: SplitSettings) =>
      api.put<SplitSettings>("/settings/split", payload),
    onSuccess: (res) => {
      // El valor confirmado por el backend pasa a ser el local (D4).
      useUiStore.setState({
        splitModoDefault: normalizarModoRedondeo(
          res?.modo_default,
          useUiStore.getState().splitModoDefault,
        ),
      })
      toast.success(`Modo por defecto: ${res.modo_default}`)
      qc.invalidateQueries({ queryKey: queryKeys.splitSettings })
    },
  })
}

/**
 * Escritura optimista de los defaults de registro (R3.5): se refleja de inmediato
 * en `abys-ui`, se envía el PUT y, si falla, se revierte al valor previo, se
 * notifica con `toast.error` y se relanza para que el select del configurador
 * también revierta. El éxito replica la respuesta y recarga la query.
 */
export function useActualizarRegistrarSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: RegistrarSettings) =>
      api.put<RegistrarSettings>("/settings/registrar", payload),
    onMutate: (payload) => {
      const previo = {
        registrarMetodoDefault: useUiStore.getState().registrarMetodoDefault,
        registrarModoDefault: useUiStore.getState().registrarModoDefault,
      }
      useUiStore.setState({
        registrarMetodoDefault: payload.metodo_default,
        registrarModoDefault: payload.modo_default,
      })
      return previo
    },
    onError: (error, _payload, previo) => {
      if (previo) useUiStore.setState(previo)
      toast.error(
        error.message.trim() || "No se pudieron guardar los defaults de registro.",
      )
      // El configurador (M4) revierte su select en el onError de este mutate.
      throw error
    },
    onSuccess: (res) => {
      const local: RegistrarSettings = {
        metodo_default: useUiStore.getState().registrarMetodoDefault,
        modo_default: useUiStore.getState().registrarModoDefault,
      }
      const valor = normalizarRegistrarSettings(res, local)
      useUiStore.setState({
        registrarMetodoDefault: valor.metodo_default,
        registrarModoDefault: valor.modo_default,
      })
      qc.invalidateQueries({ queryKey: queryKeys.registrarSettings })
    },
  })
}
