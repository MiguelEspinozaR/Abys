import { ImageOff } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { assetUrl } from "@/services/api"
import { formatBs, formatTasaBps } from "@/lib/format"
import type { Cuenta } from "@/services/types"

interface Props {
  cuenta: Cuenta
  pendiente: number
  children: React.ReactNode
}

export function CuentaDetalleDialog({ cuenta, pendiente, children }: Props) {
  const qrUrl = assetUrl(cuenta.qr_ruta)
  const titulo = cuenta.es_general ? `${cuenta.alias} · reserva` : cuenta.alias

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            {cuenta.es_general
              ? "Cuenta General usada para la reserva de redondeo."
              : "Datos de la cuenta para transferir el monto pendiente."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
              <img
                src={qrUrl}
                alt={`QR de la cuenta ${cuenta.alias}`}
                className="size-44 rounded-md object-contain"
              />
              <p className="text-xs text-muted-foreground">
                Escanea el QR desde tu app bancaria.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              <ImageOff className="size-4" aria-hidden />
              Esta cuenta no tiene QR cargado.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
