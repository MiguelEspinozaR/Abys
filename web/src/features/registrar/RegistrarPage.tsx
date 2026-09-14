import { useState } from "react"
import { useNavigate } from "react-router-dom"
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
import { useCrearPago, useFuentes, useSubirComprobante } from "@/services/hooks"
import { bsToCents, METODOS_PAGO, toISODate } from "@/lib/format"
import type { MetodoPago } from "@/services/types"
import { CalendarioDias, type Herramienta } from "./CalendarioDias"
import { ComprobanteDropzone } from "./ComprobanteDropzone"

export default function RegistrarPage() {
  const navigate = useNavigate()
  const { data: fuentes, isLoading: fuentesLoading } = useFuentes()
  const crearPago = useCrearPago()
  const subirComprobante = useSubirComprobante()

  const [herramienta, setHerramienta] = useState<Herramienta>("trabajo")
  const [diasTrabajados, setDiasTrabajados] = useState<Set<string>>(new Set())
  const [fechaPago, setFechaPago] = useState<string>(toISODate(new Date()))
  const [fuenteId, setFuenteId] = useState<string>("")
  const [metodo, setMetodo] = useState<MetodoPago>("efectivo")
  const [montoStr, setMontoStr] = useState("")
  const [notas, setNotas] = useState("")
  const [comprobante, setComprobante] = useState<File | null>(null)

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
    const pago = await crearPago.mutateAsync({
      fuente_id: Number(fuenteId),
      fecha_pago: fechaPago,
      monto_enteros: montoCents,
      metodo_pago: metodo,
      notas: notas.trim() ? notas.trim() : null,
      dias_trabajados: [...diasTrabajados].sort(),
    })
    if (comprobante) {
      await subirComprobante.mutateAsync({ id: pago.id, archivo: comprobante })
    }
    navigate("/ingresos")
  }

  const aplicarOcr = (r: { monto_enteros?: number; fecha?: string; referencia?: string }) => {
    if (r.monto_enteros != null) setMontoStr((r.monto_enteros / 100).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    if (r.fecha) {
      setFechaPago(r.fecha)
      setDiasTrabajados((prev) => new Set([...prev, r.fecha!]))
    }
    if (r.referencia) setNotas((prev) => (prev ? `${prev}\n${r.referencia}` : r.referencia!))
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
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Calendario</CardTitle>
          </CardHeader>
          <CardContent>
            <CalendarioDias
              diasTrabajados={diasTrabajados}
              fechaPago={fechaPago}
              herramienta={herramienta}
              setHerramienta={setHerramienta}
              onMarcarDia={marcarDia}
            />
          </CardContent>
        </Card>

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