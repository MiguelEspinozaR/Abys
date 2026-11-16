# M2 — Histórico agrupado y carga bajo demanda (R3, D8)

- Entrega: secciones por año colapsables, conteo por año (`page_size=1`), filas por año bajo demanda (`page_size=500`), "Cargar más" por año, `/splits` con totales globales.
- Archivos producto (working tree): `web/src/lib/agrupar.ts`, `web/src/lib/agrupar.test.ts`, `web/src/hooks/useHistorial.ts`, `web/src/components/historial/SeccionAnio.tsx`, `web/src/components/historial/HistorialAgrupado.tsx`, `web/src/services/hooks.ts` (`usePagosPagina`, keys `historial`), `web/src/features/ingresos/IngresosPage.tsx`, `web/src/features/splits/SplitsPage.tsx`, `web/src/features/splits/SplitFila.tsx`.
- Verificación enfocada: `web && npx vitest run src/lib/agrupar.test.ts` — PASS (incluida en suite).
- Resultado: solo año actual expandido por defecto, años colapsados sin queries de filas, páginas acumuladas con dedupe por id, reset de expansión al cambiar filtros/rango, totales de `/splits` (StatCards y "Pendiente por cuenta") globales vía `useSplits/useCuentas`.
