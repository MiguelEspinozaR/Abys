/**
 * Fila de un pago con split (extraída de `SplitsPage` sin cambios de
 * comportamiento). Se usa dentro de las secciones por año del histórico.
 */

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
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { formatearFechaEs, formatBs, formatTasaBps } from "@/lib/format"
import { useCuentas, useEliminarSplit } from "@/services/hooks"
import type { Pago, Split, Transaccion } from "@/services/types"
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

export function SplitFila({ pago, split }: { pago: Pago; split: Split }) {
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
            "mt-0.5 grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground max-md:min-h-11 max-md:min-w-11",
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
