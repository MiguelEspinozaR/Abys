import { useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
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
import { useCrearPago, useFuentes, usePagos, useSubirComprobante } from "@/services/hooks"
import { bsToCents, formatBs, formatearFechaEs, METODOS_PAGO, toISODate } from "@/lib/format"
import type { MetodoPago } from "@/services/types"
import { CalendarioDias, type Herramienta } from "./CalendarioDias"
import { ComprobanteDropzone } from "./ComprobanteDropzone"

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

  const montoCents = bsToCents(montoStr)

  const marcarDia = (fecha: string) => {
    if (herramienta === "trabajo") {
      setDiasTrabajados((prev) => {
        const next = new Set(prev)
        if (next.has(fecha)) next.delete(fecha)
        else next.add(fecha)
        return next
      })
    } else if (herramienta === "pago") {
      setFechaPago(fecha)
    } else {
      setDiasTrabajados((prev) => {
        const next = new Set(prev)
        next.delete(fecha)
        return next
      })
      if (fechaPago === fecha) setFechaPago("")
    }
  }

  const fuenteValida = fuentes?.some((f) => String(f.id) === fuenteId)
  const puedeGuardar =
    fuenteValida && fechaPago !== "" && montoCents != null && montoCents > 0 && diasTrabajados.size >= 1

  const guardar = async () => {
    if (!puedeGuardar || montoCents == null || !fuenteValida) return
    const res = await crearPago.mutateAsync({
      fuente_id: Number(fuenteId),
      fecha_pago: fechaPago,
      monto_enteros: montoCents,
      metodo_pago: metodo,
      notas: notas.trim() ? notas.trim() : null,
      dias_trabajados: [...diasTrabajados].sort(),
    })
    if (comprobante) {
      await subirComprobante.mutateAsync({ id: res.data.id, archivo: comprobante })
    }
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
    if (textoNotas) {
      setNotas((prev) => {
        if (prev.split("\n").includes(textoNotas)) return prev
        return prev ? `${prev}\n${textoNotas}` : textoNotas
      })
    }

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
        () => calendarioRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
        0,
      )
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Registrar pago</h1>
        <p className="text-sm text-muted-foreground">
          Marca los días trabajados en el calendario y completa el resto del formulario.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Calendario */}
        <div ref={calendarioRef}>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Calendario</CardTitle>
            </CardHeader>
            <CardContent>
              <CalendarioDias
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
                <Label htmlFor="fuente">Fuente</Label>
                <Select value={fuenteId} onValueChange={setFuenteId}>
                  <SelectTrigger id="fuente" disabled={fuentesLoading}>
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

              <div className="space-y-1.5">
                <Label htmlFor="metodo">Método de pago</Label>
                <div className="grid grid-cols-3 gap-1 rounded-lg border bg-muted/40 p-1" role="radiogroup" aria-label="Método de pago">
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
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="monto">Monto (Bs)</Label>
                <Input
                  id="monto"
                  ref={montoInputRef}
                  inputMode="decimal"
                  placeholder="Ej: 1.234,56"
                  value={montoStr}
                  onChange={(e) => setMontoStr(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {montoCents != null
                    ? `= ${montoCents} centavos (${(montoCents / 100).toLocaleString("es-BO", { minimumFractionDigits: 2 })} Bs)`
                    : "Ingresa un monto válido, p. ej. 265,00"}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notas">Notas</Label>
                <Textarea
                  id="notas"
                  rows={3}
                  placeholder="Referencia, período pagado, observaciones…"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                />
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
                    className="size-7"
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
                          behavior: "smooth",
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
            type="button"
            size="lg"
            className="w-full"
            onClick={guardar}
            disabled={!puedeGuardar || crearPago.isPending || subirComprobante.isPending}
          >
            {(crearPago.isPending || subirComprobante.isPending) ? (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            ) : (
              <Save className="mr-2 size-4" aria-hidden />
            )}
            Guardar pago
          </Button>
        </div>
      </div>
    </div>
  )
}