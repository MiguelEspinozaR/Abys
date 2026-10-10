import { useRef, useState } from "react"
import { ImageOff, Loader2, Pencil, Plus, Trash2, Upload, X } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useActualizarFuente,
  useCrearFuente,
  useEliminarFuente,
  useEliminarLogoFuente,
  useFuentes,
  useSubirLogoFuente,
} from "@/services/hooks"
import { assetUrl } from "@/services/api"
import type { Fuente, FuentePayload } from "@/services/types"

const MODOS = ["preciso", "redondeado", "enteros"] as const
type Modo = (typeof MODOS)[number]
const DEFAULT_MODO = ""

interface FormFuente {
  alias: string
  color: string
  split_auto: boolean
  split_auto_modo: string
}

function FuenteDialog({
  fuente,
  onClose,
}: {
  fuente: Fuente | null
  onClose: () => void
}) {
  const crear = useCrearFuente()
  const actualizar = useActualizarFuente()
  const [form, setForm] = useState<FormFuente>({
    alias: fuente?.alias ?? "",
    color: fuente?.color ?? "#3b82f6",
    split_auto: fuente?.split_auto ?? false,
    split_auto_modo: fuente?.split_auto_modo ?? DEFAULT_MODO,
  })

  const isPending = crear.isPending || actualizar.isPending
  const valido = form.alias.trim() !== ""

  const guardar = async () => {
    if (!valido) return
    const payload: FuentePayload = {
      alias: form.alias.trim(),
      color: form.color,
      logo_ruta: fuente?.logo_ruta ?? null,
      split_auto: form.split_auto,
      split_auto_modo:
        form.split_auto && form.split_auto_modo ? (form.split_auto_modo as Modo) : null,
    }
    if (fuente) await actualizar.mutateAsync({ id: fuente.id, payload })
    else await crear.mutateAsync(payload)
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{fuente ? `Editar fuente "${fuente.alias}"` : "Nueva fuente"}</DialogTitle>
          <DialogDescription>
            Las fuentes identifican el origen de tus pagos (plataforma, cliente, etc.).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fuente-alias">Alias</Label>
            <Input
              id="fuente-alias"
              value={form.alias}
              onChange={(e) => setForm((f) => ({ ...f, alias: e.target.value }))}
              placeholder="Ej: Athena"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fuente-color">Color</Label>
            <div className="flex items-center gap-2">
              <Input
                id="fuente-color"
                type="color"
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className="h-10 w-16 cursor-pointer p-1"
                aria-label="Color de la fuente"
              />
              <Input
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className="h-10 w-32 font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <Label htmlFor="fuente-split-auto">Split automático</Label>
                <p className="text-xs text-muted-foreground">
                  Genera el split al registrar un pago de esta fuente.
                </p>
              </div>
              <Switch
                id="fuente-split-auto"
                checked={form.split_auto}
                onCheckedChange={(v) => setForm((f) => ({ ...f, split_auto: v }))}
              />
            </div>
            {form.split_auto && (
              <div className="space-y-1.5">
                <Label htmlFor="fuente-split-modo">Modo de cálculo</Label>
                <Select
                  value={form.split_auto_modo || "default"}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, split_auto_modo: v === "default" ? "" : v }))
                  }
                >
                  <SelectTrigger id="fuente-split-modo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Usar el modo por defecto</SelectItem>
                    {MODOS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={!valido || isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
            {fuente ? "Guardar cambios" : "Crear fuente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function LogoCell({ fuente }: { fuente: Fuente }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const subir = useSubirLogoFuente()
  const eliminar = useEliminarLogoFuente()
  const logoUrl = assetUrl(fuente.logo_ruta)

  return (
    <div className="flex items-center gap-2">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`Logo de ${fuente.alias}`}
          className="size-9 rounded border object-contain"
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
          if (f) subir.mutate({ id: fuente.id, archivo: f })
          e.target.value = ""
        }}
      />
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => inputRef.current?.click()}
          disabled={subir.isPending}
          aria-label={`Subir logo de ${fuente.alias}`}
        >
          {subir.isPending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Upload className="size-3.5" aria-hidden />
          )}
        </Button>
        {logoUrl && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-destructive"
            onClick={() => eliminar.mutate(fuente.id)}
            aria-label={`Quitar logo de ${fuente.alias}`}
          >
            <X className="size-3.5" aria-hidden />
          </Button>
        )}
      </div>
    </div>
  )
}

export function FuentesTab() {
  const { data: fuentes, isLoading } = useFuentes()
  const eliminar = useEliminarFuente()
  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState<Fuente | null>(null)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">
          Fuentes ({fuentes?.length ?? 0})
        </CardTitle>
        <Button size="sm" onClick={() => setCreando(true)}>
          <Plus className="mr-1.5 size-3.5" aria-hidden />
          Nueva fuente
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
                <TableHead>Alias</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Logo</TableHead>
                <TableHead>Split</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fuentes?.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-block size-2.5 rounded-full"
                        style={{ backgroundColor: f.color }}
                        aria-hidden
                      />
                      {f.alias}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {f.color}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <LogoCell fuente={f} />
                  </TableCell>
                  <TableCell>
                    {f.split_auto ? (
                      <Badge variant="secondary" className="gap-1">
                        Auto · {f.split_auto_modo ?? "por defecto"}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Manual</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => setEditando(f)}
                        aria-label={`Editar ${f.alias}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            aria-label={`Eliminar ${f.alias}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar fuente "{f.alias}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              La fuente se desactiva; los pagos históricos se conservan.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => eliminar.mutate(f.id)}
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

      {creando && <FuenteDialog fuente={null} onClose={() => setCreando(false)} />}
      {editando && <FuenteDialog fuente={editando} onClose={() => setEditando(null)} />}
    </Card>
  )
}
