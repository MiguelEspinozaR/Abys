import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { FormEvent } from "react"
import { useBlocker } from "react-router-dom"
import { Loader2, Save } from "lucide-react"
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
import {
  useCrearPago,
  useFuentes,
  usePagos,
  useRegistrarSettings,
  useSplitSettings,
  useSubirComprobante,
} from "@/services/hooks"
import { ApiRequestError } from "@/services/api"
import { ERRORES_API_REGISTRAR, resolverErrorApi } from "@/lib/api-errors"
import { construirDiasPayload } from "@/lib/pagoPayload"
import {
  normalizarModoRedondeo,
  normalizarRegistrarSettings,
} from "@/lib/settingsFallback"
import { useUiStore } from "@/store/uiStore"
import { bsToCents, formatBs, formatearFechaEs, METODOS_PAGO, toISODate } from "@/lib/format"
import {
  MAX_NOTAS,
  validarDiasTrabajados,
  validarFechaPago,
  validarFuente,
  validarMetodoPago,
  validarMonto,
  validarNotas,
} from "@/lib/validators"
import type { MetodoPago, ModoRegistro } from "@/services/types"
import {
  distribuir,
  MODOS_DISTRIBUCION,
  type ModoDistribucion,
} from "@/lib/distribuir"
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
  monto: "registrar-montos",
  notas: "notas",
}

const MODOS_REGISTRO: { valor: ModoRegistro; label: string }[] = [
  { valor: "detallado", label: "Detallado" },
  { valor: "distribuido", label: "Distribuido" },
]

/** Marca visual de obligatorio (D12): `*` aria-hidden; la semántica va en aria-required. */
const Obligatorio = () => (
  <span aria-hidden className="ml-0.5">
    *
  </span>
)

export default function RegistrarPage() {
  const { data: fuentes, isLoading: fuentesLoading } = useFuentes()
  const crearPago = useCrearPago()
  const subirComprobante = useSubirComprobante()

  // Defaults resueltos por los hooks (backend si responde, abys-ui si falla).
  const { data: registrarSettings } = useRegistrarSettings()
  const { data: splitSettings } = useSplitSettings()

  /**
   * Init síncrono desde el store persistido (AC8): evita el flash de los
   * hardcodeados y que el guard de cambios arranque sucio. Normalizamos también
   * el local para tolerar un localStorage corrupto.
   */
  const [defaultsIniciales] = useState(() => {
    const s = useUiStore.getState()
    const registrar = normalizarRegistrarSettings(
      {
        metodo_default: s.registrarMetodoDefault,
        modo_default: s.registrarModoDefault,
      },
      { metodo_default: "efectivo", modo_default: "detallado" },
    )
    return {
      metodo: registrar.metodo_default,
      modoRegistro: registrar.modo_default,
      modoRedondeo: normalizarModoRedondeo(s.splitModoDefault, "preciso"),
    }
  })

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
  const [modoRegistro, setModoRegistro] = useState<ModoRegistro>(defaultsIniciales.modoRegistro)
  const [montosDia, setMontosDia] = useState<Record<string, string>>({})
  const [totalDistribuidoStr, setTotalDistribuidoStr] = useState("")
  const [modoRedondeo, setModoRedondeo] = useState<ModoDistribucion>(
    defaultsIniciales.modoRedondeo,
  )
  const [fechaPago, setFechaPago] = useState<string>(toISODate(new Date()))
  const [fuenteId, setFuenteId] = useState<string>("")
  const [metodo, setMetodo] = useState<MetodoPago>(defaultsIniciales.metodo)
  const [notas, setNotas] = useState("")
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [comprobanteError, setComprobanteError] = useState<string | null>(null)
  const [pagoGuardado, setPagoGuardado] = useState(false)

  /** Pago ya creado: los reintentos de comprobante nunca vuelven a hacer POST /pagos (D16). */
  const pagoIdRef = useRef<number | null>(null)

  /**
   * Snapshot de cambios sin guardar (R4). Incluye los campos editables y un
   * descriptor del comprobante (el `File` en sí no se compara estructuralmente).
   */
  const snapshot = {
    dias: [...diasTrabajados].sort(),
    fechaPago,
    fuenteId,
    metodo,
    modoRegistro,
    montosDia,
    totalDistribuidoStr,
    modoRedondeo,
    notas,
    comprobante: comprobante
      ? `${comprobante.name}:${comprobante.size}:${comprobante.lastModified}`
      : "",
  }
  const { sucio, resetear } = useFormDirty(snapshot)
  const sucioRef = useRef(sucio)
  sucioRef.current = sucio
  const guardadoRef = useRef(false)

  /** Valores ganadores: backend si respondió; local de `abys-ui` en caso de fallo. */
  const defaultsResueltos = useMemo(() => {
    const registrar = normalizarRegistrarSettings(registrarSettings, {
      metodo_default: defaultsIniciales.metodo,
      modo_default: defaultsIniciales.modoRegistro,
    })
    return {
      metodo: registrar.metodo_default,
      modoRegistro: registrar.modo_default,
      modoRedondeo: normalizarModoRedondeo(
        splitSettings?.modo_default,
        defaultsIniciales.modoRedondeo,
      ),
    }
  }, [registrarSettings, splitSettings, defaultsIniciales])

  /**
   * Aplica una sola vez los defaults ya resueltos y re-baselinea la guardia con
   * el snapshot resultante. Espera a que ambas queries terminen para que el
   * valor del backend gane, y se abstiene si el usuario ya editó algo (D5:
   * `#modo-redondeo` sigue siendo editable y nunca se sobrescribe).
   */
  const defaultsAplicadosRef = useRef(false)
  useEffect(() => {
    if (defaultsAplicadosRef.current) return
    if (!registrarSettings || !splitSettings) return
    defaultsAplicadosRef.current = true
    if (sucioRef.current) return
    setMetodo(defaultsResueltos.metodo)
    setModoRegistro(defaultsResueltos.modoRegistro)
    setModoRedondeo(defaultsResueltos.modoRedondeo)
    resetear({
      ...snapshot,
      metodo: defaultsResueltos.metodo,
      modoRegistro: defaultsResueltos.modoRegistro,
      modoRedondeo: defaultsResueltos.modoRedondeo,
    })
  }, [registrarSettings, splitSettings, defaultsResueltos, resetear, snapshot])

  const debeBloquear = useCallback(
    () => sucioRef.current && !guardadoRef.current,
    [],
  )
  const blocker = useBlocker(debeBloquear)

  const enviandoRef = useRef(false)

  const diasOrdenados = useMemo(() => [...diasTrabajados].sort(), [diasTrabajados])
  const totalDistribuidoCents = bsToCents(totalDistribuidoStr)

  const montosDistribuidos = useMemo(() => {
    if (modoRegistro !== "distribuido") return []
    if (diasOrdenados.length === 0 || totalDistribuidoCents == null) return []
    return distribuir(totalDistribuidoCents, diasOrdenados.length, modoRedondeo)
  }, [modoRegistro, diasOrdenados, totalDistribuidoCents, modoRedondeo])

  const montosDetallados = useMemo(
    () => diasOrdenados.map((fecha) => bsToCents(montosDia[fecha] ?? "")),
    [diasOrdenados, montosDia],
  )
  const totalDetalladoCents = montosDetallados.reduce<number>(
    (acc, cents) => acc + (cents ?? 0),
    0,
  )

  /** Días con su monto: helper puro, sin campo de modo (R4.3/AC9). */
  const diasPayload = useMemo(
    () =>
      construirDiasPayload({
        modoRegistro,
        diasOrdenados,
        montosDetallados,
        totalDistribuidoCents,
        modoRedondeo,
      }),
    [modoRegistro, diasOrdenados, montosDetallados, totalDistribuidoCents, modoRedondeo],
  )

  const totalCents = useMemo(
    () => diasPayload.reduce((acc, d) => acc + d.monto_enteros, 0),
    [diasPayload],
  )

  const validacion = useFormErrors<Campo>()

  const idsFuentes = useMemo(
    () => new Set((fuentes ?? []).map((f) => String(f.id))),
    [fuentes],
  )

  /** Enfoca el control (o el fieldset con tabIndex={-1}) del campo indicado (R2.5). */
  const enfocarCampo = (campo: Campo) => {
    document.getElementById(IDS_Campos[campo])?.focus()
  }

  /** Valida los montos: por día (detallado) o total (distribuido). */
  const validarMontos = (): string | null => {
    if (diasOrdenados.length === 0) return null
    if (modoRegistro === "distribuido") {
      return validarMonto(totalDistribuidoStr)
    }
    for (const fecha of diasOrdenados) {
      if (bsToCents(montosDia[fecha] ?? "") == null) {
        return "Ingresa el monto de cada día seleccionado, p. ej. 150,00"
      }
    }
    if (totalDetalladoCents <= 0) return "El total del pago debe ser mayor a 0"
    return null
  }

  const eliminarMonto = (fecha: string) => {
    setMontosDia((prev) => {
      if (!(fecha in prev)) return prev
      const next = { ...prev }
      delete next[fecha]
      return next
    })
  }

  const marcarDia = (fecha: string) => {
    if (herramienta === "trabajo") {
      const next = new Set(diasTrabajados)
      if (next.has(fecha)) {
        next.delete(fecha)
        eliminarMonto(fecha)
      } else {
        next.add(fecha)
        setMontosDia((prev) => ({ ...prev, [fecha]: prev[fecha] ?? "" }))
      }
      setDiasTrabajados(next)
      validacion.validarChange("dias", () => validarDiasTrabajados(next))
    } else if (herramienta === "pago") {
      setFechaPago(fecha)
      validacion.validarChange("fecha", () => validarFechaPago(fecha))
    } else {
      const next = new Set(diasTrabajados)
      next.delete(fecha)
      setDiasTrabajados(next)
      eliminarMonto(fecha)
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
    // Tras crear el pago los campos están bloqueados: no se valida ni se reenvía.
    if (pagoGuardado) return
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
        validar: validarMontos,
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
    fuenteValida && fechaPago !== "" && diasPayload.length >= 1 && totalCents > 0

  const mensajeErrorSubida = (e: unknown): string => {
    if (e instanceof ApiRequestError) {
      return e.message.trim() || "No se pudo subir el comprobante. Inténtalo de nuevo."
    }
    if (e instanceof Error && e.message.trim()) return e.message
    return "No se pudo subir el comprobante. Inténtalo de nuevo."
  }

  /**
   * Limpieza completa del formulario sin salir de /registrar (R1.1/R1.2/D1).
   * El snapshot explícito re-baselinea la guardia con el estado ya vacío: un
   * `resetear()` sin argumento tomaría el snapshot del último render (lleno).
   */
  const limpiarFormulario = () => {
    guardadoRef.current = true
    const fechaPagoLimpia = toISODate(new Date())
    resetear({
      dias: [],
      fechaPago: fechaPagoLimpia,
      fuenteId: "",
      metodo: defaultsResueltos.metodo,
      modoRegistro: defaultsResueltos.modoRegistro,
      montosDia: {},
      totalDistribuidoStr: "",
      modoRedondeo: defaultsResueltos.modoRedondeo,
      notas: "",
      comprobante: "",
    })
    validacion.limpiar()
    setDiasTrabajados(new Set())
    setMontosDia({})
    setFuenteId("")
    setNotas("")
    setComprobante(null)
    setComprobanteError(null)
    setTotalDistribuidoStr("")
    setHerramienta("trabajo")
    setFechaPago(fechaPagoLimpia)
    pagoIdRef.current = null
    setPagoGuardado(false)
    enviandoRef.current = false
    setMetodo(defaultsResueltos.metodo)
    setModoRegistro(defaultsResueltos.modoRegistro)
    setModoRedondeo(defaultsResueltos.modoRedondeo)
  }

  /** El pago ya está guardado: se limpia y se permanece en la misma vista. */
  const finalizarGuardado = () => {
    limpiarFormulario()
  }

  /** Sube solo el comprobante del pago ya creado; nunca reenvía el pago (D16). */
  const subirComprobanteDePago = async (pagoId: number): Promise<boolean> => {
    if (!comprobante) return true
    try {
      await subirComprobante.mutateAsync({ id: pagoId, archivo: comprobante })
      setComprobanteError(null)
      return true
    } catch (e) {
      setComprobanteError(mensajeErrorSubida(e))
      return false
    }
  }

  const guardar = async () => {
    // El pago ya se creó: solo se permite reintentar el comprobante (D16). Un submit
    // tardío nunca debe reenviar ni descartar los cambios bloqueados.
    if (pagoGuardado) return
    if (!puedeGuardar || !fuenteValida) return
    if (validarNotas(notas) != null) {
      validacion.validarBlur("notas", () => validarNotas(notas))
      return
    }
    if (enviandoRef.current) return
    enviandoRef.current = true
    setComprobanteError(null)

    // Si el pago ya se creó en un intento anterior, solo se reintenta el upload.
    let pagoId = pagoIdRef.current
    if (pagoId == null) {
      try {
        const res = await crearPago.mutateAsync({
          fuente_id: Number(fuenteId),
          fecha_pago: fechaPago,
          metodo_pago: metodo,
          notas: notas.trim() ? notas.trim() : null,
          dias_trabajados: diasPayload,
        })
        pagoId = res.data.id
        pagoIdRef.current = pagoId
        setPagoGuardado(true)
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
    }

    const subido = await subirComprobanteDePago(pagoId)
    if (!subido) {
      // El pago queda guardado; se ofrece reintentar solo el comprobante.
      enviandoRef.current = false
      return
    }

    finalizarGuardado()
  }

  /** Reintento D16: solo sube el comprobante del pago ya creado. */
  const reintentarComprobante = async () => {
    const pagoId = pagoIdRef.current
    if (pagoId == null || !comprobante || enviandoRef.current) return
    enviandoRef.current = true
    setComprobanteError(null)
    const subido = await subirComprobanteDePago(pagoId)
    enviandoRef.current = false
    if (subido) finalizarGuardado()
  }

  /**
   * Salida de la ruta de fallo de comprobante (R1.3/D16): misma vista, sin
   * navegación a /ingresos y con el formulario listo para otro pago.
   */
  const volverARegistrar = () => {
    limpiarFormulario()
  }

  const enviando = crearPago.isPending || subirComprobante.isPending

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 id="registrar-pago-titulo" className="text-2xl font-semibold tracking-tight">
          Registrar pago
        </h1>
        <p className="text-sm text-muted-foreground">
          Marca los días trabajados en el calendario y elige cómo cargar los montos.
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
          <div>
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
                  disabled={pagoGuardado}
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
                    disabled={fuentesLoading || pagoGuardado}
                    onValueChange={(v) => {
                      setFuenteId(v)
                      validacion.validarChange("fuente", () => validarFuente(v, idsFuentes))
                    }}
                  >
                    <SelectTrigger
                      id="fuente"
                      disabled={fuentesLoading || pagoGuardado}
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
                  aria-invalid={validacion.errores.metodo ? true : undefined}
                >
                  <legend className="px-0 text-sm leading-none font-medium">
                    Método de pago <Obligatorio />
                  </legend>
                  <div
                    className="grid grid-cols-3 gap-1 rounded-lg border bg-muted/40 p-1"
                    role="group"
                    aria-label="Método de pago"
                  >
                    {METODOS_PAGO.map((m) => (
                      <Button
                        key={m.value}
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setMetodo(m.value as MetodoPago)}
                        disabled={pagoGuardado}
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

                <fieldset
                  id="registrar-modo"
                  className="m-0 min-w-0 space-y-1.5 border-0 p-0"
                >
                  <legend className="px-0 text-sm leading-none font-medium">
                    Modo de registro
                  </legend>
                  <div
                    className="grid grid-cols-2 gap-1 rounded-lg border bg-muted/40 p-1"
                    role="group"
                    aria-label="Modo de registro"
                  >
                    {MODOS_REGISTRO.map((m) => (
                      <Button
                        key={m.valor}
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setModoRegistro(m.valor)}
                        disabled={pagoGuardado}
                        aria-pressed={modoRegistro === m.valor}
                        className={
                          modoRegistro === m.valor
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground"
                        }
                      >
                        {m.label}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {modoRegistro === "detallado"
                      ? "Ingresa el monto de cada día; el total se calcula solo."
                      : "Ingresa el total y el sistema lo reparte entre los días."}
                  </p>
                </fieldset>

                <fieldset
                  id="registrar-montos"
                  tabIndex={-1}
                  className="m-0 min-w-0 space-y-2 border-0 p-0"
                  aria-describedby={validacion.errores.monto ? "monto-ayuda monto-error" : "monto-ayuda"}
                  aria-invalid={validacion.errores.monto ? true : undefined}
                >
                  <legend className="px-0 text-sm leading-none font-medium">
                    {modoRegistro === "detallado"
                      ? "Monto por día (Bs)"
                      : "Total a distribuir (Bs)"}{" "}
                    <Obligatorio />
                  </legend>

                  {modoRegistro === "detallado" ? (
                    diasOrdenados.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Selecciona al menos un día en el calendario.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {diasOrdenados.map((fecha) => {
                          const inputId = `monto-dia-${fecha}`
                          return (
                            <div
                              key={fecha}
                              className="flex flex-wrap items-center justify-between gap-2"
                            >
                              <Label htmlFor={inputId} className="text-sm font-normal">
                                {formatearFechaEs(fecha)}
                              </Label>
                              <Input
                                id={inputId}
                                inputMode="decimal"
                                placeholder="0,00"
                                value={montosDia[fecha] ?? ""}
                                disabled={pagoGuardado}
                                aria-required="true"
                                aria-invalid={validacion.errores.monto ? true : undefined}
                                aria-describedby={
                                  validacion.errores.monto ? "monto-error" : undefined
                                }
                                className="w-32"
                                onChange={(e) => {
                                  const valor = e.target.value
                                  setMontosDia((prev) => ({ ...prev, [fecha]: valor }))
                                  validacion.validarChange("monto", validarMontos)
                                }}
                                onBlur={() =>
                                  validacion.validarBlur("monto", validarMontos)
                                }
                              />
                            </div>
                          )
                        })}
                      </div>
                    )
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="monto-total">Total (Bs)</Label>
                        <Input
                          id="monto-total"
                          inputMode="decimal"
                          placeholder="Ej: 1.234,56"
                          value={totalDistribuidoStr}
                          disabled={pagoGuardado}
                          aria-required="true"
                          aria-invalid={validacion.errores.monto ? true : undefined}
                          aria-describedby={
                            validacion.errores.monto ? "monto-error" : undefined
                          }
                          onChange={(e) => {
                            setTotalDistribuidoStr(e.target.value)
                            validacion.validarChange("monto", validarMontos)
                          }}
                          onBlur={() =>
                            validacion.validarBlur("monto", validarMontos)
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="modo-redondeo">Redondeo</Label>
                        <Select
                          value={modoRedondeo}
                          disabled={pagoGuardado}
                          onValueChange={(v) => setModoRedondeo(v as ModoDistribucion)}
                        >
                          <SelectTrigger
                            id="modo-redondeo"
                            className="w-full"
                            aria-describedby="modo-redondeo-ayuda"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MODOS_DISTRIBUCION.map((m) => (
                              <SelectItem key={m.value} value={m.value}>
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p id="modo-redondeo-ayuda" className="text-xs text-muted-foreground">
                          El sobrante se asigna al último día.
                        </p>
                      </div>

                      {diasOrdenados.length > 0 &&
                      montosDistribuidos.length === diasOrdenados.length ? (
                        <div>
                          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            Vista previa
                          </p>
                          <ul className="mt-1 space-y-1">
                            {diasOrdenados.map((fecha, i) => (
                              <li
                                key={fecha}
                                className="flex items-center justify-between gap-2 text-sm"
                              >
                                <span>{formatearFechaEs(fecha)}</span>
                                <span className="font-medium tabular-nums">
                                  {formatBs(montosDistribuidos[i])}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Ingresa un total válido para ver la vista previa.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Total del pago: </span>
                    <span className="font-semibold tabular-nums">
                      {formatBs(
                        modoRegistro === "distribuido"
                          ? (totalDistribuidoCents ?? 0)
                          : totalDetalladoCents,
                      )}
                    </span>
                  </div>
                  <p id="monto-ayuda" className="text-xs text-muted-foreground">
                    {modoRegistro === "detallado"
                      ? "El total es la suma de los montos por día."
                      : "El total se reparte equitativamente entre los días seleccionados."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Usa coma decimal y punto para miles: 1.234,56.
                  </p>
                  <FieldError id="monto-error" error={validacion.errores.monto} />
                </fieldset>

                <div className="space-y-1.5">
                  <Label htmlFor="notas">Notas</Label>
                  <Textarea
                    id="notas"
                    rows={3}
                    placeholder="Referencia, período pagado, observaciones…"
                    value={notas}
                    disabled={pagoGuardado}
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
                  onChange={(f) => {
                    setComprobante(f)
                    setComprobanteError(null)
                  }}
                  errorSubida={comprobanteError}
                />
                {/* Con el pago creado solo quedan estas salidas: reintentar el
                    comprobante (nunca re-POST /pagos) o volver a registrar (D16). */}
                {pagoGuardado && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => void reintentarComprobante()}
                      disabled={subirComprobante.isPending || !comprobante}
                    >
                      {subirComprobante.isPending ? (
                        <Loader2 className="mr-2 size-3.5 animate-spin" aria-hidden />
                      ) : null}
                      Reintentar comprobante
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={volverARegistrar}
                    >
                      Volver a registrar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {!pagoGuardado && (
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
            )}
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
