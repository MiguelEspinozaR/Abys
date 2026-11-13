import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { FormEvent } from "react"
import { useBlocker } from "react-router-dom"
import type { Blocker } from "react-router-dom"
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
import { ConfirmarDescarteDialog } from "@/components/form/ConfirmarDescarteDialog"
import { useFormErrors } from "@/hooks/useFormErrors"
import { useFormDirty } from "@/hooks/useFormDirty"
import { useActualizarPago, useFuentes } from "@/services/hooks"
import { ApiRequestError } from "@/services/api"
import { ERRORES_API_EDITAR_PAGO, resolverErrorApi } from "@/lib/api-errors"
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

/**
 * Guardia de navegación montada solo con el diálogo abierto y sucio.
 *
 * React Router evalúa únicamente el último bloqueador registrado; como hay un
 * `EditarPagoDialog` por fila, un `useBlocker` por instancia dejaría activo el
 * de la última fila (cerrado). Montar esta guardia al abrir garantiza que el
 * bloqueador activo sea el del formulario que se está editando.
 */
function GuardiaNavegacion({ onBloqueado }: { onBloqueado: (b: Blocker) => void }) {
  const blocker = useBlocker(true)
  useEffect(() => {
    if (blocker.state === "blocked") onBloqueado(blocker)
  }, [blocker, onBloqueado])
  return null
}

export function EditarPagoDialog({ pago, children }: Props) {
  const { data: fuentes, isLoading: fuentesLoading } = useFuentes()
  const actualizar = useActualizarPago()

  const [abierto, setAbierto] = useState(false)
  const [fuenteId, setFuenteId] = useState(String(pago.fuente_id))
  const [fechaPago, setFechaPago] = useState(pago.fecha_pago)
  const [dias, setDias] = useState<Set<string>>(new Set(pago.dias_trabajados.map((d) => d.fecha)))
  const [herramienta, setHerramienta] = useState<Herramienta>("trabajo")
  const [metodo, setMetodo] = useState<MetodoPago>(pago.metodo_pago)
  const [montoStr, setMontoStr] = useState((pago.monto_enteros / 100).toLocaleString("es-BO", { minimumFractionDigits: 2 }))
  const [notas, setNotas] = useState(pago.notas ?? "")

  /** Valores originales del pago: se restauran al descartar (R4.5). */
  const estadoInicial = useMemo(
    () => ({
      fuenteId: String(pago.fuente_id),
      fechaPago: pago.fecha_pago,
      dias: [...pago.dias_trabajados.map((d) => d.fecha)].sort(),
      metodo: pago.metodo_pago,
      montoStr: (pago.monto_enteros / 100).toLocaleString("es-BO", {
        minimumFractionDigits: 2,
      }),
      notas: pago.notas ?? "",
    }),
    [pago],
  )

  const snapshot = {
    fuenteId,
    fechaPago,
    dias: [...dias].sort(),
    metodo,
    montoStr,
    notas,
  }
  const { sucio, resetear } = useFormDirty(snapshot)
  const sucioRef = useRef(sucio)
  sucioRef.current = sucio
  const [confirmarCierre, setConfirmarCierre] = useState(false)
  const blockerRef = useRef<Blocker | null>(null)
  const [bloqueoPendiente, setBloqueoPendiente] = useState(false)

  const alBloquear = useCallback((blocker: Blocker) => {
    blockerRef.current = blocker
    setBloqueoPendiente(true)
  }, [])

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

  const restaurar = () => {
    setFuenteId(estadoInicial.fuenteId)
    setFechaPago(estadoInicial.fechaPago)
    setDias(new Set(estadoInicial.dias))
    setMetodo(estadoInicial.metodo)
    setMontoStr(estadoInicial.montoStr)
    setNotas(estadoInicial.notas)
    setHerramienta("trabajo")
  }

  /** Descarta los cambios, restaura los valores originales y cierra. */
  const cerrarDirecto = () => {
    restaurar()
    resetear(estadoInicial)
    validacion.limpiar()
    setConfirmarCierre(false)
    setAbierto(false)
  }

  /** Escape/overlay/X/Cancelar: intercepta solo si hay cambios (R4.3). */
  const solicitarCierre = () => {
    if (sucioRef.current) setConfirmarCierre(true)
    else cerrarDirecto()
  }

  /** Acción segura: cancela la navegación bloqueada (si la hay) y conserva datos. */
  const seguirEditando = () => {
    if (bloqueoPendiente) {
      blockerRef.current?.reset?.()
      blockerRef.current = null
      setBloqueoPendiente(false)
    }
    setConfirmarCierre(false)
  }

  /** Acción destructiva: restaura/cierra y, si venía de navegación, la reanuda. */
  const descartarCambios = () => {
    const veniaDeBloqueo = bloqueoPendiente
    cerrarDirecto()
    setBloqueoPendiente(false)
    if (veniaDeBloqueo) {
      blockerRef.current?.proceed?.()
      blockerRef.current = null
    }
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
    // Evita marcar "fuente inválida" mientras aún no se cargaron las fuentes.
    if (fuentesLoading) return
    validacion.limpiarErrorFormulario()
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
    if (actualizar.isPending) return
    try {
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
      // Tras guardar: sin confirmación y sin bloqueo (R4.6).
      resetear()
      validacion.limpiar()
      setConfirmarCierre(false)
      setAbierto(false)
    } catch (e) {
      const resuelto =
        e instanceof ApiRequestError
          ? resolverErrorApi(e, ERRORES_API_EDITAR_PAGO)
          : {
              campo: undefined,
              mensaje:
                e instanceof Error
                  ? e.message
                  : "No se pudo guardar el pago. Inténtalo de nuevo.",
            }
      validacion.establecerError(resuelto.campo, resuelto.mensaje)
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => (o ? setAbierto(true) : solicitarCierre())}>
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
          {validacion.errorFormulario && (
            <p role="alert" className="text-sm text-destructive">
              {validacion.errorFormulario}
            </p>
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
            <Button variant="outline" type="button" onClick={solicitarCierre}>
              Cancelar
            </Button>
            <Button type="submit" disabled={actualizar.isPending || fuentesLoading}>
              {actualizar.isPending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>

        {abierto && sucio && <GuardiaNavegacion onBloqueado={alBloquear} />}

        <ConfirmarDescarteDialog
          abierto={confirmarCierre || bloqueoPendiente}
          onSeguir={seguirEditando}
          onDescartar={descartarCambios}
        />
      </DialogContent>
    </Dialog>
  )
}
