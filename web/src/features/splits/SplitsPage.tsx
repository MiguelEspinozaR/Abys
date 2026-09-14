import { useState } from "react"
import { ChevronDown, SplitSquareHorizontal, Trash2, TriangleAlert } from "lucide-react"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { formatearFechaEs, formatBs, formatTasaBps } from "@/lib/format"
import { useCuentas, useEliminarSplit, usePagos, useSplits } from "@/services/hooks"
import type { Pago, Split, Transaccion } from "@/services/types"
import { GenerarSplitDialog } from "./GenerarSplitDialog"
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
        <p className="truncate text-sm font-medium">{tx.alias_snapshot}</p>
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
    <div className="space-y-2.5 px-4 py-3 pl-14">
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

function FilaPago({ pago, split }: { pago: Pago; split: Split | undefined }) {
  const [expandido, setExpandido] = useState(false)

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40">
        <button
          type="button"
          onClick={() => split && setExpandido((v) => !v)}
          aria-expanded={expandido}
          aria-label={split ? "Ver split" : "Sin split"}
          disabled={!split}
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground",
            split ? "hover:bg-accent hover:text-foreground" : "opacity-30",
          )}
        >
          <ChevronDown
            className={cn("size-4 transition-transform", expandido && "rotate-180")}
            aria-hidden
          />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            className="inline-block size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: pago.fuente_color ?? "#888" }}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">Pago #{pago.id} · {pago.fuente_alias ?? `Fuente ${pago.fuente_id}`}</p>
            <p className="truncate text-xs text-muted-foreground">
              {formatearFechaEs(pago.fecha_pago)} · {pago.dias_trabajados.length} día(s)
            </p>
          </div>
        </div>

        <p className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums">
          {formatBs(pago.monto_enteros)}
        </p>

        {split ? (
          <div className="flex shrink-0 items-center gap-2">
            {split.total_pendiente === 0 ? (
              <Badge className="border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                Completo
              </Badge>
            ) : (
              <Badge variant="outline">{formatBs(split.total_pendiente)} pend.</Badge>
            )}
          </div>
        ) : (
          <GenerarSplitDialog pago={pago}>
            <Button size="sm" variant="outline" className="shrink-0">
              <SplitSquareHorizontal className="mr-1.5 size-3.5" aria-hidden />
              Generar split
            </Button>
          </GenerarSplitDialog>
        )}
      </div>

      {split && expandido && <DetalleSplit split={split} pago={pago} />}
      {split && expandido && <Separator />}
    </div>
  )
}

export default function SplitsPage() {
  const { data: pagosRes, isLoading: pagosLoading } = usePagos({ page_size: 100 })
  const { data: splits, isLoading: splitsLoading } = useSplits()

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
        <StatCard label="Pagos" valor={pagos.length} />
        <StatCard label="Splits generados" valor={splits?.length ?? 0} />
        <StatCard
          label="Pendiente total"
          valor={formatBs(splits?.reduce((a, s) => a + s.total_pendiente, 0) ?? 0)}
        />
      </div>

      {pagos.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No hay pagos registrados todavía.
        </p>
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-border">
            {pagos.map((pago) => (
              <FilaPago
                key={pago.id}
                pago={pago}
                split={splits?.find((s) => s.pago_id === pago.id)}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
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