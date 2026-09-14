import { useState } from "react"
import { Loader2, SplitSquareHorizontal } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useGenerarSplit } from "@/services/hooks"
import type { Pago } from "@/services/types"

const MODOS = [
  { value: "preciso", desc: "Preciso — reparte centavos exactos, residuo a General" },
  { value: "redondeado", desc: "Redondeado — montos redondeados al entero" },
  { value: "enteros", desc: "Enteros — distribuye solo montos enteros" },
]

interface Props {
  pago: Pago
  children: React.ReactNode
}

export function GenerarSplitDialog({ pago, children }: Props) {
  const generar = useGenerarSplit()
  const [abierto, setAbierto] = useState(false)
  const [modo, setModo] = useState("preciso")

  const confirmar = async () => {
    await generar.mutateAsync({ pago_id: pago.id, modo_calculo: modo as "preciso" })
    setAbierto(false)
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generar split — pago #{pago.id}</DialogTitle>
          <DialogDescription>
            Crea un split para repartir {pago.monto_enteros / 100} Bs entre las cuentas con
            las tasas vigentes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="modo">Modo de cálculo</Label>
          <Select value={modo} onValueChange={setModo}>
            <SelectTrigger id="modo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODOS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.desc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setAbierto(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={generar.isPending}>
            {generar.isPending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
            <SplitSquareHorizontal className="mr-2 size-4" aria-hidden />
            Generar split
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}