import { useState } from "react"
import type { FormEvent } from "react"
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
import { FieldError } from "@/components/form/FieldError"
import { ErrorSummary } from "@/components/form/ErrorSummary"
import { useFormErrors } from "@/hooks/useFormErrors"
import { useGenerarSplit } from "@/services/hooks"
import { validarModoSplit } from "@/lib/validators"
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

/** Marca visual de campo obligatorio; la semántica va en `aria-required` (R2.3). */
const Obligatorio = () => (
  <span aria-hidden className="ml-0.5">
    *
  </span>
)

export function GenerarSplitDialog({ pago, children }: Props) {
  const generar = useGenerarSplit()
  const [abierto, setAbierto] = useState(false)
  const [modo, setModo] = useState("preciso")
  const validacion = useFormErrors<"modo">()

  const cerrar = () => {
    setAbierto(false)
    validacion.limpiar()
  }

  const confirmar = async () => {
    await generar.mutateAsync({ pago_id: pago.id, modo_calculo: modo as "preciso" })
    cerrar()
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const valido = validacion.validarSubmit([
      {
        campo: "modo",
        validar: () => validarModoSplit(modo),
        enfocar: () => document.getElementById("modo")?.focus(),
      },
    ])
    if (valido) void confirmar()
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => (o ? setAbierto(true) : cerrar())}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle id="generar-split-titulo">Generar split — pago #{pago.id}</DialogTitle>
          <DialogDescription>
            Crea un split para repartir {pago.monto_enteros / 100} Bs entre las cuentas con
            las tasas vigentes.
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          aria-labelledby="generar-split-titulo"
          aria-busy={generar.isPending}
          onSubmit={onSubmit}
          className="space-y-2"
        >
          {validacion.resumenVisible && (
            <ErrorSummary
              errores={validacion.listaErrores}
              onEnfocar={() => document.getElementById("modo")?.focus()}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="modo">
              Modo de cálculo <Obligatorio />
            </Label>
            <Select
              value={modo}
              onValueChange={(v) => {
                setModo(v)
                validacion.validarChange("modo", () => validarModoSplit(v))
              }}
            >
              <SelectTrigger
                id="modo"
                aria-required="true"
                aria-invalid={validacion.errores.modo ? true : undefined}
                aria-describedby={validacion.errores.modo ? "modo-error" : undefined}
              >
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
            <FieldError id="modo-error" error={validacion.errores.modo} />
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={generar.isPending}>
              {generar.isPending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
              <SplitSquareHorizontal className="mr-2 size-4" aria-hidden />
              Generar split
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
