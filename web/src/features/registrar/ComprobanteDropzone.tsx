import { useEffect, useMemo, useRef, useState } from "react"
import { Loader2, ScanSearch, UploadCloud, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { ACCEPT_UPLOAD, validarArchivo } from "@/lib/uploads"
import { leerComprobante } from "@/services/ocr"
import { Button } from "@/components/ui/button"
import { formatBs, formatearFechaEs } from "@/lib/format"

interface ResultadoOcr {
  monto_enteros?: number
  fecha?: string
  referencia?: string
  descripcion?: string
}

interface Props {
  comprobante: File | null
  onChange: (f: File | null) => void
  onResultadoOcr: (r: ResultadoOcr) => void
  /** Error de la API al subir el comprobante; se muestra inline (R5.6/D16). */
  errorSubida?: string | null
}

export function ComprobanteDropzone({
  comprobante,
  onChange,
  onResultadoOcr,
  errorSubida,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const mountedRef = useRef(true)
  const [drag, setDrag] = useState(false)
  const [leyendo, setLeyendo] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const [estadoOcr, setEstadoOcr] = useState("")

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const previewUrl = useMemo(
    () => (comprobante ? URL.createObjectURL(comprobante) : null),
    [comprobante],
  )
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  /** Valida tipo y tamaño antes de aceptar el archivo (R5.1/R5.3). */
  const aceptar = (f: File | undefined | null) => {
    if (!f) return
    const error = validarArchivo(f)
    if (error) {
      setErrorLocal(error)
      setEstadoOcr("")
      return
    }
    setErrorLocal(null)
    setEstadoOcr("")
    onChange(f)
  }

  const leerOcr = async () => {
    if (!comprobante || leyendo) return
    setLeyendo(true)
    setProgreso(0)
    setEstadoOcr("Leyendo comprobante…")
    try {
      const res = await leerComprobante(comprobante, setProgreso)
      // R4.7: si el OCR termina tras desmontar, se ignora el resultado.
      if (!mountedRef.current) return
      onResultadoOcr({
        monto_enteros: res.monto_enteros,
        fecha: res.fecha,
        referencia: res.referencia,
        descripcion: res.descripcion,
      })
      const partes: string[] = []
      if (res.monto_enteros != null) partes.push(`Monto ${formatBs(res.monto_enteros)}`)
      if (res.fecha) partes.push(`Fecha ${formatearFechaEs(res.fecha)}`)
      if (partes.length > 0) {
        setEstadoOcr(`Comprobante leído: ${partes.join(" · ")}`)
      } else if (res.descripcion || res.referencia) {
        setEstadoOcr(
          "Se detectó texto del comprobante, pero no el monto ni la fecha. Revísalo abajo.",
        )
      } else {
        setEstadoOcr("No se detectaron datos claros. Completa los campos manualmente.")
      }
    } catch {
      if (!mountedRef.current) return
      setEstadoOcr("No se pudo procesar el comprobante. Revisa la conexión o la imagen.")
    } finally {
      if (mountedRef.current) setLeyendo(false)
    }
  }

  const errorVisible = errorLocal ?? errorSubida ?? null

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_UPLOAD}
        className="hidden"
        aria-describedby={errorVisible ? "comprobante-error" : undefined}
        onChange={(e) => {
          const f = e.currentTarget.files?.[0]
          e.currentTarget.value = ""
          aceptar(f)
        }}
      />

      {comprobante ? (
        <div className="rounded-lg border p-3">
          <div className="flex items-start gap-3">
            <img
              src={previewUrl ?? undefined}
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
                  onClick={() => {
                    setErrorLocal(null)
                    setEstadoOcr("")
                    onChange(null)
                  }}
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
                    aria-label="Progreso de lectura del comprobante"
                    aria-valuenow={Math.round(progreso * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              )}
              <p className="mt-2 min-h-4 text-xs text-muted-foreground" aria-live="polite">
                {estadoOcr}
              </p>
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
          aria-invalid={errorVisible ? true : undefined}
          aria-describedby={errorVisible ? "comprobante-error" : undefined}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-sm text-muted-foreground transition-colors",
            "hover:border-primary/50 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
            drag && "border-primary/60 bg-primary/5 text-foreground",
          )}
        >
          <UploadCloud className="size-6" aria-hidden />
          <span className="font-medium">Arrastra o haz clic para subir el comprobante</span>
          <span className="text-xs">PNG, JPG, WEBP o GIF · opcional · lectura con OCR</span>
        </button>
      )}

      {errorVisible && (
        <p id="comprobante-error" role="alert" className="text-xs text-destructive">
          {errorVisible}
        </p>
      )}
    </div>
  )
}
