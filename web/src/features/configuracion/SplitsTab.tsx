import { useEffect, useRef, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
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
import { SplitSquareHorizontal } from "lucide-react"
import { ApiRequestError } from "@/services/api"
import { useFuentes, useSplitSettings, useActualizarSplitSettings } from "@/services/hooks"

const MODOS = [
  { value: "preciso", label: "preciso (truncado al centavo)" },
  { value: "redondeado", label: "redondeado (half-up a 1 Bs)" },
  { value: "enteros", label: "enteros (truncado a 1 Bs)" },
] as const

type ModoDefault = (typeof MODOS)[number]["value"]

export function SplitsTab() {
  const { data: settings, isLoading } = useSplitSettings()
  const actualizar = useActualizarSplitSettings()
  const { data: fuentes } = useFuentes()

  const autoFuentes = fuentes?.filter((f) => f.split_auto) ?? []
  const modoServidor = (settings?.modo_default ?? "preciso") as ModoDefault
  const [modo, setModo] = useState<ModoDefault>(modoServidor)
  const [error, setError] = useState<string | null>(null)
  /** Último valor confirmado/visible; permite revertir ante error (D6). */
  const previoRef = useRef<ModoDefault>(modoServidor)
  /** Descarta callbacks de respuestas fuera de orden (riesgo SPEC §10). */
  const intentoRef = useRef(0)

  useEffect(() => {
    setModo(modoServidor)
    previoRef.current = modoServidor
  }, [modoServidor])

  const cambiarModo = (valor: string) => {
    if (valor === modo || actualizar.isPending) return
    const previo = modo
    previoRef.current = previo
    const intento = ++intentoRef.current
    setModo(valor as ModoDefault)
    setError(null)
    actualizar.mutate(
      { modo_default: valor as ModoDefault },
      {
        onSuccess: () => {
          if (intento !== intentoRef.current) return
          setError(null)
        },
        onError: (e) => {
          if (intento !== intentoRef.current) return
          // D6: el select vuelve al valor previo y el error queda inline.
          setModo(previoRef.current)
          setError(
            e instanceof ApiRequestError && e.message.trim()
              ? e.message
              : "No se pudo guardar el modo de cálculo. Inténtalo de nuevo.",
          )
        },
      },
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <SplitSquareHorizontal className="size-4" aria-hidden />
            Modo de cálculo por defecto
          </CardTitle>
          <CardDescription>
            Se usa al generar un split cuando la fuente no define un modo propio.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-sm space-y-1.5">
          <Label htmlFor="split-modo-default">Modo por defecto</Label>
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select
              value={modo}
              onValueChange={cambiarModo}
              disabled={actualizar.isPending}
            >
              <SelectTrigger
                id="split-modo-default"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "split-modo-default-error" : undefined}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODOS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <p
            id="split-modo-default-error"
            aria-live="polite"
            className={error ? "text-xs text-destructive" : "sr-only"}
          >
            {error}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Fuentes con split automático ({autoFuentes.length})
          </CardTitle>
          <CardDescription>
            Configura el split automático de cada fuente en la pestaña Fuentes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {autoFuentes.length === 0 ? (
            <Alert>
              <AlertTitle>Sin fuentes en automático</AlertTitle>
              <AlertDescription>
                Activa "Split automático" en una fuente para que sus pagos generen el split al
                registrarse.
              </AlertDescription>
            </Alert>
          ) : (
            <ul className="space-y-2">
              {autoFuentes.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="inline-block size-2.5 rounded-full"
                      style={{ backgroundColor: f.color }}
                      aria-hidden
                    />
                    {f.alias}
                  </span>
                  <Badge variant="secondary">{f.split_auto_modo ?? "modo por defecto"}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
