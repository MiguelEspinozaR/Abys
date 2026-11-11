import { useCallback, useRef, useState } from "react"
import type { FormEvent } from "react"
import { useBlocker } from "react-router-dom"
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
import { FieldError } from "@/components/form/FieldError"
import { ErrorSummary } from "@/components/form/ErrorSummary"
import { ConfirmarDescarteDialog } from "@/components/form/ConfirmarDescarteDialog"
import { useFormErrors } from "@/hooks/useFormErrors"
import { useFormDirty } from "@/hooks/useFormDirty"
import { ApiRequestError, assetUrl } from "@/services/api"
import { ERRORES_API_CUENTA, ERRORES_API_TASA, resolverErrorApi } from "@/lib/api-errors"
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
import { validarAlias, validarTasa } from "@/lib/validators"
import type { Cuenta } from "@/services/types"

/** Marca visual de campo obligatorio; la semántica va en `aria-required` (R2.3). */
const Obligatorio = () => (
  <span aria-hidden className="ml-0.5">
    *
  </span>
)

// ---------------------------------------------------------------------------
// Dialog de tasa
// ---------------------------------------------------------------------------

function TasaDialog({ cuenta, onClose }: { cuenta: Cuenta; onClose: () => void }) {
  const cambiarTasa = useCambiarTasa()
  const estadoInicial = {
    tasa: String(bpsToPercentNum(cuenta.tasa_bps)),
    aplicarPendientes: false,
  }
  const [tasa, setTasa] = useState(estadoInicial.tasa)
  const [aplicarPendientes, setAplicarPendientes] = useState(
    estadoInicial.aplicarPendientes,
  )
  const { sucio, resetear } = useFormDirty({ tasa, aplicarPendientes })
  const sucioRef = useRef(sucio)
  sucioRef.current = sucio
  const debeBloquear = useCallback(() => sucioRef.current, [])
  const blocker = useBlocker(debeBloquear)
  const [confirmarCierre, setConfirmarCierre] = useState(false)
  const validacion = useFormErrors<"tasa">()

  const tasaNum = Number(tasa.replace(",", "."))

  const restaurar = () => {
    setTasa(estadoInicial.tasa)
    setAplicarPendientes(estadoInicial.aplicarPendientes)
    resetear(estadoInicial)
    validacion.limpiar()
    setConfirmarCierre(false)
  }

  const cerrarDirecto = () => {
    restaurar()
    onClose()
  }

  /** Escape/overlay/X/Cancelar: intercepta solo si hay cambios (R4.3). */
  const solicitarCierre = () => {
    if (sucioRef.current) setConfirmarCierre(true)
    else cerrarDirecto()
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    validacion.limpiarErrorFormulario()
    const valido = validacion.validarSubmit([
      {
        campo: "tasa",
        validar: () => validarTasa(tasa),
        enfocar: () => document.getElementById(`tasa-${cuenta.id}`)?.focus(),
      },
    ])
    if (valido) void guardar()
  }

  const guardar = async () => {
    // Defensa interna: la validez la explica el formulario, no un botón gris (D2).
    if (!Number.isFinite(tasaNum) || tasaNum < 0 || tasaNum > 100) return
    if (cambiarTasa.isPending) return
    try {
      await cambiarTasa.mutateAsync({
        id: cuenta.id,
        payload: { tasa: tasaNum, aplicar_pendientes: aplicarPendientes },
      })
      resetear()
      validacion.limpiar()
      setConfirmarCierre(false)
      onClose()
    } catch (e) {
      const resuelto =
        e instanceof ApiRequestError
          ? resolverErrorApi(e, ERRORES_API_TASA)
          : {
              campo: undefined,
              mensaje:
                e instanceof Error
                  ? e.message
                  : "No se pudo guardar la tasa. Inténtalo de nuevo.",
            }
      validacion.establecerError(resuelto.campo, resuelto.mensaje)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && solicitarCierre()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle id="tasa-dialog-titulo">Tasa de {cuenta.alias}</DialogTitle>
          <DialogDescription>
            Actual: {formatTasaBps(cuenta.tasa_bps)}. La suma de tasas de cuentas ≠ General no
            puede superar 100% (lo valida el servidor).
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          aria-labelledby="tasa-dialog-titulo"
          aria-busy={cambiarTasa.isPending}
          onSubmit={onSubmit}
          className="space-y-4"
        >
          {validacion.resumenVisible && (
            <ErrorSummary errores={validacion.listaErrores} onEnfocar={() => document.getElementById(`tasa-${cuenta.id}`)?.focus()} />
          )}
          {validacion.errorFormulario && (
            <p role="alert" className="text-sm text-destructive">
              {validacion.errorFormulario}
            </p>
          )}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor={`tasa-${cuenta.id}`}>
                Tasa en % <Obligatorio />{" "}
                <span className="text-muted-foreground">(100% = 10000 bps)</span>
              </Label>
              <Input
                id={`tasa-${cuenta.id}`}
                inputMode="decimal"
                value={tasa}
                onChange={(e) => {
                  setTasa(e.target.value)
                  validacion.validarChange("tasa", () => validarTasa(e.target.value))
                }}
                onBlur={(e) => validacion.validarBlur("tasa", () => validarTasa(e.target.value))}
                placeholder="Ej: 25"
                aria-required="true"
                aria-invalid={validacion.errores.tasa ? true : undefined}
                aria-describedby={validacion.errores.tasa ? `tasa-${cuenta.id}-error` : undefined}
              />
              <FieldError id={`tasa-${cuenta.id}-error`} error={validacion.errores.tasa} />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id={`tasa-aplicar-${cuenta.id}`}
                checked={aplicarPendientes}
                onCheckedChange={(v) => setAplicarPendientes(v === true)}
              />
              <Label
                htmlFor={`tasa-aplicar-${cuenta.id}`}
                className="flex flex-col items-start gap-0 font-normal leading-snug"
              >
                <span>Aplicar a transacciones pendientes</span>
                <span className="block text-xs text-muted-foreground">
                  Recalcula los splits con transacciones pendientes usando esta nueva tasa.
                </span>
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={solicitarCierre}>
              Cancelar
            </Button>
            <Button type="submit" disabled={cambiarTasa.isPending}>
              {cambiarTasa.isPending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
              Guardar tasa
            </Button>
          </DialogFooter>
        </form>

        <ConfirmarDescarteDialog
          abierto={confirmarCierre || blocker.state === "blocked"}
          onSeguir={() => {
            if (blocker.state === "blocked") blocker.reset?.()
            setConfirmarCierre(false)
          }}
          onDescartar={() => {
            const veniaDeBloqueo = blocker.state === "blocked"
            cerrarDirecto()
            if (veniaDeBloqueo) blocker.proceed?.()
          }}
        />
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

/** Valores iniciales del formulario, usados también al descartar cambios (R4.5). */
function formCuentaInicial(cuenta: Cuenta | null): FormCuenta {
  return {
    alias: cuenta?.alias ?? "",
    banco: cuenta?.banco ?? "",
    numero: cuenta?.numero ?? "",
  }
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
  const estadoInicial = formCuentaInicial(cuenta)
  const [form, setForm] = useState<FormCuenta>(estadoInicial)
  const { sucio, resetear } = useFormDirty(form)
  const sucioRef = useRef(sucio)
  sucioRef.current = sucio
  const debeBloquear = useCallback(() => sucioRef.current, [])
  const blocker = useBlocker(debeBloquear)
  const [confirmarCierre, setConfirmarCierre] = useState(false)
  const validacion = useFormErrors<"alias">()
  const isPending = crear.isPending || actualizar.isPending

  const restaurar = () => {
    setForm(estadoInicial)
    resetear(estadoInicial)
    validacion.limpiar()
    setConfirmarCierre(false)
  }

  const cerrarDirecto = () => {
    restaurar()
    onClose()
  }

  /** Escape/overlay/X/Cancelar: intercepta solo si hay cambios (R4.3). */
  const solicitarCierre = () => {
    if (sucioRef.current) setConfirmarCierre(true)
    else cerrarDirecto()
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    validacion.limpiarErrorFormulario()
    const valido = validacion.validarSubmit([
      {
        campo: "alias",
        validar: () => validarAlias(form.alias),
        enfocar: () => document.getElementById("cuenta-alias")?.focus(),
      },
    ])
    if (valido) void guardar()
  }

  const guardar = async () => {
    // Defensa interna: la validez la explica el formulario, no un botón gris (D2).
    if (form.alias.trim() === "") return
    if (isPending) return
    const payload = {
      alias: form.alias.trim(),
      banco: form.banco.trim() ? form.banco.trim() : null,
      numero: form.numero.trim() ? form.numero.trim() : null,
    }
    try {
      if (cuenta) await actualizar.mutateAsync({ id: cuenta.id, payload })
      else await crear.mutateAsync(payload)
      resetear()
      validacion.limpiar()
      setConfirmarCierre(false)
      onClose()
    } catch (e) {
      const resuelto =
        e instanceof ApiRequestError
          ? resolverErrorApi(e, ERRORES_API_CUENTA)
          : {
              campo: undefined,
              mensaje:
                e instanceof Error
                  ? e.message
                  : "No se pudo guardar la cuenta. Inténtalo de nuevo.",
            }
      validacion.establecerError(resuelto.campo, resuelto.mensaje)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && solicitarCierre()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle id="cuenta-dialog-titulo">
            {cuenta ? `Editar cuenta "${cuenta.alias}"` : "Nueva cuenta"}
          </DialogTitle>
          <DialogDescription>
            Cuentas bancarias donde se distribuyen los pagos (la General se crea sola).
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          aria-labelledby="cuenta-dialog-titulo"
          aria-busy={isPending}
          onSubmit={onSubmit}
          className="space-y-4"
        >
          {validacion.resumenVisible && (
            <ErrorSummary
              errores={validacion.listaErrores}
              onEnfocar={() => document.getElementById("cuenta-alias")?.focus()}
            />
          )}
          {validacion.errorFormulario && (
            <p role="alert" className="text-sm text-destructive">
              {validacion.errorFormulario}
            </p>
          )}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cuenta-alias">
                Alias <Obligatorio />
              </Label>
              <Input
                id="cuenta-alias"
                value={form.alias}
                onChange={(e) => {
                  setForm((f) => ({ ...f, alias: e.target.value }))
                  validacion.validarChange("alias", () => validarAlias(e.target.value))
                }}
                onBlur={(e) => validacion.validarBlur("alias", () => validarAlias(e.target.value))}
                placeholder="Ej: Box"
                aria-required="true"
                aria-invalid={validacion.errores.alias ? true : undefined}
                aria-describedby={validacion.errores.alias ? "cuenta-alias-error" : undefined}
              />
              <FieldError id="cuenta-alias-error" error={validacion.errores.alias} />
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
            <Button variant="outline" type="button" onClick={solicitarCierre}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
              {cuenta ? "Guardar cambios" : "Crear cuenta"}
            </Button>
          </DialogFooter>
        </form>

        <ConfirmarDescarteDialog
          abierto={confirmarCierre || blocker.state === "blocked"}
          onSeguir={() => {
            if (blocker.state === "blocked") blocker.reset?.()
            setConfirmarCierre(false)
          }}
          onDescartar={() => {
            const veniaDeBloqueo = blocker.state === "blocked"
            cerrarDirecto()
            if (veniaDeBloqueo) blocker.proceed?.()
          }}
        />
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