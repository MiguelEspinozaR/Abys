import { useEffect, useMemo, useRef, useState } from "react"
import { UploadCloud, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { ACCEPT_UPLOAD, validarArchivo } from "@/lib/uploads"
import { Button } from "@/components/ui/button"

interface Props {
  comprobante: File | null
  onChange: (f: File | null) => void
  /** Error de la API al subir el comprobante; se muestra inline (R5.6/D16). */
  errorSubida?: string | null
}

export function ComprobanteDropzone({
  comprobante,
  onChange,
  errorSubida,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

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
      return
    }
    setErrorLocal(null)
    onChange(f)
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
                  variant="ghost"
                  onClick={() => {
                    setErrorLocal(null)
                    onChange(null)
                  }}
                  aria-label="Quitar comprobante"
                >
                  <X className="size-3.5" aria-hidden />
                  Quitar
                </Button>
              </div>
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
          <span className="text-xs">PNG, JPG, WEBP o GIF · opcional</span>
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
