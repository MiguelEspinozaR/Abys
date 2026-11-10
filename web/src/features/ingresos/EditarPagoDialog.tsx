import { useMemo, useState } from "react"
import type { FormEvent } from "react"
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
import { FieldError } from "@/components/form/FieldError"
import { ErrorSummary } from "@/components/form/ErrorSummary"
import { useFormErrors } from "@/hooks/useFormErrors"
import { useActualizarPago, useFuentes } from "@/services/hooks"
import { bsToCents, METODOS_PAGO } from "@/lib/format"
import {
  MAX_NOTAS,
  validarDiasTrabajados,
  validarFechaPago,
  validarFuente,
  validarMetodoPago,
  validarMonto,
  validarNotas,
} from "@/lib/validators"
import type { MetodoPago, Pago } from "@/services/types"
import { CalendarioDias, type Herramienta } from "@/features/registrar/CalendarioDias"

interface Props {
  pago: Pago
  children: React.ReactNode
}

/** Campos con reglas de validación al editar un pago (R2). */
type Campo = "dias" | "fuente" | "monto" | "metodo" | "fecha" | "notas"

/** id del control (o fieldset) de cada campo, para foco programático (R2.5). */
const IDS_Campos: Record<Campo, string> = {
  dias: "edit-calendario",
  fuente: "edit-fuente",
  monto: "edit-monto",
  metodo: "edit-metodo",
  fecha: "edit-fecha",
  notas: "edit-notas",
}

const Obligatorio = () => (
  <span aria-hidden className="ml-0.5">
    *
  </span>
)

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
  const validacion = useFormErrors<Campo>()

  const idsFuentes = useMemo(
    () => new Set((fuentes ?? []).map((f) => String(f.id))),
    [fuentes],
  )

  const enfocarCampo = (campo: Campo) => {
    document.getElementById(IDS_Campos[campo])?.focus()
  }

  const cerrar = () => {
    setAbierto(false)
    validacion.limpiar()
  }

  const marcarDia = (fecha: string) => {
    if (herramienta === "trabajo") {
      const next = new Set(dias)
      if (next.has(fecha)) next.delete(fecha)
      else next.add(fecha)
      setDias(next)
      validacion.validarChange("dias", () => validarDiasTrabajados(next))
    } else if (herramienta === "pago") {
      setFechaPago(fecha)
      validacion.validarChange("fecha", () => validarFechaPago(fecha))
    } else {
      const next = new Set(dias)
      next.delete(fecha)
      setDias(next)
      validacion.validarChange("dias", () => validarDiasTrabajados(next))
    }
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const valido = validacion.validarSubmit([
      {
        campo: "dias",
        validar: () => validarDiasTrabajados(dias),
        enfocar: () => enfocarCampo("dias"),
      },
      {
        campo: "fuente",
        validar: () => validarFuente(fuenteId, idsFuentes),
        enfocar: () => enfocarCampo("fuente"),
      },
      {
        campo: "monto",
        validar: () => validarMonto(montoStr),
        enfocar: () => enfocarCampo("monto"),
      },
      {
        campo: "metodo",
        validar: () => validarMetodoPago(metodo),
        enfocar: () => enfocarCampo("metodo"),
      },
      {
        campo: "fecha",
        validar: () => validarFechaPago(fechaPago),
        enfocar: () => enfocarCampo("fecha"),
      },
      {
        campo: "notas",
        validar: () => validarNotas(notas),
        enfocar: () => enfocarCampo("notas"),
      },
    ])
    if (valido) void guardar()
  }

  const guardar = async () => {
    if (montoCents == null || montoCents <= 0 || dias.size < 1 || fechaPago === "") return
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
    cerrar()
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => (o ? setAbierto(true) : cerrar())}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle id="edit-pago-titulo">Editar pago #{pago.id}</DialogTitle>
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

        <form
          noValidate
          aria-labelledby="edit-pago-titulo"
          aria-busy={actualizar.isPending}
          onSubmit={onSubmit}
          className="space-y-4"
        >
          {validacion.resumenVisible && (
            <ErrorSummary errores={validacion.listaErrores} onEnfocar={enfocarCampo} />
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-3 md:col-span-2">
              <CalendarioDias
                id="edit-calendario"
                legend={
                  <>
                    Días trabajados <Obligatorio />
                  </>
                }
                error={validacion.errores.dias ?? null}
                errorId="edit-dias-error"
                diasTrabajados={dias}
                fechaPago={fechaPago}
                herramienta={herramienta}
                setHerramienta={setHerramienta}
                onMarcarDia={marcarDia}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-fuente">
                Fuente <Obligatorio />
              </Label>
              <Select
                value={fuenteId}
                onValueChange={(v) => {
                  setFuenteId(v)
                  validacion.validarChange("fuente", () => validarFuente(v, idsFuentes))
                }}
              >
                <SelectTrigger
                  id="edit-fuente"
                  aria-required="true"
                  aria-invalid={validacion.errores.fuente ? true : undefined}
                  aria-describedby={
                    validacion.errores.fuente ? "edit-fuente-error" : undefined
                  }
                >
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
              <FieldError id="edit-fuente-error" error={validacion.errores.fuente} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-monto">
                Monto (Bs) <Obligatorio />
              </Label>
              <Input
                id="edit-monto"
                inputMode="decimal"
                value={montoStr}
                disabled={conSplit}
                aria-required="true"
                aria-invalid={validacion.errores.monto ? true : undefined}
                aria-describedby={validacion.errores.monto ? "edit-monto-error" : undefined}
                onChange={(e) => {
                  setMontoStr(e.target.value)
                  validacion.validarChange("monto", () => validarMonto(e.target.value))
                }}
                onBlur={(e) =>
                  validacion.validarBlur("monto", () => validarMonto(e.target.value))
                }
              />
              <FieldError id="edit-monto-error" error={validacion.errores.monto} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-metodo">
                Método <Obligatorio />
              </Label>
              <Select
                value={metodo}
                onValueChange={(v) => {
                  setMetodo(v as MetodoPago)
                  validacion.validarChange("metodo", () => validarMetodoPago(v))
                }}
              >
                <SelectTrigger
                  id="edit-metodo"
                  aria-required="true"
                  aria-invalid={validacion.errores.metodo ? true : undefined}
                  aria-describedby={
                    validacion.errores.metodo ? "edit-metodo-error" : undefined
                  }
                >
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
              <FieldError id="edit-metodo-error" error={validacion.errores.metodo} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-fecha">
                Fecha de pago <Obligatorio />
              </Label>
              <Input
                id="edit-fecha"
                type="date"
                value={fechaPago}
                aria-required="true"
                aria-invalid={validacion.errores.fecha ? true : undefined}
                aria-describedby={validacion.errores.fecha ? "edit-fecha-error" : undefined}
                onChange={(e) => {
                  setFechaPago(e.target.value)
                  validacion.validarChange("fecha", () => validarFechaPago(e.target.value))
                }}
                onBlur={(e) =>
                  validacion.validarBlur("fecha", () => validarFechaPago(e.target.value))
                }
              />
              <FieldError id="edit-fecha-error" error={validacion.errores.fecha} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-notas">Notas</Label>
              <Textarea
                id="edit-notas"
                rows={2}
                value={notas}
                maxLength={MAX_NOTAS}
                aria-invalid={validacion.errores.notas ? true : undefined}
                aria-describedby={
                  validacion.errores.notas
                    ? "edit-notas-contador edit-notas-error"
                    : "edit-notas-contador"
                }
                onChange={(e) => {
                  setNotas(e.target.value)
                  validacion.validarChange("notas", () => validarNotas(e.target.value))
                }}
                onBlur={(e) =>
                  validacion.validarBlur("notas", () => validarNotas(e.target.value))
                }
              />
              <p id="edit-notas-contador" className="text-right text-xs text-muted-foreground">
                {notas.length}/{MAX_NOTAS}
              </p>
              <FieldError id="edit-notas-error" error={validacion.errores.notas} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={actualizar.isPending}>
              {actualizar.isPending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
