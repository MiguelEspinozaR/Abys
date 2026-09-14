import { useRef, useState } from "react"
import { Loader2, ScanSearch, UploadCloud, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { leerComprobante } from "@/services/ocr"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface Props {
  comprobante: File | null
  onChange: (f: File | null) => void
  onResultadoOcr: (r: { monto_enteros?: number; fecha?: string; referencia?: string }) => void
}

export function ComprobanteDropzone({ comprobante, onChange, onResultadoOcr }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [leyendo, setLeyendo] = useState(false)
  const [progreso, setProgreso] = useState(0)

  const aceptar = (f: File | undefined | null) => {
    if (!f) return
    if (!f.type.startsWith("image/")) {
      toast.error("El comprobante debe ser una imagen (png, jpg, webp…).")
      return
    }
    onChange(f)
  }

  const leerOcr = async () => {
    if (!comprobante || leyendo) return
    setLeyendo(true)
    setProgreso(0)
    try {
      const res = await leerComprobante(comprobante, setProgreso)
      onResultadoOcr({
        monto_enteros: res.monto_enteros,
        fecha: res.fecha,
        referencia: res.referencia,
      })
      if (!res.monto_enteros && !res.fecha && !res.referencia) {
        toast.info("No se detectaron datos claros. Completa los campos manualmente.")
      } else {
        toast.success("Comprobante leído: montos y/o fechas autocompletados")
      }
    } catch {
      toast.error("No se pudo procesar el comprobante. Revisa la conexión o la imagen.")
    } finally {
      setLeyendo(false)
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => aceptar(e.target.files?.[0])}
      />

      {comprobante ? (
        <div className="rounded-lg border p-3">
          <div className="flex items-start gap-3">
            <img
              src={URL.createObjectURL(comprobante)}
              alt="Vista previa del comprobante"
              className="h-20 w-20 rounded-md border object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{comprobante.name}</p>
              <p className="text-xs text-muted-foreground">
                {(comprobante.size / 1024).toFixed(0)} KB · se subirá al guardar
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={leerOcr}
                  disabled={leyendo}
                >
                  {leyendo ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <ScanSearch className="size-3.5" aria-hidden />
                  )}
                  {leyendo ? `Leyendo ${Math.round(progreso * 100)}%` : "Leer comprobante"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onChange(null)}
                  aria-label="Quitar comprobante"
                >
                  <X className="size-3.5" aria-hidden />
                  Quitar
                </Button>
              </div>
              {leyendo && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.round(progreso * 100)}%` }}
                    role="progressbar"
                    aria-valuenow={Math.round(progreso * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDrag(false)
            aceptar(e.dataTransfer.files?.[0])
          }}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-sm text-muted-foreground transition-colors",
            "hover:border-primary/50 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
            drag && "border-primary/60 bg-primary/5 text-foreground",
          )}
        >
          <UploadCloud className="size-6" aria-hidden />
          <span className="font-medium">Arrastra o haz clic para subir el comprobante</span>
          <span className="text-xs">PNG, JPG o WEBP · opcional · con OCR automático</span>
        </button>
      )}
    </div>
  )
}