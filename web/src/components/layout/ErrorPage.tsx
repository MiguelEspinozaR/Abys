import { useEffect, useRef } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { mensajeErrorCarga } from "@/lib/errorChunk"

interface ErrorPageProps {
  error?: unknown
  onReintentar?: () => void
}

/** Pantalla de error en español, sin trazas: el `error` solo sirve para clasificarlo. */
export function ErrorPage({ error, onReintentar }: ErrorPageProps) {
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const { titulo, descripcion } = mensajeErrorCarga(error)
  const reintentar = onReintentar ?? (() => window.location.reload())

  useEffect(() => {
    tituloRef.current?.focus()
  }, [])

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-2">
      <Card className="w-full max-w-md">
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>
              <h1
                ref={tituloRef}
                tabIndex={-1}
                className="text-base font-semibold outline-none focus:outline-2 focus:outline-offset-2 focus:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {titulo}
              </h1>
            </AlertTitle>
            <AlertDescription>{descripcion}</AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <Button
            onClick={reintentar}
            className="max-md:min-h-11 max-md:min-w-11 w-full sm:w-auto"
          >
            Reintentar
          </Button>
          <Button
            asChild
            variant="outline"
            className="max-md:min-h-11 max-md:min-w-11 w-full sm:w-auto"
          >
            <a href="/">Ir al inicio</a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
