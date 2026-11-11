import { useCallback, useMemo, useRef, useState } from "react"
import type { FormEvent } from "react"
import { useBlocker, useNavigate } from "react-router-dom"
import { Loader2, Save, ScanText, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Badge } from "@/components/ui/badge"
import { FieldError } from "@/components/form/FieldError"
import { ErrorSummary } from "@/components/form/ErrorSummary"
import { ConfirmarDescarteDialog } from "@/components/form/ConfirmarDescarteDialog"
import { useFormErrors } from "@/hooks/useFormErrors"
import { useFormDirty } from "@/hooks/useFormDirty"
import { useCrearPago, useFuentes, usePagos, useSubirComprobante } from "@/services/hooks"
import { ApiRequestError } from "@/services/api"
import { ERRORES_API_REGISTRAR, resolverErrorApi } from "@/lib/api-errors"
import { bsToCents, formatBs, formatearFechaEs, METODOS_PAGO, toISODate } from "@/lib/format"
import { motionBehavior } from "@/lib/a11y"
import {
  MAX_NOTAS,
  validarDiasTrabajados,
  validarFechaPago,
  validarFuente,
  validarMetodoPago,
  validarMonto,
  validarNotas,
} from "@/lib/validators"
import type { MetodoPago } from "@/services/types"
import { CalendarioDias, type Herramienta } from "./CalendarioDias"
import { ComprobanteDropzone } from "./ComprobanteDropzone"

/** Campos con reglas de validación en /registrar (R2). */
type Campo = "dias" | "fecha" | "fuente" | "metodo" | "monto" | "notas"

/** id del control (o fieldset) de cada campo, para foco programático (R2.5). */
const IDS_Campos: Record<Campo, string> = {
  dias: "registrar-dias",
  fecha: "registrar-dias",
  fuente: "fuente",
  metodo: "metodo",
  monto: "monto",
  notas: "notas",
}

/** Marca visual de obligatorio (D12): `*` aria-hidden; la semántica va en aria-required. */
const Obligatorio = () => (
  <span aria-hidden className="ml-0.5">
    *
  </span>
)

export default function RegistrarPage() {
  const navigate = useNavigate()
  const { data: fuentes, isLoading: fuentesLoading } = useFuentes()
  const crearPago = useCrearPago()
  const subirComprobante = useSubirComprobante()

  // Pagos ya guardados: solo como referencia visual en el calendario.
  const { data: pagosGuardados } = usePagos({ page_size: 500 })
  const { yaTrabajados, yaFechasPago } = useMemo(() => {
    const yaTrabajados = new Set<string>()
    const yaFechasPago = new Set<string>()
    for (const p of pagosGuardados?.data ?? []) {
      if (p.fecha_pago) yaFechasPago.add(p.fecha_pago)
      for (const d of p.dias_trabajados ?? []) yaTrabajados.add(d.fecha)
    }
    return { yaTrabajados, yaFechasPago }
  }, [pagosGuardados])

  const [herramienta, setHerramienta] = useState<Herramienta>("trabajo")
  const [diasTrabajados, setDiasTrabajados] = useState<Set<string>>(new Set())
  const [fechaPago, setFechaPago] = useState<string>(toISODate(new Date()))
  const [fuenteId, setFuenteId] = useState<string>("")
  const [metodo, setMetodo] = useState<MetodoPago>("efectivo")
  const [montoStr, setMontoStr] = useState("")
  const [notas, setNotas] = useState("")
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [ocrResumen, setOcrResumen] = useState<{
    monto?: number
    fecha?: string
    descripcion?: string
  } | null>(null)

  const montoInputRef = useRef<HTMLInputElement>(null)
  const calendarioRef = useRef<HTMLDivElement>(null)

  /**
   * Snapshot de cambios sin guardar (R4). Incluye los campos editables y un
   * descriptor del comprobante (el `File` en sí no se compara estructuralmente).
   */
  const snapshot = {
    dias: [...diasTrabajados].sort(),
    fechaPago,
    fuenteId,
    metodo,
    montoStr,
    notas,
    comprobante: comprobante
      ? `${comprobante.name}:${comprobante.size}:${comprobante.lastModified}`
      : "",
  }
  const { sucio, resetear } = useFormDirty(snapshot)
  const sucioRef = useRef(sucio)
  sucioRef.current = sucio
  const guardadoRef = useRef(false)
  const debeBloquear = useCallback(
    () => sucioRef.current && !guardadoRef.current,
    [],
  )
  const blocker = useBlocker(debeBloquear)

  const enviandoRef = useRef(false)

  const montoCents = bsToCents(montoStr)
  const validacion = useFormErrors<Campo>()

  const idsFuentes = useMemo(
    () => new Set((fuentes ?? []).map((f) => String(f.id))),
    [fuentes],
  )

  /** Enfoca el control (o el fieldset con tabIndex={-1}) del campo indicado (R2.5). */
  const enfocarCampo = (campo: Campo) => {
    document.getElementById(IDS_Campos[campo])?.focus()
  }

  const marcarDia = (fecha: string) => {
    if (herramienta === "trabajo") {
      const next = new Set(diasTrabajados)
      if (next.has(fecha)) next.delete(fecha)
      else next.add(fecha)
      setDiasTrabajados(next)
      validacion.validarChange("dias", () => validarDiasTrabajados(next))
    } else if (herramienta === "pago") {
      setFechaPago(fecha)
      validacion.validarChange("fecha", () => validarFechaPago(fecha))
    } else {
      const next = new Set(diasTrabajados)
      next.delete(fecha)
      setDiasTrabajados(next)
      validacion.validarChange("dias", () => validarDiasTrabajados(next))
      if (fechaPago === fecha) {
        setFechaPago("")
        validacion.validarChange("fecha", () => validarFechaPago(""))
      }
    }
  }

  const fuenteValida = fuentes?.some((f) => String(f.id) === fuenteId)

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    validacion.limpiarErrorFormulario()
    const valido = validacion.validarSubmit([
      {
        campo: "dias",
        validar: () => validarDiasTrabajados(diasTrabajados),
        enfocar: () => enfocarCampo("dias"),
      },
      {
        campo: "fecha",
        validar: () => validarFechaPago(fechaPago),
        enfocar: () => enfocarCampo("dias"),
      },
      {
        campo: "fuente",
        validar: () => validarFuente(fuenteId, idsFuentes),
        enfocar: () => enfocarCampo("fuente"),
      },
      {
        campo: "metodo",
        validar: () => validarMetodoPago(metodo),
        enfocar: () => enfocarCampo("metodo"),
      },
      {
        campo: "monto",
        validar: () => validarMonto(montoStr),
        enfocar: () => enfocarCampo("monto"),
      },
      {
        campo: "notas",
        validar: () => validarNotas(notas),
        enfocar: () => enfocarCampo("notas"),
      },
    ])
    if (valido) void guardar()
  }

  // Defensa interna: la validez la explica el formulario, no un botón gris (D2).
  const puedeGuardar =
    fuenteValida && fechaPago !== "" && montoCents != null && montoCents > 0 && diasTrabajados.size >= 1

  const guardar = async () => {
    if (!puedeGuardar || montoCents == null || !fuenteValida) return
    if (enviandoRef.current) return
    enviandoRef.current = true
    let pagoId: number | null = null
    try {
      const res = await crearPago.mutateAsync({
        fuente_id: Number(fuenteId),
        fecha_pago: fechaPago,
        monto_enteros: montoCents,
        metodo_pago: metodo,
        notas: notas.trim() ? notas.trim() : null,
        dias_trabajados: [...diasTrabajados].sort(),
      })
      pagoId = res.data.id
    } catch (e) {
      const resuelto =
        e instanceof ApiRequestError
          ? resolverErrorApi(e, ERRORES_API_REGISTRAR)
          : {
              campo: undefined,
              mensaje:
                e instanceof Error
                  ? e.message
                  : "No se pudo guardar el pago. Inténtalo de nuevo.",
            }
      validacion.establecerError(resuelto.campo, resuelto.mensaje)
      enviandoRef.current = false
      return
    }

    try {
      if (comprobante && pagoId != null) {
        await subirComprobante.mutateAsync({ id: pagoId, archivo: comprobante })
      }
    } catch {
      // M3 (D16) reemplaza esto por el error inline y el reintento de comprobante
      // sin recrear el pago. En M2 el hook conserva su toast y no se navega.
      enviandoRef.current = false
      return
    }

    // R4.6: el formulario queda limpio antes de navegar; el ref evita que
    // `useBlocker` vea el snapshot anterior durante la navegación.
    guardadoRef.current = true
    resetear()
    validacion.limpiar()
    enviandoRef.current = false
    navigate("/ingresos")
  }

  const aplicarOcr = (r: {
    monto_enteros?: number
    fecha?: string
    referencia?: string
    descripcion?: string
  }) => {
    if (r.monto_enteros != null) {
      setMontoStr(
        (r.monto_enteros / 100).toLocaleString("es-BO", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      )
    }
    if (r.fecha) setFechaPago(r.fecha)

    const textoNotas = [r.referencia, r.descripcion].filter(Boolean).join(" — ")
    let nuevasNotas = notas
    if (textoNotas) {
      nuevasNotas = notas.split("\n").includes(textoNotas)
        ? notas
        : notas
          ? `${notas}\n${textoNotas}`
          : textoNotas
      setNotas(nuevasNotas)
    }
    // R2.8: valida programáticamente; el OCR puede dejar notas >500 sin pasar por maxLength.
    validacion.validarBlur("notas", () => validarNotas(nuevasNotas))

    setOcrResumen({
      monto: r.monto_enteros,
      fecha: r.fecha,
      descripcion: [r.referencia, r.descripcion].filter(Boolean).join(" — ") || undefined,
    })

    // Lleva la vista al primer campo autocompletado (antes quedaba fuera de pantalla).
    if (r.monto_enteros != null) {
      setTimeout(() => montoInputRef.current?.focus(), 0)
    } else if (r.fecha) {
      setTimeout(
        () => calendarioRef.current?.scrollIntoView({ behavior: motionBehavior(), block: "center" }),
        0,
      )
    }
  }

  const enviando = crearPago.isPending || subirComprobante.isPending

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 id="registrar-pago-titulo" className="text-2xl font-semibold tracking-tight">
          Registrar pago
        </h1>
        <p className="text-sm text-muted-foreground">
          Marca los días trabajados en el calendario y completa el resto del formulario.
        </p>
      </header>

      <form
        noValidate
        aria-labelledby="registrar-pago-titulo"
        aria-busy={enviando}
        onSubmit={onSubmit}
        className="space-y-6"
      >
        {validacion.resumenVisible && (
          <ErrorSummary errores={validacion.listaErrores} onEnfocar={enfocarCampo} />
        )}
        {validacion.errorFormulario && (
          <p role="alert" className="text-sm text-destructive">
            {validacion.errorFormulario}
          </p>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Calendario */}
          <div ref={calendarioRef}>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Calendario</CardTitle>
              </CardHeader>
              <CardContent>
                <CalendarioDias
                  id="registrar-dias"
                  legend={
                    <>
                      Días trabajados y fecha de pago <Obligatorio />
                    </>
                  }
                  error={validacion.errores.dias ?? validacion.errores.fecha ?? null}
                  errorId="registrar-dias-error"
                  diasTrabajados={diasTrabajados}
                  fechaPago={fechaPago}
                  yaTrabajados={yaTrabajados}
                  yaFechasPago={yaFechasPago}
                  herramienta={herramienta}
                  setHerramienta={setHerramienta}
                  onMarcarDia={marcarDia}
                />
              </CardContent>
            </Card>
          </div>

          {/* Datos del pago */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Datos del pago</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fuente">
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
                      id="fuente"
                      disabled={fuentesLoading}
                      aria-required="true"
                      aria-invalid={validacion.errores.fuente ? true : undefined}
                      aria-describedby={
                        validacion.errores.fuente ? "fuente-error" : undefined
                      }
                    >
                      <SelectValue placeholder="Selecciona la fuente" />
                    </SelectTrigger>
                    <SelectContent>
                      {fuentes?.map((f) => (
                        <SelectItem key={f.id} value={String(f.id)}>
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="inline-block size-2.5 rounded-full"
                              style={{ backgroundColor: f.color }}
                              aria-hidden
                            />
                            {f.alias}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError id="fuente-error" error={validacion.errores.fuente} />
                  {fuenteValida && (
                    <div className="pt-1">
                      <Badge variant="outline" className="gap-1.5">
                        <span
                          className="inline-block size-2 rounded-full"
                          style={{
                            backgroundColor: fuentes?.find((f) => String(f.id) === fuenteId)?.color,
                          }}
                          aria-hidden
                        />
                        {fuentes?.find((f) => String(f.id) === fuenteId)?.alias}
                      </Badge>
                    </div>
                  )}
                </div>

                <fieldset
                  id="metodo"
                  tabIndex={-1}
                  className="m-0 min-w-0 space-y-1.5 border-0 p-0"
                  aria-describedby={validacion.errores.metodo ? "metodo-error" : undefined}
                >
                  <legend className="px-0 text-sm leading-none font-medium">
                    Método de pago <Obligatorio />
                  </legend>
                  <div
                    className="grid grid-cols-3 gap-1 rounded-lg border bg-muted/40 p-1"
                    role="radiogroup"
                    aria-label="Método de pago"
                  >
                    {METODOS_PAGO.map((m) => (
                      <Button
                        key={m.value}
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setMetodo(m.value as MetodoPago)}
                        aria-pressed={metodo === m.value}
                        className={
                          metodo === m.value
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground"
                        }
                      >
                        {m.label}
                      </Button>
                    ))}
                  </div>
                  <FieldError id="metodo-error" error={validacion.errores.metodo} />
                </fieldset>

                <div className="space-y-1.5">
                  <Label htmlFor="monto">
                    Monto (Bs) <Obligatorio />
                  </Label>
                  <Input
                    id="monto"
                    ref={montoInputRef}
                    inputMode="decimal"
                    placeholder="Ej: 1.234,56"
                    value={montoStr}
                    aria-required="true"
                    aria-invalid={validacion.errores.monto ? true : undefined}
                    aria-describedby={
                      validacion.errores.monto
                        ? "monto-ayuda monto-separadores monto-error"
                        : "monto-ayuda monto-separadores"
                    }
                    onChange={(e) => {
                      setMontoStr(e.target.value)
                      validacion.validarChange("monto", () => validarMonto(e.target.value))
                    }}
                    onBlur={(e) =>
                      validacion.validarBlur("monto", () => validarMonto(e.target.value))
                    }
                  />
                  <p id="monto-ayuda" className="text-xs text-muted-foreground">
                    {montoCents != null
                      ? `= ${montoCents} centavos (${(montoCents / 100).toLocaleString("es-BO", { minimumFractionDigits: 2 })} Bs)`
                      : "Ingresa un monto válido, p. ej. 265,00"}
                  </p>
                  <p id="monto-separadores" className="text-xs text-muted-foreground">
                    Usa coma decimal y punto para miles: 1.234,56.
                  </p>
                  <FieldError id="monto-error" error={validacion.errores.monto} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notas">Notas</Label>
                  <Textarea
                    id="notas"
                    rows={3}
                    placeholder="Referencia, período pagado, observaciones…"
                    value={notas}
                    maxLength={MAX_NOTAS}
                    aria-invalid={validacion.errores.notas ? true : undefined}
                    aria-describedby={
                      validacion.errores.notas ? "notas-contador notas-error" : "notas-contador"
                    }
                    onChange={(e) => {
                      setNotas(e.target.value)
                      validacion.validarChange("notas", () => validarNotas(e.target.value))
                    }}
                    onBlur={(e) =>
                      validacion.validarBlur("notas", () => validarNotas(e.target.value))
                    }
                  />
                  <p id="notas-contador" className="text-right text-xs text-muted-foreground">
                    {notas.length}/{MAX_NOTAS}
                  </p>
                  <FieldError id="notas-error" error={validacion.errores.notas} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Comprobante (opcional)</CardTitle>
              </CardHeader>
              <CardContent>
                <ComprobanteDropzone
                  comprobante={comprobante}
                  onChange={setComprobante}
                  onResultadoOcr={aplicarOcr}
                />
              </CardContent>
            </Card>

            {ocrResumen && (
              <Card className="border-primary/40 bg-primary/5">
                <CardContent className="space-y-3 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      <ScanText className="size-4 text-primary" aria-hidden />
                      Detectado en el comprobante
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 max-md:min-h-11 max-md:min-w-11"
                      aria-label="Ocultar resumen del comprobante"
                      onClick={() => setOcrResumen(null)}
                    >
                      <X className="size-4" aria-hidden />
                    </Button>
                  </div>
                  <dl className="grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
                    <div className="flex items-center justify-between gap-2 sm:justify-start">
                      <dt className="text-muted-foreground">Monto:</dt>
                      <dd className="font-medium">
                        {ocrResumen.monto != null ? formatBs(ocrResumen.monto) : "no detectado"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:justify-start">
                      <dt className="text-muted-foreground">Fecha:</dt>
                      <dd className="font-medium">
                        {ocrResumen.fecha ? formatearFechaEs(ocrResumen.fecha) : "no detectada"}
                      </dd>
                    </div>
                    {ocrResumen.descripcion && (
                      <div className="flex items-start justify-between gap-2 sm:col-span-2 sm:justify-start">
                        <dt className="text-muted-foreground">Descripción:</dt>
                        <dd className="min-w-0 flex-1 break-words">{ocrResumen.descripcion}</dd>
                      </div>
                    )}
                  </dl>
                  <div className="flex flex-wrap gap-2">
                    {ocrResumen.monto != null && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => montoInputRef.current?.focus()}
                      >
                        Editar monto
                      </Button>
                    )}
                    {ocrResumen.fecha && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          calendarioRef.current?.scrollIntoView({
                            behavior: motionBehavior(),
                            block: "center",
                          })
                        }
                      >
                        Ver fecha en el calendario
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={enviando}
            >
              {enviando ? (
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              ) : (
                <Save className="mr-2 size-4" aria-hidden />
              )}
              Guardar pago
            </Button>
          </div>
        </div>
      </form>

      <ConfirmarDescarteDialog
        abierto={blocker.state === "blocked"}
        onSeguir={() => blocker.reset?.()}
        onDescartar={() => {
          resetear()
          blocker.proceed?.()
        }}
      />
    </div>
  )
}
