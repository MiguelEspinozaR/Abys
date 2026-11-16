# M1 — URL, presets y `?tab=` (R1, R2)

- Entrega: helpers puros de URL/rango/agrupación base + barra de filtros compartida + `?tab=`.
- Archivos producto (working tree): `web/src/lib/rango.ts`, `web/src/lib/filtrosUrl.ts`, `web/src/lib/rango.test.ts`, `web/src/lib/filtrosUrl.test.ts`, `web/src/hooks/useFiltrosHistorial.ts`, `web/src/hooks/useTabUrl.ts`, `web/src/components/historial/FiltrosRango.tsx`, `web/src/features/ingresos/IngresosPage.tsx`, `web/src/features/splits/SplitsPage.tsx`, `web/src/features/configuracion/ConfiguracionPage.tsx`.
- Verificación enfocada: `web && npx vitest run src/lib/rango.test.ts src/lib/filtrosUrl.test.ts` (incluidas en suite completa) — PASS.
- Resultado: URL canónica con `rango` siempre presente, `desde`/`hasta` solo en `custom`, validación/sanitización (dos fases para `fuente`), `?tab=` en `/configuracion` con default `cuentas`; borrador/aplicado, `Aplicar` con push, canonización con replace.
