import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { FiltrosRango } from "@/components/historial/FiltrosRango"
import { HistorialAgrupado } from "@/components/historial/HistorialAgrupado"
import { useFiltrosHistorial } from "@/hooks/useFiltrosHistorial"
import { useAniosConDatos, useCandidatosAnio } from "@/hooks/useHistorial"
import { formatBs } from "@/lib/format"
import { useCuentas, useFuentes, useSplits } from "@/services/hooks"
import type { Cuenta, Transaccion } from "@/services/types"
import { CuentaDetalleDialog } from "./CuentaDetalleDialog"
import { SplitFila } from "./SplitFila"

export default function SplitsPage() {
  const { data: fuentes } = useFuentes()
  const fuentesValidas = useMemo(
    () => (fuentes ? new Set(fuentes.map((f) => f.id)) : undefined),
    [fuentes],
  )

  const {
    filtros,
    borrador,
    setBorrador,
    rangoCalculado,
    aplicar,
    limpiar,
    errores,
    hayFiltros,
  } = useFiltrosHistorial({ fuentesValidas })

  const { candidatos, isLoading: candidatosLoading } = useCandidatosAnio({
    preset: filtros.rango,
    rango: rangoCalculado,
  })
  const {
    anios,
    isLoading: aniosLoading,
    isFetching: aniosFetching,
  } = useAniosConDatos({ candidatos, rango: rangoCalculado, filtros })

  const { data: splits, isLoading: splitsLoading } = useSplits()
  const { data: cuentas } = useCuentas()

  if (splitsLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Splits</h1>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cargando…</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  const splitsPorPago = new Map((splits ?? []).map((s) => [s.pago_id, s]))

  // La cuenta General se identifica por su bandera, nunca por un id fijo (R7.1).
  const idsGeneral = new Set((cuentas ?? []).filter((c) => c.es_general).map((c) => c.id))

  // Pendientes reales por cuenta, reutilizando los splits ya cargados (sin nuevas llamadas).
  const pendientesPorCuenta = new Map<number, Transaccion[]>()
  for (const c of cuentas ?? []) {
    pendientesPorCuenta.set(
      c.id,
      (splits ?? []).flatMap((s) =>
        s.transacciones.filter((tx) => tx.cuenta_id === c.id && !tx.realizado),
      ),
    )
  }

  const pendientePorCuenta = new Map<number, number>()
  for (const s of splits ?? []) {
    for (const tx of s.transacciones) {
      if (!tx.realizado && !idsGeneral.has(tx.cuenta_id)) {
        pendientePorCuenta.set(
          tx.cuenta_id,
          (pendientePorCuenta.get(tx.cuenta_id) ?? 0) + tx.monto_enteros,
        )
      }
    }
  }
  const pendienteTotal = [...pendientePorCuenta.values()].reduce((a, b) => a + b, 0)

  const cargandoLista = candidatosLoading || aniosLoading

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Splits</h1>
        <p className="text-sm text-muted-foreground">
          Distribución de cada pago entre cuentas según sus tasas. Los splits pendientes se
          congelan al marcar cada transferencia como realizada.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Splits generados" valor={splits?.length ?? 0} />
        <StatCard
          label="Pendiente total"
          valor={formatBs(splits?.reduce((a, s) => a + s.total_pendiente, 0) ?? 0)}
        />
        <StatCard
          label="Realizado total"
          valor={formatBs(splits?.reduce((a, s) => a + s.total_realizado, 0) ?? 0)}
        />
      </div>

      <PendientePorCuentaCard
        cuentas={cuentas ?? []}
        pendientePorCuenta={pendientePorCuenta}
        pendientesPorCuenta={pendientesPorCuenta}
        pendienteTotal={pendienteTotal}
      />

      {/* Filtros solo para la lista; totales y pendiente por cuenta son globales. */}
      <FiltrosRango
        idPrefijo="splits"
        filtros={borrador}
        onCambiar={setBorrador}
        onAplicar={aplicar}
        onLimpiar={limpiar}
        errores={errores}
        fuentes={fuentes}
        deshabilitado={aniosFetching}
        hayFiltros={hayFiltros}
      />

      {cargandoLista ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Cargando…</p>
      ) : anios.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No hay splits generados.
        </p>
      ) : (
        <HistorialAgrupado
          idPrefijo="splits"
          anios={anios}
          rango={rangoCalculado}
          filtros={filtros}
          filtrarFilas={(pagos) => pagos.filter((pago) => splitsPorPago.has(pago.id))}
          renderFila={(pago) => {
            const split = splitsPorPago.get(pago.id)
            return split ? <SplitFila key={pago.id} pago={pago} split={split} /> : null
          }}
          mensajeVacio={(anio) => `Sin splits en ${anio}`}
        />
      )}
    </div>
  )
}

function PendientePorCuentaCard({
  cuentas,
  pendientePorCuenta,
  pendientesPorCuenta,
  pendienteTotal,
}: {
  cuentas: Cuenta[]
  pendientePorCuenta: Map<number, number>
  pendientesPorCuenta: Map<number, Transaccion[]>
  pendienteTotal: number
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Pendiente por cuenta</CardTitle>
        <CardDescription>
          Total por transferir agrupado por cuenta de destino. Usa "Ver datos" para el QR y el
          número de cuenta. La cuenta General (· reserva) aparece solo a modo informativo: su
          monto no entra en el Total pendiente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {cuentas.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay cuentas configuradas.</p>
        ) : (
          cuentas.map((c) => {
            const pendiente = pendientePorCuenta.get(c.id) ?? 0
            return (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium md:truncate">
                    {c.alias}
                    {c.es_general && (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        · reserva
                      </span>
                    )}
                  </p>
                  <p className="break-words text-xs text-muted-foreground md:truncate">
                    {c.banco ?? "—"} · {c.numero ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold tabular-nums">{formatBs(pendiente)}</p>
                  <CuentaDetalleDialog
                    cuenta={c}
                    pendiente={pendiente}
                    transacciones={pendientesPorCuenta.get(c.id) ?? []}
                  >
                    <Button size="sm" variant="outline">
                      Ver datos
                    </Button>
                  </CuentaDetalleDialog>
                </div>
              </div>
            )
          })
        )}
        {cuentas.length > 0 && (
          <div className="flex items-center justify-between border-t pt-2 text-sm">
            <span className="text-muted-foreground">Total pendiente</span>
            <span className="font-semibold tabular-nums">{formatBs(pendienteTotal)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatCard({ label, valor }: { label: string; valor: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-semibold tabular-nums">{valor}</p>
      </CardContent>
    </Card>
  )
}
