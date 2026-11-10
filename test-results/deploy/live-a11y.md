# AC11 en vivo — test3

- **Veredicto:** `LIVE_PASS`
- **URL:** https://test3.mikylab.com
- **HEAD declarado por deploy:** `7030e4c`
- **Fecha de ejecución:** 2026-11-09T02:31:49.746Z
- **Alcance:** AC1–AC7 de AC11, solo lectura.
- **Evidencia JSON:** `test-results/deploy/live-a11y.json`

## Resultado por criterio

| AC | Resultado | Evidencia |
|---|---|---|
| AC1 | PASS | 20 casos default + 104 estados secundarios; 0 targets interactivos <44×44 px en móvil |
| AC2 | PASS | 10/10 casos desktop 1440×900 sin regresión frente a `metrics-before.json` |
| AC3 | PASS | 26/26 casos de foco; TabsContent 2/2 |
| AC4 | PASS | 20/20 recorridos de teclado; 0 fallos |
| AC5 | PASS | Movimiento reducido y OCR en light/dark |
| AC6 | PASS | Skip link en light/dark |
| AC7 | PASS | 134 casos; 0 contraste, 0 overflow, 0 truncados, 0 consola |

## Build servido

El HTML y los assets servidos por test3 corresponden al build con los cambios de accesibilidad:

- HTML `200`, `cache-control: no-cache`, `cf-cache-status: DYNAMIC`.
- JS: `/assets/index-BvSt0T-A.js` (`511934` bytes, `cf-cache-status: MISS`).
- CSS: `/assets/index-CC4YOoc9.css` (`83217` bytes).
- Chunk de configuración: `assets/ConfiguracionPage-CBj9Phll.js` (`200`), con `data-slot="tabs-content"` y `focus-visible:inset-ring-2`.
- CSS con `.focus-visible\:inset-ring-2:focus-visible`.
- `liveBuildCheck.pass = true`.

El HEAD `7030e4c` proviene del handoff de deploy; el harness verificó los marcadores del build servido, no el commit Git remoto.

## Detalle relevante

### AC1 — Targets táctiles

- Casos móviles: 20 default (5 rutas × 2 temas × 360/390) + 104 secundarios.
- Fallos: `0`.
- Rutas: `/`, `/ingresos`, `/splits`, `/registrar`, `/configuracion`.

### AC2 — Layout desktop

- Casos: `10/10` contra baseline local `metrics-before.json`.
- Fallos: `0`.

### AC3 — Foco visible

- Casos: `26/26`.
- `TabsContent`:
  - light: ratio `4.73`, `pass=true`.
  - dark: ratio `4.18`, `pass=true`.
- El anillo de foco de `TabsContent` se midió como `inset-ring` con `oklch(0.556 0 0)`.

### AC4 — Recorrido de teclado

- Recorridos: `20/20`.
- Fallos: `0`.
- En `/configuracion`: `4/4` recorridos con tabpanel visible y foco correcto.
- Selector observado: `#radix-_r_5_-content-cuentas`.
- Sombra observada: `inset 0 0 0 2px oklch(55.6% 0 0)`.

### AC5 — Movimiento reducido y OCR

- `prefers-reduced-motion: reduce`: animaciones/transiciones máximas `0.01 ms`, `0` animaciones infinitas.
- OCR en reducido y normal: `pass=true` en light/dark.
- Estado final visible, opacidad `1`.

### AC6 — Skip link

- Light/dark: `pass=true`.
- Primer foco: `Saltar al contenido`.
- Tras `Enter`: `MAIN#contenido`.
- Outline: `oklch(0.556 0 0) solid 2px`.

### AC7 — Overflow, truncado, contraste y consola

- Casos: `134`.
- Casos con fallo de contraste: `0`.
- Violaciones de contraste: `0`.
- Casos con overflow horizontal: `0`.
- Casos con truncado: `0`.
- Casos con errores de consola o requests fallidos: `0`.

## Restricciones respetadas

- Solo GET/navegación y medición en navegador.
- No se ejecutó Git.
- No se hizo POST/PUT/DELETE ni se guardaron formularios.
- No se crearon ni editaron pagos, splits, cuentas o configuración.
- No se reconstruyó la app.
- No se tocaron `:8080`, `:5173` ni `:8082`.
- No se detuvo test3; el deploy sigue activo.
- Capturas live desactivadas; la evidencia es el JSON y el log del harness.

## Riesgos y observaciones

- El HEAD remoto no se puede confirmar por Git desde el entorno live; se verificó el build servido y sus marcadores.
- La matriz se ejecutó contra datos reales de test3; no se modificó ningún dato.
- AC8–AC12 no forman parte de esta verificación live de AC11.
- El resultado `LIVE_PASS` aplica a la matriz ejecutada y al build servido en el momento indicado.
