import { useMemo } from "react"
import { FiltrosRango } from "@/components/historial/FiltrosRango"
import { HistorialAgrupado } from "@/components/historial/HistorialAgrupado"
import { useFiltrosHistorial } from "@/hooks/useFiltrosHistorial"
import { useAniosConDatos, useCandidatosAnio } from "@/hooks/useHistorial"
import { useFuentes } from "@/services/hooks"
import { PagoFila } from "./PagoFila"

export default function IngresosPage() {
  const { data: fuentes } = useFuentes()
  const fuentesValidas = useMemo(
    () => (fuentes ? new Set(fuentes.map((f) => f.id)) : undefined),
    [fuentes],
  )

  const {
    filtros,
    borrador,
    setBorrador,
    rangoCalculado,
    aplicar,
    limpiar,
    errores,
    hayFiltros,
  } = useFiltrosHistorial({ fuentesValidas })

  const { candidatos, isLoading: candidatosLoading } = useCandidatosAnio({
    preset: filtros.rango,
    rango: rangoCalculado,
  })

  const {
    anios,
    isLoading: aniosLoading,
    isFetching: aniosFetching,
  } = useAniosConDatos({ candidatos, rango: rangoCalculado, filtros })

  const cargando = candidatosLoading || aniosLoading
  const totalVisible = anios.reduce((total, grupo) => total + grupo.total, 0)

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Ingresos</h1>
        <p className="text-sm text-muted-foreground">
          {cargando ? "Cargando pagos…" : `${totalVisible} pagos registrados`}
        </p>
      </header>

      <FiltrosRango
        idPrefijo="ingresos"
        filtros={borrador}
        onCambiar={setBorrador}
        onAplicar={aplicar}
        onLimpiar={limpiar}
        errores={errores}
        fuentes={fuentes}
        deshabilitado={aniosFetching}
        hayFiltros={hayFiltros}
      />

      {cargando ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Cargando…</p>
      ) : anios.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No hay pagos que coincidan con los criterios.
          </p>
          <p className="text-xs text-muted-foreground">
            Ajusta los filtros o registra un nuevo pago.
          </p>
        </div>
      ) : (
        <HistorialAgrupado
          idPrefijo="ingresos"
          anios={anios}
          rango={rangoCalculado}
          filtros={filtros}
          renderFila={(pago) => <PagoFila key={pago.id} pago={pago} />}
        />
      )}
    </div>
  )
}
