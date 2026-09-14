import { useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, TriangleAlert } from "lucide-react"
import { useActualizarPago, useFuentes } from "@/services/hooks"
import { bsToCents, METODOS_PAGO } from "@/lib/format"
import type { MetodoPago, Pago } from "@/services/types"
import { CalendarioDias, type Herramienta } from "@/features/registrar/CalendarioDias"

interface Props {
  pago: Pago
  children: React.ReactNode
}

export function EditarPagoDialog({ pago, children }: Props) {
  const { data: fuentes } = useFuentes()
  const actualizar = useActualizarPago()

  const [abierto, setAbierto] = useState(false)
  const [fuenteId, setFuenteId] = useState(String(pago.fuente_id))
  const [fechaPago, setFechaPago] = useState(pago.fecha_pago)
  const [dias, setDias] = useState<Set<string>>(new Set(pago.dias_trabajados.map((d) => d.fecha)))
  const [herramienta, setHerramienta] = useState<Herramienta>("trabajo")
  const [metodo, setMetodo] = useState<MetodoPago>(pago.metodo_pago)
  const [montoStr, setMontoStr] = useState((pago.monto_enteros / 100).toLocaleString("es-BO", { minimumFractionDigits: 2 }))
  const [notas, setNotas] = useState(pago.notas ?? "")

  const montoCents = bsToCents(montoStr)
  const conSplit = pago.split_id != null
  const puedeGuardar = montoCents != null && montoCents > 0 && dias.size >= 1 && fechaPago !== ""

  const guardar = async () => {
    if (!puedeGuardar || montoCents == null) return
    await actualizar.mutateAsync({
      id: pago.id,
      payload: {
        fuente_id: Number(fuenteId),
        fecha_pago: fechaPago,
        monto_enteros: montoCents,
        metodo_pago: metodo,
        notas: notas.trim() ? notas.trim() : null,
        dias_trabajados: [...dias].sort(),
      },
    })
    setAbierto(false)
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar pago #{pago.id}</DialogTitle>
          <DialogDescription>
            Actualiza los datos del pago. Los días trabajados se reemplazan por los del calendario.
          </DialogDescription>
        </DialogHeader>

        {conSplit && (
          <Alert variant="default">
            <TriangleAlert className="size-4" aria-hidden />
            <AlertTitle>Pago con split</AlertTitle>
            <AlertDescription>
              El monto no se puede modificar si el pago tiene split (lo rechaza la API). El resto de
              campos sí es editable.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-3 md:col-span-2">
            <CalendarioDias
              diasTrabajados={dias}
              fechaPago={fechaPago}
              herramienta={herramienta}
              setHerramienta={setHerramienta}
              onMarcarDia={(fecha) => {
                if (herramienta === "trabajo") {
                  setDias((prev) => {
                    const next = new Set(prev)
                    if (next.has(fecha)) next.delete(fecha)
                    else next.add(fecha)
                    return next
                  })
                } else if (herramienta === "pago") {
                  setFechaPago(fecha)
                } else {
                  setDias((prev) => {
                    const next = new Set(prev)
                    next.delete(fecha)
                    return next
                  })
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-fuente">Fuente</Label>
            <Select value={fuenteId} onValueChange={setFuenteId}>
              <SelectTrigger id="edit-fuente">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fuentes?.map((f) => (
                  <SelectItem key={f.id} value={String(f.id)}>
                    {f.alias}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-monto">Monto (Bs)</Label>
            <Input
              id="edit-monto"
              inputMode="decimal"
              value={montoStr}
              disabled={conSplit}
              onChange={(e) => setMontoStr(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-metodo">Método</Label>
            <Select value={metodo} onValueChange={(v) => setMetodo(v as MetodoPago)}>
              <SelectTrigger id="edit-metodo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METODOS_PAGO.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-fecha">Fecha de pago</Label>
            <Input
              id="edit-fecha"
              type="date"
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="edit-notas">Notas</Label>
            <Textarea
              id="edit-notas"
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setAbierto(false)}>
            Cancelar
          </Button>
          <Button
            onClick={guardar}
            disabled={!puedeGuardar || actualizar.isPending}
          >
            {actualizar.isPending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}