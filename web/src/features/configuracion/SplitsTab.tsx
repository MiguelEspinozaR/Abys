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
import { useFuentes, useSplitSettings, useActualizarSplitSettings } from "@/services/hooks"

const MODOS = [
  { value: "preciso", label: "preciso (truncado al centavo)" },
  { value: "redondeado", label: "redondeado (half-up a 1 Bs)" },
  { value: "enteros", label: "enteros (truncado a 1 Bs)" },
] as const

export function SplitsTab() {
  const { data: settings, isLoading } = useSplitSettings()
  const actualizar = useActualizarSplitSettings()
  const { data: fuentes } = useFuentes()

  const autoFuentes = fuentes?.filter((f) => f.split_auto) ?? []

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
              value={settings?.modo_default ?? "preciso"}
              onValueChange={(v) =>
                actualizar.mutate({ modo_default: v as "preciso" | "redondeado" | "enteros" })
              }
              disabled={actualizar.isPending}
            >
              <SelectTrigger id="split-modo-default">
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
