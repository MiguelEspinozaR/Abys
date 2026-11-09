# REVIEW — `a11y-gate`

| Campo | Valor |
|---|---|
| Feature | `a11y-gate` |
| Rama | `feat/a11y-gate` |
| HEAD revisado | `5b03633` |
| Base | `main` @ `78ca19a` |
| Fecha | 2026-11-07 |
| Decisión | **REJECTED — changes requested** |
| Bloqueo de seguridad | No |

## Decisión

Se rechaza la implementación porque incumple el SPEC aprobado en tres puntos verificables:

1. **AC1/R1:** los días del calendario quedan en **40×40 px** a 360×800, por debajo del gate 44×44.
2. **R3.2:** el scroll animado por JavaScript no respeta `prefers-reduced-motion`.
3. **AC3/R2.3:** los ítems de `Select` (y de `DropdownMenu` en el design system) sustituyen el
   outline por un fondo de foco con contraste ~1.1:1, por debajo de 3:1.

No es un bloqueo de seguridad: el scan está CLEAR y no hay secretos expuestos. No es `BLOCKED`:
los problemas son corregibles dentro del alcance del SPEC.

## Evidencia revisada

- SPEC: `.ai/specs/a11y-gate/spec.md`; PLAN: `.ai/plans/a11y-gate/plan.md`.
- Estado: `.ai/runtime/state.yaml` registra `spec_approved` y `plan_approved`; los encabezados
  “draft” de los documentos están desactualizados.
- Diff completo `78ca19a...HEAD`: 18 archivos, solo `.gitignore`, `.tsx` y `.css`.
- Security report: `test-results/a11y-gate/security-report.md` (CLEAR, 0 secretos, 3 INFO).
- Build local: `npm run build` OK (20.11 s; warning preexistente de chunk >500 kB).
- Tests: `npm test` → 3 archivos / 24 tests PASS. `go test ./...` → PASS.
- Playwright/Chrome sobre `web/dist` servido en local:
  - `/registrar` 360×800: 35 tiles de calendario visibles de **40×40 px**; resto de interactivos
    visibles del estado default ≥44 px. El skip link oculto mide 1×1 y no cuenta como target.
  - `/registrar` 390×844: los mismos 35 tiles miden **44.3×44.3 px** (pasan).
  - Primer `Tab`: “Saltar al contenido” (`position: fixed`); `Enter`: foco en `MAIN#contenido`.
  - Panel móvil con `reducedMotion: reduce`: `animation-duration`/`transition-duration` =
    `1e-05s`, estado final visible. Sin errores de página.
- CSS compilado: `.focus\:not-sr-only:focus` aparece antes de `.focus\:fixed:focus` (gana fixed);
  `--ring` y utilidades `focus-visible:ring-ring` generadas sin `/50`.

## Hallazgos bloqueantes

### B1 — Calendario: días de 40×40 px a 360×800 (AC1/R1)

- Componente: `web/src/features/registrar/CalendarioDias.tsx:97` (`Calendar ... p-2`).
- Regla: `web/src/index.css:161-162` (`.react-calendar__month-view__days__day` con
  `aspect-square`), dentro de `main p-4` y `CardContent` con padding horizontal.
- `react-calendar` reparte los días con `flex-basis: 14.2857%`; el ancho disponible a 360 px es
  ~278 px → **~39.7 px** por día. La medición real da 40×40.
- Afecta también al diálogo “Editar pago”, que usa el mismo componente dentro de
  `DialogContent` con `p-4` (`EditarPagoDialog.tsx:70,91`; `dialog.tsx:64`).
- La corrección actual solo agranda la navegación del calendario
  (`index.css:146-151`), no los días.
- **Cambio requerido:** hacer que los tiles diarios alcancen ≥44×44 a 360 px sin romper las 7
  columnas ni el desktop. Opción mínima: en móvil, llevar el calendario a ancho completo
  (padding horizontal 0 / `-mx-4` + `p-0` + `border-x-0`) y re-medir ambos contextos. No usar
  un `min-width` que haga wrap y desalinee las semanas.

### B2 — Scroll suave JS no cubierto por reduced motion (R3.2)

- `web/src/features/registrar/RegistrarPage.tsx:135` y `:337-338` llaman
  `scrollIntoView({ behavior: "smooth" })`.
- El guard `scroll-behavior: auto !important` de `index.css:185` no anula un `behavior`
  explícito de JavaScript.
- **Cambio requerido:** elegir el comportamiento con
  `matchMedia("(prefers-reduced-motion: reduce)")` (`"auto"` cuando reduce, `"smooth"` en caso
  contrario) o eliminar el scroll animado. Aplicar en ambos call sites.

### B3 — Foco de ítems de Select/DropdownMenu con contraste insuficiente (AC3/R2.3)

- `web/src/components/ui/select.tsx:114`: `outline-hidden ... focus:bg-accent`.
- `web/src/components/ui/dropdown-menu.tsx:73,95,139,226`: mismo patrón.
- `outline-hidden` deja `outline-style: none`; el único indicador es `--accent` contra
  `--popover`: ~**1.09:1** en light (`oklch(0.97)` vs blanco) y ~**1.19:1** en dark
  (`oklch(0.269)` vs `oklch(0.205)`). No alcanza 3:1.
- `SelectItem` es visible al abrir los selects de la matriz; `DropdownMenuItem` no tiene usos
  actuales, pero es parte del design system.
- **Cambio requerido:** añadir un anillo/outline de foco opaco y visible dentro del ítem (por
  ejemplo `focus:inset-ring-2 focus:inset-ring-ring` o
  `focus:outline-2 focus:outline-offset-[-2px] focus:outline-ring`) conservando el fondo. Medir
  el compuesto contra el popover en light y dark.

## Hallazgos no bloqueantes / latentes

- **`aria-invalid`:** en `input.tsx`, `textarea.tsx`, `select.tsx`, `checkbox.tsx`, `switch.tsx`
  y `button.tsx` quedan `aria-invalid:ring-destructive/20` (light) y `/40` (dark). En el CSS
  compilado esas reglas aparecen después de `focus-visible:ring-ring`, por lo que un campo
  inválido y enfocado mostraría el anillo semitransparente. Hoy la app no usa `aria-invalid`;
  corregir antes de introducir validación inline (bloque B) para no incumplir R2.2.
- **`--sidebar-ring`:** sigue en `oklch(0.708 0 0)` en light (`index.css:40`) y no se usa. No
  afecta AC3, pero es una inconsistencia de token si se incorpora el sidebar de shadcn.
- **`Button size="icon-lg"`:** `size-9` sin `min-w-11`; no se usa hoy. Si se usa en móvil,
  incumplirá R1.1.
- **`Switch size="sm"`:** el hitbox efectivo queda ~48×42 px (alto <44); no se usa hoy.
- **Skip link:** mide 36 px de alto al enfocarse; es un control de teclado, no un target táctil,
  y R4 no exige 44 px. R4.1–R4.4 pasan.
- **Navegación del calendario a 360:** 4 flechas de 44 px + label de 88 px caben en 280 px; no
  hay overflow. Confirmar igualmente en ambos temas.
- **Build:** warning de chunk >500 kB es preexistente; no es regresión de este feature.

## Criterios de aceptación

| AC | Estado | Evidencia / nota |
|---|---|---|
| AC1 (R1) | **FAIL** | 35 tiles de calendario a 40×40 en 360×800; el resto del default de `/registrar` pasa. |
| AC2 (R1.7) | PASS | Diff solo añade `max-md:*`, colores de foco y skip link; sin cambios de layout desktop. Confirmar con capturas 1440. |
| AC3 (R2) | **FAIL** | Anillos de Button/Input/Textarea/Select trigger/Tabs/nav/Switch/Checkbox pasan (≥3:1), pero el indicador de `SelectItem`/`DropdownMenuItem` queda ~1.1:1. |
| AC4 (R2.3) | PENDIENTE-TEST | Skip link y orden inicial verificados; falta recorrido completo por rutas/estados. Los ítems de menú tienen foco visible pero de bajo contraste. |
| AC5 (R3) | PASS (panel) | Panel móvil medido a 1e-05 s; diálogo cubierto por el guard global. Falta medición directa del diálogo en TEST. |
| AC6 (R4) | PASS | Primer Tab = “Saltar al contenido”; Enter enfoca `main#contenido`; `outline-none` en main. |
| AC7 (No regresión) | PENDIENTE-TEST | Sin errores en `/registrar`; faltan las 5 rutas × 2 temas, overflow/truncado/contraste. |
| AC8 (Calidad) | PASS | `npm run build`, `npm test` (24) y `go test ./...` pasan. |
| AC9 (Alcance) | PASS | Sin cambios en `package.json`, `go.mod`, API, BD ni migraciones. |
| AC10 (Git) | PASS (producto) | `origin/feat/a11y-gate` = `5b03633`; 4 commits de producto, sin merges. Falta commit M4 de evidencia. |
| AC11 (Deploy) | PENDIENTE | Solo tras aprobación humana; no ejecutado. |
| AC12 (Evidencia) | PENDIENTE / M4 | Solo existe `security-report.md`; faltan `report.md`, métricas antes/después y capturas. |

## Verificación requerida en TEST (tras corregir)

1. Medir los 35 tiles del calendario en `/registrar` y “Editar pago” a 360×800 y 390×844,
   light/dark; exigir 0 excepciones y 7 columnas alineadas.
2. Medir el anillo de foco compuesto en Button, Input, Textarea, Select trigger **e ítems**,
   Tabs, links de navegación, Switch y Checkbox; ambos temas y fondos reales.
3. Con `reducedMotion: reduce`: panel y diálogo ≤10 ms; OCR y “Ver fecha en el calendario” sin
   scroll animado; sin animaciones infinitas.
4. Recorrido de teclado completo por las 5 rutas y estados secundarios; skip link y siguiente
   Tab desde el contenido.
5. 1440×900 antes/después: sin cambios de layout; sin overflow/truncado/errores nuevos.
6. Generar M4: `report.md`, `metrics-before.json`, `metrics-after.json` y capturas; mapear cada
   AC a PASS/FAIL.

## Seguridad y alcance

- `security-report.md`: CLEAR, 0 secretos. No hay bloqueo por secretos expuestos.
- Sin dependencias nuevas, sin API/BD, sin artefactos `.ai/` ni Playwright versionados.
- `test-results/` está untracked y no ignorado; es el destino previsto de M4.
- No se modificó código de producto ni historial Git durante esta revisión.
