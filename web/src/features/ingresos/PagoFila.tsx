import { useState } from "react"
import { CalendarDays, ChevronDown, Pencil, Trash2 } from "lucide-react"
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
import { cn } from "@/lib/utils"
import { formatearFechaEs, formatBs, labelMetodo } from "@/lib/format"
import { useEliminarPago } from "@/services/hooks"
import type { Pago } from "@/services/types"
import { ListarDias } from "./ListarDias"
import { EditarPagoDialog } from "./EditarPagoDialog"

export function PagoFila({ pago }: { pago: Pago }) {
  const [expandido, setExpandido] = useState(false)
  const eliminar = useEliminarPago()

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40">
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          aria-expanded={expandido}
          aria-label={expandido ? "Ocultar detalle" : "Ver detalle"}
          className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
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
            <p className="truncate text-sm font-medium">
              {pago.fuente_alias ?? `Fuente ${pago.fuente_id}`}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {formatearFechaEs(pago.fecha_pago)}
              {pago.notas ? ` · ${pago.notas}` : ""}
            </p>
          </div>
        </div>

        <Badge variant="secondary" className="hidden sm:inline-flex">
          {labelMetodo(pago.metodo_pago)}
        </Badge>

        <p className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums">
          {formatBs(pago.monto_enteros)}
        </p>

        <div className="flex shrink-0 items-center gap-1">
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
      </div>

      {expandido && (
        <div className="border-t border-border/60 bg-muted/25 px-4 py-3 pl-14">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <CalendarDays className="size-3.5" aria-hidden />
                Días trabajados ({pago.dias_trabajados.length})
              </p>
              <ListarDias dias={pago.dias_trabajados.map((d) => d.fecha)} />
            </div>
            <div className="text-xs text-muted-foreground sm:text-right">
              <p>ID #{pago.id}</p>
              {pago.split_id && (
                <p>
                  Split: {pago.split_modo ?? "generado"} (#{pago.split_id})
                </p>
              )}
              {pago.imagen_ruta && <p>Con comprobante adjunto</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}