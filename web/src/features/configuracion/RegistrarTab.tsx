import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ClipboardList } from "lucide-react"
import { toast } from "sonner"
import { ApiRequestError } from "@/services/api"
import { useActualizarRegistrarSettings, useRegistrarSettings } from "@/services/hooks"
import type { RegistrarSettings } from "@/services/types"
import {
  METODOS_PAGO,
  MODOS_REGISTRO,
  type MetodoPago,
  type ModoRegistro,
} from "@/lib/dominio"

export function RegistrarTab() {
  const { data: settings, isLoading } = useRegistrarSettings()
  const actualizar = useActualizarRegistrarSettings()

  const metodoServidor: MetodoPago = settings?.metodo_default ?? "efectivo"
  const modoServidor: ModoRegistro = settings?.modo_default ?? "detallado"

  const [metodo, setMetodo] = useState<MetodoPago>(metodoServidor)
  const [modo, setModo] = useState<ModoRegistro>(modoServidor)
  const [error, setError] = useState<string | null>(null)
  /** Últimos valores confirmados/visibles; permite revertir ante error (R3.5). */
  const previoRef = useRef<RegistrarSettings>({
    metodo_default: metodoServidor,
    modo_default: modoServidor,
  })
  /** Descarta callbacks de respuestas fuera de orden (riesgo SPEC §10). */
  const intentoRef = useRef(0)

  useEffect(() => {
    setMetodo(metodoServidor)
    setModo(modoServidor)
    previoRef.current = { metodo_default: metodoServidor, modo_default: modoServidor }
  }, [metodoServidor, modoServidor])

  const guardar = (payload: RegistrarSettings, intento: number) => {
    actualizar.mutate(payload, {
      onSuccess: () => {
        if (intento !== intentoRef.current) return
        setError(null)
        toast.success("Defaults de registro actualizados")
      },
      onError: (e) => {
        if (intento !== intentoRef.current) return
        // R3.5: ambos selects vuelven a los valores previos y el error queda inline.
        setMetodo(previoRef.current.metodo_default)
        setModo(previoRef.current.modo_default)
        setError(
          e instanceof ApiRequestError && e.message.trim()
            ? e.message
            : "No se pudieron guardar los defaults de registro. Inténtalo de nuevo.",
        )
      },
    })
  }

  const cambiarMetodo = (valor: string) => {
    if (valor === metodo || actualizar.isPending) return
    const siguiente = valor as MetodoPago
    const intento = ++intentoRef.current
    previoRef.current = { metodo_default: metodo, modo_default: modo }
    setMetodo(siguiente)
    setError(null)
    guardar({ metodo_default: siguiente, modo_default: modo }, intento)
  }

  const cambiarModo = (valor: string) => {
    if (valor === modo || actualizar.isPending) return
    const siguiente = valor as ModoRegistro
    const intento = ++intentoRef.current
    previoRef.current = { metodo_default: metodo, modo_default: modo }
    setModo(siguiente)
    setError(null)
    guardar({ metodo_default: metodo, modo_default: siguiente }, intento)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <ClipboardList className="size-4" aria-hidden />
            Defaults al registrar ingresos
          </CardTitle>
          <CardDescription>
            Se aplican al abrir el formulario de registro. Puedes cambiarlos en cada pago.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid max-w-sm gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="registrar-metodo-default">Método de pago por defecto</Label>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={metodo}
                onValueChange={cambiarMetodo}
                disabled={actualizar.isPending}
              >
                <SelectTrigger
                  id="registrar-metodo-default"
                  className="w-full max-md:min-h-11"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "registrar-defaults-error" : undefined}
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
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="registrar-modo-default">Modo de registro por defecto</Label>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={modo} onValueChange={cambiarModo} disabled={actualizar.isPending}>
                <SelectTrigger
                  id="registrar-modo-default"
                  className="w-full max-md:min-h-11"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "registrar-defaults-error" : undefined}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODOS_REGISTRO.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <p
            id="registrar-defaults-error"
            aria-live="polite"
            className={error ? "text-xs text-destructive" : "sr-only"}
          >
            {error}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
