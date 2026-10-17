import { useEffect, useState } from "react"
import { CalendarDays, ChevronDown, ImageOff, Pencil, Receipt, SplitSquareHorizontal, Trash2, X } from "lucide-react"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { formatearFechaEs, formatBs, labelMetodo } from "@/lib/format"
import { assetUrl } from "@/services/api"
import { useEliminarPago } from "@/services/hooks"
import type { Pago } from "@/services/types"
import { ListarDias } from "./ListarDias"
import { EditarPagoDialog } from "./EditarPagoDialog"
import { GenerarSplitDialog } from "../splits/GenerarSplitDialog"

function MetodoBadge({ metodo }: { metodo: string }) {
  return <Badge variant="secondary">{labelMetodo(metodo)}</Badge>
}

function ThumbComprobante({ url, onZoom }: { url: string; onZoom: () => void }) {
  return (
    <button
      type="button"
      onClick={onZoom}
      className="block shrink-0 overflow-hidden rounded-md border transition-opacity hover:opacity-80"
      aria-label="Ver comprobante"
    >
      <img
        src={url}
        alt="Comprobante adjunto"
        loading="lazy"
        className="size-10 object-cover"
      />
    </button>
  )
}

function MontoPago({ monto }: { monto: number }) {
  return (
    <p className="shrink-0 text-sm font-semibold tabular-nums md:w-28 md:text-right">
      {formatBs(monto)}
    </p>
  )
}

function AccionesPago({ pago }: { pago: Pago }) {
  const eliminar = useEliminarPago()

  return (
    <div className="flex shrink-0 items-center gap-1">
      {pago.split_id ? (
        <Badge variant="outline" className="gap-1" title="Este pago ya tiene split">
          <SplitSquareHorizontal className="size-3.5" aria-hidden />
          {pago.split_modo ?? "split"}
        </Badge>
      ) : (
        <GenerarSplitDialog pago={pago}>
          <div className="inline-flex">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label="Generar split"
                >
                  <SplitSquareHorizontal className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Generar split</TooltipContent>
            </Tooltip>
          </div>
        </GenerarSplitDialog>
      )}

      <EditarPagoDialog pago={pago}>
        <Button variant="ghost" size="icon" className="size-8" aria-label="Editar pago">
          <Pencil className="size-4" />
        </Button>
      </EditarPagoDialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:text-destructive"
            aria-label="Eliminar pago"
          >
            <Trash2 className="size-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar pago #{pago.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el pago de {formatBs(pago.monto_enteros)} de{" "}
              {pago.fuente_alias ?? "su fuente"} del {formatearFechaEs(pago.fecha_pago)}.
              {pago.split_id ? " También se eliminará su split pendiente." : ""} Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => eliminar.mutate(pago.id)}
              disabled={eliminar.isPending}
            >
              {eliminar.isPending ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function PagoFila({ pago }: { pago: Pago }) {
  const [expandido, setExpandido] = useState(false)
  const [zoom, setZoom] = useState(false)
  const comprobanteUrl = assetUrl(pago.imagen_ruta)

  useEffect(() => {
    if (!zoom) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [zoom])

  return (
    <div className="rounded-lg border md:rounded-none md:border-0">
      <div className="flex items-start gap-3 px-3 py-2.5 hover:bg-accent/40 md:items-center md:px-4 md:py-3">
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          aria-expanded={expandido}
          aria-label={expandido ? "Ocultar detalle" : "Ver detalle"}
          className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground md:mt-0"
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
                {pago.fuente_alias ?? `Fuente ${pago.fuente_id}`}
              </p>
              <p className="break-words text-xs text-muted-foreground md:truncate">
                {formatearFechaEs(pago.fecha_pago)}
                {pago.notas ? ` · ${pago.notas}` : ""}
              </p>
            </div>
          </div>

          {/* Móvil: monto a la izquierda, badge/comprobante/acciones a la derecha */}
          <div className="mt-1.5 flex flex-wrap items-center gap-2 md:hidden">
            <span className="mr-auto">
              <MontoPago monto={pago.monto_enteros} />
            </span>
            <MetodoBadge metodo={pago.metodo_pago} />
            {comprobanteUrl && (
              <ThumbComprobante url={comprobanteUrl} onZoom={() => setZoom(true)} />
            )}
            <AccionesPago pago={pago} />
          </div>
        </div>

        {/* Desktop: todo inline a la derecha */}
        <div className="hidden items-center gap-3 md:flex">
          <MetodoBadge metodo={pago.metodo_pago} />
          <MontoPago monto={pago.monto_enteros} />
          {comprobanteUrl && (
            <ThumbComprobante url={comprobanteUrl} onZoom={() => setZoom(true)} />
          )}
          <AccionesPago pago={pago} />
        </div>
      </div>

      {expandido && (
        <div className="border-t border-border/60 bg-muted/25 px-3 py-3 md:px-4 md:pl-14">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <CalendarDays className="size-3.5" aria-hidden />
                Días trabajados ({pago.dias_trabajados.length})
              </p>
              <ListarDias dias={pago.dias_trabajados.map((d) => d.fecha)} />
            </div>
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Receipt className="size-3.5" aria-hidden />
                Comprobante
              </p>
              {comprobanteUrl ? (
                <button
                  type="button"
                  onClick={() => setZoom(true)}
                  className="block overflow-hidden rounded-lg border transition-opacity hover:opacity-80"
                  aria-label="Ampliar comprobante"
                >
                  <img
                    src={comprobanteUrl}
                    alt="Comprobante del pago"
                    loading="lazy"
                    className="max-h-48 object-contain"
                  />
                </button>
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ImageOff className="size-3.5" aria-hidden />
                  Sin comprobante
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                ID #{pago.id}
                {pago.split_id ? ` · Split: ${pago.split_modo ?? "generado"} (#${pago.split_id})` : ""}
              </p>
            </div>
          </div>
        </div>
      )}

      {zoom && comprobanteUrl && (
        <div
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-4"
          onClick={() => setZoom(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Comprobante ampliado"
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
            onClick={() => setZoom(false)}
            aria-label="Cerrar"
          >
            <X className="size-5" aria-hidden />
          </button>
          <img
            src={comprobanteUrl}
            alt="Comprobante ampliado"
            className="max-h-[90vh] max-w-[90vw] cursor-default rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
