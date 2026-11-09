# REVIEW #2 — `a11y-gate` (re-revisión tras fixes)

| Campo | Valor |
|---|---|
| Feature | `a11y-gate` |
| Rama | `feat/a11y-gate` |
| HEAD revisado | `dc8cc63` (`fix(web): corrige hallazgos del review de accesibilidad`) |
| Review #1 | `5b03633` |
| Base | `main` @ `78ca19a` |
| Fecha | 2026-11-07 |
| Decisión | **APPROVED** |
| Bloqueo de seguridad | No |

## Decisión

Los 3 blockers de `test-results/a11y-gate/review.md` quedan **resueltos y verificados con medición**:

1. **B1 (AC1/R1):** calendario a **46.84×46.84 px** en `/registrar` 360×800 y **46.81 px** en
   “Editar pago” 360×800, con **7 columnas** y **0 overflow horizontal**. Desktop intacto
   (404 px / 55.42 px).
2. **B2 (R3.2):** ambos `scrollIntoView` usan `motionBehavior()`; con `reduce` resuelve
   `"auto"`, sin `reduce` `"smooth"`. Verificado en fuente, bundle compilado y `matchMedia`.
3. **B3 (AC3/R2.3):** `SelectItem` y los 4 tipos de ítem de `DropdownMenu` (incluido
   destructivo) tienen `focus:inset-ring-2 focus:inset-ring-ring`; el inset ring compiló y da
   **4.73:1 (light)** y **3.79:1 (dark)** contra el popover.

No hay violaciones nuevas de SPEC/PLAN, arquitectura ni política. No hay bloqueo de seguridad.
El escaneo de seguridad sigue CLEAR y el delta `5b03633..dc8cc63` no introduce secretos.

## Evidencia revisada

- SPEC `.ai/specs/a11y-gate/spec.md`; PLAN `.ai/plans/a11y-gate/plan.md`.
- Diff de fixes `5b03633..dc8cc63`: 8 archivos, 23 inserciones / 11 borrados, solo `.tsx`,
  `.css` y `lib/a11y.ts`.
- Diff total `78ca19a...HEAD`: 20 archivos; sin `package.json`, `go.mod`, API, BD ni migraciones.
- `origin/feat/a11y-gate` = `dc8cc63` (local = remoto); 5 commits publicados, sin merges.
- `security-report.md` (CLEAR, 0 secretos). Delta posterior re-verificado: sin cadenas
  secret-like.
- Build `npm run build` OK (20.52 s; warning preexistente de chunk >500 kB).
- `npm test` → 3 archivos / **24 tests PASS**. `go test ./...` → PASS.
- Playwright + Chrome (`/usr/bin/google-chrome`, headless) sobre `vite preview` (`:5178`)
  sirviendo el `dist` recién compilado, con fixtures GET por `page.route` (sin escrituras).

### Mediciones B1 — calendario

| Contexto | Viewport | Tema | Tiles | Mín. W×H | Columnas | Calendario | Overflow X |
|---|---|---|---|---|---|---|---|
| `/registrar` | 360×800 | light | 35 | **46.84×46.84** | 7/7/7/7/7 | 328 px (Card 328) | No (`scrollWidth` 360) |
| `/registrar` | 360×800 | dark | 35 | **46.84×46.84** | 7/7/7/7/7 | 328 px | No |
| “Editar pago” | 360×800 | light | 35 | **46.81×46.81** | 7/7/7/7/7 | 327.73 px | No (dialog `scrollW` = `clientW` = 328) |
| “Editar pago” | 360×800 | dark | 35 | **46.67×46.67** | 7/7/7/7/7 | 326.77 px | No |
| `/registrar` | 390×844 | light/dark | 35 | **51.14×51.14** | 7/7/7/7/7 | 358 px | No |
| “Editar pago” | 390×844 | light/dark | 35 | **51.14×51.14** | 7/7/7/7/7 | 358 px | No |
| `/registrar` | 1440×900 | light/dark | 35 | **55.42×55.42** | 7/7/7/7/7 | **404 px** | No |

- El `-mx-4` + `max-md:p-0` del calendario coincide exactamente con el padding horizontal del
  `CardContent` (`px-4`) y del `DialogContent` (`p-4`): el calendario ocupa el ancho del
  contenedor pero **no lo desborda**. En el diálogo, `scrollWidth === clientWidth` (328 px).
- Navegación del calendario a 360: 4 flechas de **44×48 px** + label de **136×48 px**;
  312 px + 16 px de gaps = 328 px, justo dentro del ancho útil. Sin overflow.
- Barrido de interactivos <44 px: `/registrar` default → **0**; “Editar pago” → **0**;
  `/ingresos` default → **0**; `/configuracion` default → **0** (360×800, light y dark).
- `SelectItem` abierto: 2 ítems de **171.3×44 px**.

### Evidencia B2 — reduced motion

- `prefers-reduced-motion: reduce` → `matchMedia(...).matches === true` en el navegador.
- Fuente: `RegistrarPage.tsx:136` y `:338-339` usan `behavior: motionBehavior()`; no queda
  ningún literal `"smooth"` fuera de `lib/a11y.ts`.
- Bundle compilado: `function G(){return Te()?"auto":"smooth"}`; ambos call sites compilan a
  `behavior:G()`. Con `reduce`, `G()` → `"auto"`.
- Panel móvil abierto con `reduce`: `animation-duration` y `transition-duration` efectivos =
  `1e-05s` en todos los candidatos medidos.
- El guard global `scroll-behavior: auto !important` sigue presente (`index.css:182-191`).

### Evidencia B3 — foco de ítems

- Fuente: `select.tsx:114` y `dropdown-menu.tsx:73,95,139,226` incluyen
  `focus:inset-ring-2 focus:inset-ring-ring`; conservan `focus:bg-accent`.
- CSS compilado (83.08 kB): existe
  `.focus\:inset-ring-2:focus{--tw-inset-ring-shadow:inset 0 0 0 2px var(--tw-inset-ring-color,currentcolor);box-shadow:...}`
  y `.focus\:inset-ring-ring:focus{--tw-inset-ring-color:var(--ring)}`.
- Medición en `SelectItem` enfocado (360×800):

| Tema | `box-shadow` del ítem | Ring vs popover | Ring vs fondo del ítem |
|---|---|---|---|
| light | `oklch(0.556 0 0) 0 0 0 2px inset` | **4.73:1** | 4.34:1 |
| dark | `oklch(0.556 0 0) 0 0 0 2px inset` | **3.79:1** | 3.19:1 |

- `DropdownMenu` comparte las mismas utilidades y el mismo CSS compilado; el ítem destructivo
  no sobreescribe el inset ring. No tiene usos actuales en la app.
- `outline-style` sigue en `none` (`outline-hidden`), pero el reemplazo por inset ring es
  visible y opaco; no depende solo de `focus:bg-accent`.

### Regresiones M0–M3 y extras

- **M0:** `.gitignore` añade `.ai/` y `web/.playwright-cli/`; `git ls-files .ai` vacío.
- **M1:** sin targets <44 en las superficies re-medidas; `icon`/`icon-sm`/`icon-xs` mantienen
  `max-md:min-*`; `Switch` default móvil = 56×50.4 px (hitbox `::after`) y `sm` = 48×46 px.
- **M2:** `--ring` light/dark = `oklch(0.556 0 0)`; anillos generales siguen opacos
  (`focus-visible:ring-ring`, sin `/50`). Trigger de Select medido: ring de 3 px.
- **M3:** primer `Tab` = **“Saltar al contenido”**; `Enter` → `activeElement` =
  `MAIN#contenido`; `main` con `outline-none`; guard de movimiento global OK.
- **Extras:** `--sidebar-ring` light = `0.556` (solo token, sin uso en componentes);
  `icon-lg` añade `max-md:min-h-11 max-md:min-w-11` (no usado; desktop `size-9` intacto);
  `Switch size="sm"` no usado; `max-md:` no afecta desktop.
- **Alcance:** `package.json`/`go.mod` sin cambios; sin API/BD/migraciones; `test-results/`
  sigue untracked (destino de M4); sin artefactos `.ai/` versionados.

## Criterios de aceptación

| AC | Estado | Evidencia / nota |
|---|---|---|
| AC1 (R1) | **PASS** (alcance del blocker) | Calendario 46.84/46.81 px a 360 y 51.14 a 390, 7 columnas, 0 overflow; 0 interactivos <44 en `/registrar`, “Editar pago”, `/ingresos` y `/configuracion` default. Matriz completa de estados secundarios → TEST. |
| AC2 (R1.7) | **PASS** | Desktop 1440×900: calendario 404 px y tiles 55.42 px; diff solo `max-md:`, color de foco y skip link oculto. |
| AC3 (R2) | **PASS** | Ítems Select/Dropdown: 4.73:1 light / 3.79:1 dark vs popover. Resto de componentes sin cambios respecto a review #1 (≥3:1). |
| AC4 (R2.3) | **PENDIENTE-TEST** | Skip link y foco de `SelectItem` verificados; falta recorrido de teclado completo por 5 rutas y estados. |
| AC5 (R3) | **PASS** (panel) | Panel móvil 1e-05 s con `reduce`; diálogo cubierto por guard global. Medición directa del diálogo → TEST. |
| AC6 (R4) | **PASS** | Primer Tab = “Saltar al contenido”; Enter enfoca `MAIN#contenido`; `outline-none` en main. |
| AC7 (No regresión) | **PENDIENTE-TEST** | Defaults de 4 rutas sin overflow ni targets <44; faltan 5 rutas × 2 temas × 3 viewports, truncado y contraste de texto. |
| AC8 (Calidad) | **PASS** | `tsc -b` + `vite build` OK; 24 tests PASS; `go test ./...` PASS. |
| AC9 (Alcance) | **PASS** | Sin dependencias nuevas; sin API/BD/migraciones. |
| AC10 (Git) | **PASS** (producto) | `origin/feat/a11y-gate` = `dc8cc63`; 5 commits publicados; sin merges/tags/force-push. M4 pendiente. |
| AC11 (Deploy) | **PENDIENTE** | Solo tras aprobación humana; no ejecutado. |
| AC12 (Evidencia) | **PENDIENTE-TEST** | `review.md`, `review-2.md` y `security-report.md`; faltan `report.md`, métricas antes/después y capturas de M4. |

## Riesgos residuales (no bloqueantes)

1. **`aria-invalid`:** los anillos `aria-invalid:ring-destructive/20` (light) y `/40` (dark)
   siguen compilándose después de `focus-visible:ring-ring`; un campo inválido y enfocado
   mostraría el anillo semitransparente. Hoy no se usa `aria-invalid`; corregir antes de
   validación inline (bloque B).
2. **DropdownMenuItem destructivo (dark):** el inset ring contrasta 3.79:1 contra el popover,
   pero ~1.75:1 contra el tinte `destructive/20` del propio ítem. No hay usos actuales; si se
   incorpora, considerar `data-[variant=destructive]:focus:inset-ring-destructive` o un token
   de mayor contraste.
3. **Override global de calendario:** `@media (max-width:767px) .react-calendar { width:
   calc(100% + 2rem) }` asume el `-mx-4` de `CalendarioDias`. Hoy es el único consumidor; si se
   reutiliza el calendario sin ese margen, re-medir.
4. **`Switch size="sm"` / `Button size="icon-lg"`:** sin usos actuales; hitbox móvil calculado
   ≥44 y desktop intacto. Validar si se usan en el futuro.
5. **Scroll runtime:** el call site de OCR (“Ver fecha en el calendario”) no se disparó en esta
   revisión (requiere resultado OCR). Verificado por fuente + bundle + `matchMedia`; TEST debe
   instrumentar `Element.prototype.scrollIntoView` y confirmar `"auto"` con `reduce`.
6. **Seguridad:** `security-report.md` fue generado en `5b03633`; el delta posterior no contiene
   secretos. Regenerar el reporte en el HEAD final para M4.

## Verificación exacta requerida en TEST

1. **AC1 completo:** 5 rutas × light/dark × 360×800 y 390×844 + estados secundarios de la
   sección 7 del SPEC. Exigir 0 interactivos con área efectiva <44×44 (hit-testing a ±22 px).
   Re-medir explícitamente `/registrar` y “Editar pago”: ≥44×44, 7 columnas, sin overflow.
2. **AC3 completo:** medir el foco compuesto de Button (default/ghost/destructive), Input,
   Textarea, Select trigger, **SelectItem**, **DropdownMenuItem (incl. destructivo si se añade
   un uso)**, Tabs, links de nav, Switch y Checkbox; ≥3:1 contra el fondo adyacente real en
   light y dark. Confirmar que el inset ring aparece con teclado (no solo con puntero).
3. **AC4:** recorrido de teclado completo por las 5 rutas y estados secundarios; skip link,
   orden lógico y siguiente Tab desde `main`.
4. **AC5 + R3.2:** con `reducedMotion: 'reduce'`, abrir panel y Dialog/AlertDialog (≤10 ms) e
   instrumentar `Element.prototype.scrollIntoView` para verificar `behavior: "auto"` en el flujo
   OCR (solo fecha) y en “Ver fecha en el calendario”; sin `reduce`, `"smooth"`.
5. **AC7:** 5 rutas × 2 temas × 3 viewports; 0 overflow horizontal, 0 truncados nuevos,
   contraste de texto AA y consola sin errores nuevos.
6. **AC2:** capturas 1440×900 antes/después; confirmar calendario ~404 px y tiles ~55 px.
7. **M4/AC12:** generar `report.md`, `metrics-before.json`, `metrics-after.json` y capturas;
   mapear AC1–AC12 a PASS/FAIL con números. Confirmar `.ai/` fuera de Git y `test-results/`
   versionado en el commit final.
