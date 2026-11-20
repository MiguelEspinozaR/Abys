import { useEffect, useRef, useState } from "react"
import { ImageOff, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { assetUrl } from "@/services/api"
import { formatBs, formatTasaBps } from "@/lib/format"
import { sumaMontosSeleccionados } from "@/lib/subtotal"
import type { Cuenta, Transaccion } from "@/services/types"

interface Props {
  cuenta: Cuenta
  pendiente: number
  transacciones: Transaccion[]
  children: React.ReactNode
}

function fechaEs(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return iso
  return fecha.toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "short" })
}

export function CuentaDetalleDialog({ cuenta, pendiente, transacciones, children }: Props) {
  const qrUrl = assetUrl(cuenta.qr_ruta)
  const titulo = cuenta.es_general ? `${cuenta.alias} · reserva` : cuenta.alias

  const [abierto, setAbierto] = useState(false)
  const [seleccionadas, setSeleccionadas] = useState<ReadonlySet<number>>(() => new Set())
  const [zoom, setZoom] = useState(false)
  const botonQrRef = useRef<HTMLButtonElement>(null)
  const cerrarZoomRef = useRef<HTMLButtonElement>(null)

  // D6: cada apertura empieza sin filas marcadas y sin lightbox.
  const alCambiarApertura = (siguiente: boolean) => {
    setAbierto(siguiente)
    setSeleccionadas(new Set())
    setZoom(false)
  }

  useEffect(() => {
    if (!zoom) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      // Captura en window: cierra el lightbox antes de que Radix cierre el Dialog.
      event.preventDefault()
      event.stopPropagation()
      setZoom(false)
    }
    window.addEventListener("keydown", onKey, true)
    cerrarZoomRef.current?.focus()
    return () => {
      window.removeEventListener("keydown", onKey, true)
      botonQrRef.current?.focus()
    }
  }, [zoom])

  const subtotal = sumaMontosSeleccionados(transacciones, seleccionadas)

  const alternar = (id: number, marcado: boolean) => {
    setSeleccionadas((anterior) => {
      const siguiente = new Set(anterior)
      if (marcado) siguiente.add(id)
      else siguiente.delete(id)
      return siguiente
    })
  }

  return (
    <Dialog open={abierto} onOpenChange={alCambiarApertura}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent showCloseButton={!zoom}>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            {cuenta.es_general
              ? "Cuenta General usada para la reserva de redondeo."
              : "Datos de la cuenta para transferir el monto pendiente."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4" inert={zoom}>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Banco</dt>
              <dd className="font-medium">{cuenta.banco ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Número de cuenta</dt>
              <dd className="font-medium tabular-nums">{cuenta.numero ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Tasa vigente</dt>
              <dd>
                <Badge variant="secondary">{formatTasaBps(cuenta.tasa_bps)}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Pendiente</dt>
              <dd className="font-semibold tabular-nums">{formatBs(pendiente)}</dd>
            </div>
          </dl>

          {qrUrl ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border p-4">
              <button
                ref={botonQrRef}
                type="button"
                onClick={() => setZoom(true)}
                aria-label={`Ampliar QR de la cuenta ${cuenta.alias}`}
                className="flex max-md:min-h-11 max-md:min-w-11 items-center justify-center rounded-md outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <img
                  src={qrUrl}
                  alt={`QR de la cuenta ${cuenta.alias}`}
                  className="size-44 rounded-md object-contain"
                />
              </button>
              <p className="text-xs text-muted-foreground">
                Escanea el QR desde tu app bancaria o pulsa la imagen para ampliarla.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              <ImageOff className="size-4" aria-hidden />
              Esta cuenta no tiene QR cargado.
            </div>
          )}

          <section className="space-y-2" aria-labelledby={`pendientes-${cuenta.id}-titulo`}>
            <h3 id={`pendientes-${cuenta.id}-titulo`} className="text-sm font-medium">
              Transferencias pendientes
            </h3>
            {transacciones.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                Esta cuenta no tiene transferencias pendientes.
              </p>
            ) : (
              <ul className="space-y-2">
                {transacciones.map((tx) => {
                  const id = `pendiente-${cuenta.id}-tx-${tx.id}`
                  const alias = tx.alias_snapshot || `Pago #${tx.split_id}`
                  return (
                    <li key={tx.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
                      <Checkbox
                        id={id}
                        checked={seleccionadas.has(tx.id)}
                        onCheckedChange={(marcado) => alternar(tx.id, marcado === true)}
                        className="size-4 shrink-0 max-md:size-11"
                      />
                      <Label
                        htmlFor={id}
                        className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-2 gap-y-0.5 font-normal leading-snug max-md:min-h-11"
                      >
                        <span className="min-w-0">
                          <span className="block break-words text-sm font-medium">{alias}</span>
                          <span className="block break-words text-xs text-muted-foreground">
                            {fechaEs(tx.created_at)}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">
                          {formatBs(tx.monto_enteros)}
                        </span>
                      </Label>
                    </li>
                  )
                })}
              </ul>
            )}
            {transacciones.length > 0 && (
              <div className="flex items-center justify-between border-t pt-3 text-sm">
                <span className="text-muted-foreground">Subtotal seleccionado</span>
                <span className="font-semibold tabular-nums" aria-live="polite">
                  {formatBs(subtotal)}
                </span>
              </div>
            )}
          </section>
        </div>

        {zoom && qrUrl && (
          <div
            className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-4"
            onClick={() => setZoom(false)}
            role="dialog"
            aria-modal="true"
            aria-label="QR ampliado"
          >
            <button
              ref={cerrarZoomRef}
              type="button"
              className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white outline-none hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black max-md:min-h-11 max-md:min-w-11"
              onClick={(event) => {
                event.stopPropagation()
                setZoom(false)
              }}
              aria-label="Cerrar"
            >
              <X className="size-5" aria-hidden />
            </button>
            <img
              src={qrUrl}
              alt={`QR ampliado de la cuenta ${cuenta.alias}`}
              className="max-h-[90vh] max-w-[90vw] cursor-default rounded-lg object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
