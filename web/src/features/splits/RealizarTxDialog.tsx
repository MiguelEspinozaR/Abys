import { useState } from "react"
import { CheckCircle2, ImageOff, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { assetUrl } from "@/services/api"
import { useCuentas, useMarcarRealizada } from "@/services/hooks"
import { formatBs, formatTasaBps } from "@/lib/format"
import type { Transaccion } from "@/services/types"

interface Props {
  transaccion: Transaccion
  children: React.ReactNode
}

export function RealizarTxDialog({ transaccion, children }: Props) {
  const marcar = useMarcarRealizada()
  const { data: cuentas } = useCuentas()
  const [abierto, setAbierto] = useState(false)

  const cuenta = cuentas?.find((c) => c.id === transaccion.cuenta_id)
  const qrUrl = assetUrl(cuenta?.qr_ruta ?? null)
  const esGeneral = cuenta?.es_general ?? transaccion.cuenta_id === 3

  const confirmar = async () => {
    await marcar.mutateAsync(transaccion.id)
    setAbierto(false)
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir a {transaccion.alias_snapshot}</DialogTitle>
          <DialogDescription>
            Confirma la transferencia realizada desde tu banca para congelar la transacción.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
            <div>
              <p className="text-sm font-medium">{transaccion.alias_snapshot}</p>
              <p className="text-xs text-muted-foreground">
                {esGeneral ? "Cuenta General · reserva de redondeo" : cuenta ? `${cuenta.banco ?? "Banco"} · ${cuenta.numero ?? "—"}` : "Cuenta"}
              </p>
            </div>
            <p className="text-lg font-semibold tabular-nums">{formatBs(transaccion.monto_enteros)}</p>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tasa aplicada (snapshot)</span>
            <Badge variant="secondary">{formatTasaBps(transaccion.tasa_bps)}</Badge>
          </div>

          {qrUrl ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border p-4">
              <img
                src={qrUrl}
                alt={`QR de la cuenta ${transaccion.alias_snapshot}`}
                className="size-40 rounded-md object-contain"
              />
              <p className="text-xs text-muted-foreground">
                Escanea el QR desde tu app bancaria y transfiere exactamente{" "}
                {formatBs(transaccion.monto_enteros)}.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              <ImageOff className="size-4" aria-hidden />
              Esta cuenta no tiene QR cargado. Transfiere con los datos del banco.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setAbierto(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={marcar.isPending}>
            {marcar.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            ) : (
              <CheckCircle2 className="mr-2 size-4" aria-hidden />
            )}
            Marcar realizada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}