import { useRef, useState } from "react"
import {
  History,
  ImageOff,
  Loader2,
  Pencil,
  Percent,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { assetUrl } from "@/services/api"
import {
  useActualizarCuenta,
  useCambiarTasa,
  useCrearCuenta,
  useCuentas,
  useEliminarCuenta,
  useEliminarQR,
  useHistorialTasas,
  useSubirQR,
} from "@/services/hooks"
import { bpsToPercentNum, formatTasaBps } from "@/lib/format"
import type { Cuenta } from "@/services/types"

// ---------------------------------------------------------------------------
// Dialog de tasa
// ---------------------------------------------------------------------------

function TasaDialog({ cuenta, onClose }: { cuenta: Cuenta; onClose: () => void }) {
  const cambiarTasa = useCambiarTasa()
  const [tasa, setTasa] = useState(String(bpsToPercentNum(cuenta.tasa_bps)))
  const [aplicarPendientes, setAplicarPendientes] = useState(false)

  const tasaNum = Number(tasa.replace(",", "."))
  const valido = Number.isFinite(tasaNum) && tasaNum >= 0 && tasaNum <= 100

  const guardar = async () => {
    if (!valido) return
    await cambiarTasa.mutateAsync({
      id: cuenta.id,
      payload: { tasa: tasaNum, aplicar_pendientes: aplicarPendientes },
    })
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tasa de {cuenta.alias}</DialogTitle>
          <DialogDescription>
            Actual: {formatTasaBps(cuenta.tasa_bps)}. La suma de tasas de cuentas ≠ General no
            puede superar 100% (lo valida el servidor).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`tasa-${cuenta.id}`}>
              Tasa en % <span className="text-muted-foreground">(100% = 10000 bps)</span>
            </Label>
            <Input
              id={`tasa-${cuenta.id}`}
              inputMode="decimal"
              value={tasa}
              onChange={(e) => setTasa(e.target.value)}
              placeholder="Ej: 25"
            />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={aplicarPendientes}
              onCheckedChange={(v) => setAplicarPendientes(v === true)}
            />
            <span>
              Aplicar a transacciones pendientes
              <span className="block text-xs text-muted-foreground">
                Recalcula los splits con transacciones pendientes usando esta nueva tasa.
              </span>
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={!valido || cambiarTasa.isPending}>
            {cambiarTasa.isPending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
            Guardar tasa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Dialog historial
// ---------------------------------------------------------------------------

function HistorialDialog({ cuenta, onClose }: { cuenta: Cuenta; onClose: () => void }) {
  const { data: historial, isLoading } = useHistorialTasas(cuenta.id)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Historial de tasas — {cuenta.alias}</DialogTitle>
          <DialogDescription>
            Cada cambio queda registrado; los splits conservan el snapshot de ese momento.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {historial?.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin registros todavía.</p>
            )}
            {historial?.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span className="font-medium tabular-nums">{formatTasaBps(h.tasa_bps)}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(h.aplicada_desde).toLocaleString("es-BO")}
                </span>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Dialog crear/editar cuenta
// ---------------------------------------------------------------------------

interface FormCuenta {
  alias: string
  banco: string
  numero: string
}

function CuentaDialog({
  cuenta,
  onClose,
}: {
  cuenta: Cuenta | null
  onClose: () => void
}) {
  const crear = useCrearCuenta()
  const actualizar = useActualizarCuenta()
  const [form, setForm] = useState<FormCuenta>({
    alias: cuenta?.alias ?? "",
    banco: cuenta?.banco ?? "",
    numero: cuenta?.numero ?? "",
  })
  const isPending = crear.isPending || actualizar.isPending
  const valido = form.alias.trim() !== ""

  const guardar = async () => {
    if (!valido) return
    const payload = {
      alias: form.alias.trim(),
      banco: form.banco.trim() ? form.banco.trim() : null,
      numero: form.numero.trim() ? form.numero.trim() : null,
    }
    if (cuenta) await actualizar.mutateAsync({ id: cuenta.id, payload })
    else await crear.mutateAsync(payload)
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cuenta ? `Editar cuenta "${cuenta.alias}"` : "Nueva cuenta"}</DialogTitle>
          <DialogDescription>
            Cuentas bancarias donde se distribuyen los pagos (la General se crea sola).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cuenta-alias">Alias</Label>
            <Input
              id="cuenta-alias"
              value={form.alias}
              onChange={(e) => setForm((f) => ({ ...f, alias: e.target.value }))}
              placeholder="Ej: Box"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cuenta-banco">Banco</Label>
            <Input
              id="cuenta-banco"
              value={form.banco}
              onChange={(e) => setForm((f) => ({ ...f, banco: e.target.value }))}
              placeholder="Ej: BANCOMUNIDAD"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cuenta-numero">Número</Label>
            <Input
              id="cuenta-numero"
              value={form.numero}
              onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
              placeholder="Número de cuenta"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={!valido || isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
            {cuenta ? "Guardar cambios" : "Crear cuenta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Fila QR con upload
// ---------------------------------------------------------------------------

function QrCell({ cuenta }: { cuenta: Cuenta }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const subir = useSubirQR()
  const eliminar = useEliminarQR()
  const qrUrl = assetUrl(cuenta.qr_ruta)

  return (
    <div className="flex items-center gap-2">
      {qrUrl ? (
        <img
          src={qrUrl}
          alt={`QR de ${cuenta.alias}`}
          className="size-9 rounded border object-cover"
        />
      ) : (
        <div className="grid size-9 place-items-center rounded border border-dashed text-muted-foreground">
          <ImageOff className="size-4" aria-hidden />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) subir.mutate({ id: cuenta.id, archivo: f })
        }}
      />
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => inputRef.current?.click()}
          disabled={subir.isPending}
          aria-label={`Subir QR de ${cuenta.alias}`}
        >
          {subir.isPending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Upload className="size-3.5" aria-hidden />
          )}
        </Button>
        {qrUrl && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-destructive"
            onClick={() => eliminar.mutate(cuenta.id)}
            aria-label={`Quitar QR de ${cuenta.alias}`}
          >
            <X className="size-3.5" aria-hidden />
          </Button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab principal
// ---------------------------------------------------------------------------

export function CuentasTab() {
  const { data: cuentas, isLoading } = useCuentas()
  const eliminar = useEliminarCuenta()
  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState<Cuenta | null>(null)
  const [tasaDe, setTasaDe] = useState<Cuenta | null>(null)
  const [historialDe, setHistorialDe] = useState<Cuenta | null>(null)

  const general = cuentas?.find((c) => c.es_general) ?? null
  const otras = cuentas?.filter((c) => !c.es_general) ?? []
  const sumaOtras = otras.reduce((acc, c) => acc + c.tasa_bps, 0)
  const sobrePasa = sumaOtras > 10000

  return (
    <div className="space-y-4">
      {sobrePasa && (
        <Alert variant="destructive">
          <Percent className="size-4" aria-hidden />
          <AlertTitle>Suma de tasas &gt; 100%</AlertTitle>
          <AlertDescription>
            La suma de tasas de las cuentas ({formatTasaBps(sumaOtras)}) supera el 100%. La API
            rechazará nuevos splits hasta corregirlo.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">
            Cuentas ({cuentas?.length ?? 0}) · suma otras: {formatTasaBps(sumaOtras)}
          </CardTitle>
          <Button size="sm" onClick={() => setCreando(true)}>
            <Plus className="mr-1.5 size-3.5" aria-hidden />
            Nueva cuenta
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Banco / Número</TableHead>
                  <TableHead>QR</TableHead>
                  <TableHead>Tasa</TableHead>
                  <TableHead className="w-28 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {general && (
                  <TableRow className="bg-muted/30">
                    <TableCell className="font-medium">
                      <span className="inline-flex flex-wrap items-center gap-2">
                        {general.alias}
                        <Badge variant="secondary">Residual (derivada)</Badge>
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">—</TableCell>
                    <TableCell>
                      <QrCell cuenta={general} />
                    </TableCell>
                    <TableCell>
                      <span className="tabular-nums">
                        {formatTasaBps(Math.max(0, 10000 - sumaOtras))}
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        = 100% − otras · no configurable
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => setHistorialDe(general)}
                        aria-label="Ver historial de General"
                      >
                        <History className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )}

                {otras.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.alias}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.banco ?? "—"}
                      {c.numero ? ` · ${c.numero}` : ""}
                    </TableCell>
                    <TableCell>
                      <QrCell cuenta={c} />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 font-mono tabular-nums"
                        onClick={() => setTasaDe(c)}
                        aria-label={`Editar tasa de ${c.alias} (${formatTasaBps(c.tasa_bps)})`}
                      >
                        <Percent className="mr-1 size-3.5 text-muted-foreground" aria-hidden />
                        {formatTasaBps(c.tasa_bps)}
                        <Pencil className="ml-1 size-3 text-muted-foreground" aria-hidden />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => setHistorialDe(c)}
                          aria-label={`Historial de ${c.alias}`}
                        >
                          <History className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => setEditando(c)}
                          aria-label={`Editar ${c.alias}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive hover:text-destructive"
                              aria-label={`Eliminar ${c.alias}`}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar cuenta "{c.alias}"?</AlertDialogTitle>
                              <AlertDialogDescription>
                                La cuenta se desactiva; los snapshots históricos de splits se
                                conservan.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => eliminar.mutate(c.id)}
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {creando && <CuentaDialog cuenta={null} onClose={() => setCreando(false)} />}
      {editando && <CuentaDialog cuenta={editando} onClose={() => setEditando(null)} />}
      {tasaDe && <TasaDialog cuenta={tasaDe} onClose={() => setTasaDe(null)} />}
      {historialDe && (
        <HistorialDialog cuenta={historialDe} onClose={() => setHistorialDe(null)} />
      )}
    </div>
  )
}