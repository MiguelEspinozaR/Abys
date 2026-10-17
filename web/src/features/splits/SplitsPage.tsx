import { useState } from "react"
import { ChevronDown, Trash2, TriangleAlert } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { formatearFechaEs, formatBs, formatTasaBps } from "@/lib/format"
import { useCuentas, useEliminarSplit, usePagos, useSplits } from "@/services/hooks"
import type { Cuenta, Pago, Split, Transaccion } from "@/services/types"
import { CuentaDetalleDialog } from "./CuentaDetalleDialog"
import { RealizarTxDialog } from "./RealizarTxDialog"

function BadgeTx({ tx }: { tx: Transaccion }) {
  return (
    <Badge
      variant={tx.realizado ? "secondary" : "default"}
      className={cn(
        tx.realizado &&
          "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
      )}
    >
      {tx.realizado ? "Realizada" : "Pendiente"}
    </Badge>
  )
}

function FilaTransaccion({ tx, esGeneral }: { tx: Transaccion; esGeneral: boolean }) {
  const ceroNoGeneral = tx.monto_enteros === 0 && !esGeneral

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-md border px-3 py-2",
        tx.realizado ? "border-transparent bg-transparent" : "bg-muted/30",
        ceroNoGeneral && "border-amber-500/50 bg-amber-500/10",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-medium md:truncate">{tx.alias_snapshot}</p>
        <p className="text-xs text-muted-foreground">
          {formatTasaBps(tx.tasa_bps)}
          {esGeneral ? " · reserva" : ""}
        </p>
      </div>

      {ceroNoGeneral && (
        <span
          className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400"
          title="Transacción de 0 Bs en una cuenta que no es General: revisa la distribución."
        >
          <TriangleAlert className="size-3.5" aria-hidden />
          0 Bs en cuenta no General
        </span>
      )}

      <p className="w-20 text-right text-sm font-semibold tabular-nums">
        {formatBs(tx.monto_enteros)}
      </p>
      <BadgeTx tx={tx} />

      {!tx.realizado && (
        <RealizarTxDialog transaccion={tx}>
          <Button size="sm" variant="outline">
            Realizar
          </Button>
        </RealizarTxDialog>
      )}
    </div>
  )
}

function DetalleSplit({ split, pago }: { split: Split; pago: Pago }) {
  const eliminar = useEliminarSplit()
  const { data: cuentas } = useCuentas()
  const tieneRealizadas = split.transacciones.some((t) => t.realizado)

  return (
    <div className="space-y-2.5 px-3 py-3 md:px-4 md:pl-14">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Badge variant="outline">modo {split.modo_calculo}</Badge>
          <span>Pendiente: {formatBs(split.total_pendiente)}</span>
          <span>·</span>
          <span>Realizado: {formatBs(split.total_realizado)}</span>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={tieneRealizadas}
              title={
                tieneRealizadas
                  ? "No se puede eliminar un split con transacciones realizadas"
                  : "Eliminar split"
              }
            >
              <Trash2 className="mr-1.5 size-3.5" aria-hidden />
              Eliminar split
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar el split del pago #{pago.id}?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminarán las {split.transacciones.length} transacciones pendientes y el pago
                quedará disponible para generar un nuevo split.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => eliminar.mutate(split.id)}
                disabled={eliminar.isPending}
              >
                {eliminar.isPending ? "Eliminando…" : "Eliminar split"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="space-y-1.5">
        {split.transacciones.map((tx) => (
          <FilaTransaccion
            key={tx.id}
            tx={tx}
            esGeneral={cuentas?.find((c) => c.id === tx.cuenta_id)?.es_general ?? false}
          />
        ))}
      </div>
    </div>
  )
}

function BadgePendiente({ split }: { split: Split }) {
  if (split.total_pendiente === 0) {
    return (
      <Badge className="border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
        Completo
      </Badge>
    )
  }
  return <Badge variant="outline">{formatBs(split.total_pendiente)} pend.</Badge>
}

function FilaPago({ pago, split }: { pago: Pago; split: Split }) {
  const [expandido, setExpandido] = useState(false)

  return (
    <div className="rounded-lg border md:rounded-none md:border-0">
      <div className="flex items-start gap-3 px-3 py-2.5 hover:bg-accent/40 md:items-center md:px-4 md:py-3">
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          aria-expanded={expandido}
          aria-label="Ver split"
          className={cn(
            "mt-0.5 grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground",
            "hover:bg-accent hover:text-foreground md:mt-0",
          )}
        >
          <ChevronDown
            className={cn("size-4 transition-transform", expandido && "rotate-180")}
            aria-hidden
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: pago.fuente_color ?? "#888" }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-medium md:truncate">
                Pago #{pago.id} · {pago.fuente_alias ?? `Fuente ${pago.fuente_id}`}
              </p>
              <p className="break-words text-xs text-muted-foreground md:truncate">
                {formatearFechaEs(pago.fecha_pago)} · {pago.dias_trabajados.length} día(s)
              </p>
            </div>
          </div>

          {/* Móvil: estado del split en su propia línea */}
          <div className="mt-1.5 md:hidden">
            <BadgePendiente split={split} />
          </div>
        </div>

        <p className="shrink-0 text-sm font-semibold tabular-nums md:w-28 md:text-right">
          {formatBs(pago.monto_enteros)}
        </p>

        {/* Desktop: badge inline tras el monto */}
        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <BadgePendiente split={split} />
        </div>
      </div>

      {expandido && <DetalleSplit split={split} pago={pago} />}
      {expandido && <Separator className="hidden md:block" />}
    </div>
  )
}

export default function SplitsPage() {
  const { data: pagosRes, isLoading: pagosLoading } = usePagos({ page_size: 500 })
  const { data: splits, isLoading: splitsLoading } = useSplits()
  const { data: cuentas } = useCuentas()

  if (pagosLoading || splitsLoading) {
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

  const pagos = pagosRes?.data ?? []
  const splitsPorPago = new Map((splits ?? []).map((s) => [s.pago_id, s]))
  const pagosConSplit = pagos.filter((p) => splitsPorPago.has(p.id))

  const pendientePorCuenta = new Map<number, number>()
  for (const s of splits ?? []) {
    for (const tx of s.transacciones) {
      if (!tx.realizado) {
        pendientePorCuenta.set(tx.cuenta_id, (pendientePorCuenta.get(tx.cuenta_id) ?? 0) + tx.monto_enteros)
      }
    }
  }
  const pendienteTotal = [...pendientePorCuenta.values()].reduce((a, b) => a + b, 0)

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
        pendienteTotal={pendienteTotal}
      />

      {pagosConSplit.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No hay splits generados.
        </p>
      ) : (
        <Card className="gap-2 overflow-hidden md:gap-0 md:divide-y md:divide-border">
          {pagosConSplit.map((pago) => (
            <FilaPago key={pago.id} pago={pago} split={splitsPorPago.get(pago.id)!} />
          ))}
        </Card>
      )}
    </div>
  )
}

function PendientePorCuentaCard({
  cuentas,
  pendientePorCuenta,
  pendienteTotal,
}: {
  cuentas: Cuenta[]
  pendientePorCuenta: Map<number, number>
  pendienteTotal: number
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Pendiente por cuenta</CardTitle>
        <CardDescription>
          Total por transferir agrupado por cuenta de destino. Usa "Ver datos" para el QR y el
          número de cuenta.
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
                  <CuentaDetalleDialog cuenta={c} pendiente={pendiente}>
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