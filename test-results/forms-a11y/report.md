# Evidencia M4 — forms-a11y (AC1–AC12)

**Fecha:** 2026-11-13 · **Rama:** `feat/forms-a11y` · **Commit:** `c5fdc8f` (`c5fdc8f5240f9b8db14a38f3fb65b46df4272512`, base `490de51`) · HEAD == origin.
**Entorno de auditoría:** vite preview `http://localhost:5178` (build `web/dist` con `VITE_API_URL=http://localhost:18082/api/v1`, reconstruido desde `c5fdc8f`) + backend auditoría `:18082` (solo GETs reales).
**Navegador:** Chrome 156.0.8078.79 (headless, `channel: chrome`) · Node v22.22.1 · Playwright 1.65.0.
**Corrida:** 2026-11-14T00:49:57Z → 2026-11-14T01:01:02Z (20:49–21:01 local).

## Estado del ciclo

El runtime está en **BUILD** tras un `REVIEW → BUILD (rechazado)` por **R4.5** (foco en `BODY` al seguir editando) y por la **cobertura incompleta de AC4**. Este informe verifica `fbce42e` (restauración de foco en X/Cancelar/Escape/nav) y `c5fdc8f` (backdrop: `onMouseDown` `preventDefault` en el overlay), con el harness ampliado a Fuente/Cuenta/Tasa y cierre sin dirty. **No quedan hallazgos abiertos de R4.5/AC4.** No se modificó código de producto ni Git.

## Seguridad de la ejecución

- Todas las escrituras de API se mockean con `page.route()` (respuestas 4xx/5xx/200/599 controladas).
- Red de seguridad registrada antes que cualquier mock: cualquier método distinto de GET/HEAD/OPTIONS no mockeado responde **599 `HARNESS_BLOCKED_WRITE`** (header `x-harness-mock: 1`) y se registra como escritura inesperada.
- Backend `:18082` recibió **solo GETs reales**; `:8081`/`:8082` no se tocaron. No se modificó código de producto ni Git.

## Veredicto global

| Área | Resultado |
|---|---|
| AC1–AC6 (67 casos, 441 checks) | **PASS** |
| AC7 (20 rutas × tema/viewport + 17 estados) | **PASS** |
| AC8 (calidad) | **PASS** |
| AC9 (alcance) | **PASS** |
| AC10 (repositorio) | **PASS** |
| AC11 (deploy) | **PENDING** (post-release, fuera de BUILD) |
| AC12 (evidencia) | **PASS** (este directorio) |

## Tabla AC1–AC12

| AC | Criterio | Evidencia | Veredicto |
|---|---|---|---|
| AC1 | Nombres accesibles y navegación por teclado | `logs/ac1.md` — 7 casos / 32 checks: 51 controles nombrados en Registrar, 51 en Editar; Enter envía (1 submit) sin salir de ruta; Enter en Select abre listbox; Enter en textarea inserta salto de línea; Cancelar/X `type=button`; SplitsTab sin `<form>` (1 control nombrado) | PASS |
| AC2 | Validación inline + resumen + foco | `logs/ac2.md` — 10 casos / 45 checks: errores inline con `aria-invalid`+`aria-describedby`, `#registrar-dias` con `aria-invalid=true` además de `aria-describedby`, ErrorSummary con ítems enfocables, foco al primer campo inválido, monto bloqueado con split; método inválido cubierto en estado alcanzable `#edit-metodo` | PASS |
| AC3 | Errores de API mapeados a campo/resumen | `logs/ac3.md` — 23 casos / 187 checks: 400/409/422/500 por formulario (registrar, editar, fuente, cuenta, tasa, generar split, splits tab); mapeo por `code`/status; diálogo permanece abierto | PASS |
| AC4 | Aviso de cambios sin guardar | `logs/ac4.md` — **13 casos / 104 checks**: nav SPA y cierre por X/Cancelar/Escape/**backdrop** con form sucio en Registrar, Editar, Fuente, Cuenta y Tasa; confirmación con foco inicial en "Seguir editando"; seguir conserva datos y no navega; descartar cierra/navega; **cierre sin dirty** cierra directo sin confirmación; **R4.5**: tras seguir el foco queda en el form/diálogo, nunca `BODY` (incluido backdrop). `logs/ac4-beforeunload.txt` (0 usos de `beforeunload`) | **PASS** |
| AC5 | Comprobantes (PDF/tamaño/OCR) | `logs/ac5.md` — 10 casos / 54 checks: PDF y >11 MB rechazados con mensaje, drop rechazado, OCR rellena monto/fecha/notas, fallo de comprobante tras pago 200 → reintentar, logo/QR inválidos y válidos, post-pago bloqueado (sin re-POST /pagos, OCR sin efecto, reintento solo del upload, "Ir a ingresos" sin confirmación), QR válido con POST mockeado | PASS |
| AC6 | Teclado y foco (Tab/Shift+Tab, trap, splits) | `logs/ac6.md` — 4 casos / 19 checks: primer Tab = "Saltar al contenido", orden de tabulación, focus trap en diálogos, splits con flechas (autoguardado) | PASS |
| AC7 | Sin overflow, contraste AA, consola limpia | `metrics-after.json` → `ac7`: 20 rutas con **0 overflow, 0 fallos de contraste, 0 errores de consola, 0 truncados, 0 controles sin nombre**; 17 estados (incluye `registrar-ocr-resumen` light **y dark**) todos PASS con **0 touch targets fallidos**, 0 contraste, 0 toasts y estado inline `aria-live=polite` | PASS |
| AC8 | Calidad | `logs/tsc.log` (exit 0), `logs/npm-test.log` (6 archivos, 69 tests), `logs/build.log` (exit 0), `logs/go-test.log` (exit 0) | PASS |
| AC9 | Alcance del diff | `logs/git-ac9-ac10.log`: 76 archivos en `490de51..c5fdc8f` (22 de producto en `web/` + 54 de evidencia en `test-results/`), `diffDeps` vacío, 0 archivos fuera de alcance | PASS |
| AC10 | Repositorio remoto | `c5fdc8f5240f…` en `origin/feat/forms-a11y` = HEAD | PASS |
| AC11 | Deploy verificado en vivo | — | PENDING (post-release) |
| AC12 | Evidencia versionada | Este `report.md` + `metrics-before.json`/`metrics-after.json` + `console-log.json` + `logs/` + `screenshots/` (39) + `harness/` | PASS |

## AC4 — detalle (R4.5)

13 casos: `registrar-nav`, `registrar-limpio`, `registrar-tras-guardar`, `editar-close`, `editar-escape`, `editar-nav`, `registrar-ocr-sucio`, `fuente-nav`, `fuente-close`, `cuenta-nav`, `cuenta-close`, `tasa-nav`, `tasa-close`.

| Camino (form sucio) | Resultado | Foco tras "Seguir editando" |
|---|---|---|
| Navegación SPA — Registrar | PASS | `INPUT #monto` (form) |
| Navegación SPA — Editar | PASS | `INPUT #edit-monto` (form) |
| Navegación SPA — Fuente / Cuenta / Tasa | PASS | control dentro de `[data-slot=dialog-content]` |
| X / Cancelar / Escape — Editar, Fuente, Cuenta, Tasa | PASS | control dentro del diálogo (no `BODY`) |
| Backdrop — Fuente / Cuenta / Tasa | PASS | control dentro del diálogo (no `BODY`) |
| Cierre sin dirty (X) — Fuente / Cuenta / Tasa | PASS | cierra directo: 0 confirmaciones, 0 diálogos, 0 escrituras |
| Descartar (X/Escape/nav) | PASS | cierra el diálogo o navega; 0 escrituras de API |

**Backdrop (resuelto en `c5fdc8f`):** el `pointerdown` sobre el overlay ya no mueve el foco a `BODY` (`onMouseDown` con `preventDefault`), de modo que la confirmación captura el control previo y "Seguir editando" restaura el foco dentro del diálogo. Verificado con sonda de eventos (`mousedown` → sigue el `INPUT`; `mouseup` → alerta con foco en "Seguir editando") y con los 3 casos del harness.

Capturas: `screenshots/ac4-confirm-{fuente,cuenta,tasa}-{nav,close}-m390-*.png` y `ac4-confirm-{registrar,editar}-m390-*.png`.

## AC7 — detalle

### Rutas (20 combinaciones)

0 overflow horizontal, 0 fallos de contraste, 0 truncados, 0 controles sin nombre y 0 errores de consola/requests fallidos en `/`, `/ingresos`, `/splits`, `/registrar`, `/configuracion` en light/dark × mobile(390)/desktop(1440).

### Estados (17)

Todos PASS. `registrar-ocr-resumen` verificado en **light y dark** (`metrics-after.json → ac7.formStates`):

| Tema | Contraste | Toasts | Estado inline |
|---|---|---|---|
| light | 0 fallos | 0 | `aria-live=polite` → "Comprobante leído: Monto 265,00 Bs · Fecha jue, 5 nov 2026" |
| dark | 0 fallos | 0 | ídem |

Capturas: `screenshots/ac7-registrar-ocr-m390-light.png` y `screenshots/ac7-registrar-ocr-m390-dark.png`.

### Touch targets en estados de formulario (H1)

En los 17 estados (mobile 390, light/dark) el gate usa `touchFailures` del hit-test 44×44 del harness del bloque A: **0 fallos en los 17 estados**. `registrar-invalido` (light y dark) pasa de 3 items del ErrorSummary de 20 px a **0 fallos / 0 `small`**.

Dos estados conservan `small=1` con **0 `touchFailures`**: `fuente-invalido` (switch "split automático", 32×18 dentro de su wrapper) y `tasa-invalido` (checkbox `tasa-aplicar-N`, 16×16 dentro de su label). En ambos el área táctil de 44 px queda cubierta por el control etiquetado que lo contiene, por lo que el hit-test no registra fallo; la métrica del gate es `touchFailures`, no el recuento bruto `small`. Evidencia en `metrics-after.json` (`touchFailures`, `touchDetail`, `small`).

## Historial de hallazgos y correcciones

### `c5fdc8f` — foco al cerrar por backdrop (R4.5-BACKDROP)

`dialog.tsx` (+6): `DialogOverlay` añade `onMouseDown={(e) => e.preventDefault()}` para que el `mousedown` por defecto no lleve el foco a `BODY` antes de que el formulario capture su control previo; Radix sigue detectando el cierre por `pointerdown`/`click`.

Verificación (`fuente-close`, `cuenta-close`, `tasa-close`, 16 checks cada uno): el backdrop abre la confirmación, "Seguir editando" restaura el foco **dentro del diálogo** (nunca `BODY`), conserva los datos y no navega; "Descartar cambios" cierra sin navegar; la reapertura limpia cierra directo sin confirmación. **R4.5-BACKDROP: resuelto.**

### `fbce42e` — foco al seguir editando (R4.5)

`ConfirmarDescarteDialog.tsx` (+43/−4):
- captura el elemento enfocado en un `useLayoutEffect` al abrir la confirmación y lo restaura con `window.setTimeout(…focus({preventScroll:true}), 0)` al cerrar con "Seguir editando";
- `onCloseAutoFocus` con `preventDefault()` para no devolver el foco a un destino arbitrario;
- `descartandoRef` evita restaurar cuando la acción es "Descartar cambios".

Verificado en `fbce42e` y re-verificado en `c5fdc8f`: X/Cancelar/Escape y navegación SPA ya **no** dejan el foco en `BODY`; Registrar vuelve a `#monto`, Editar a `#edit-monto` y Fuente/Cuenta/Tasa a un control del diálogo.

### `7a545a2` — fixes de la ronda REVIEW (H1/M1/M2/M5)

- **H1 (touch targets del ErrorSummary):** `ErrorSummary.tsx` añade `max-md:min-h-11 max-md:w-full max-md:py-2` a los botones de ítem (≥44×44 en táctil). Medición: `registrar-invalido` mobile light/dark → 0 `touchFailures` (antes 3). El harness ahora **falla el estado de formulario si `touchFailures > 0`** (`small` queda como informativo).
- **M1 (aria-invalid en grupos):** `CalendarioDias.tsx` expone `aria-invalid=true` en el fieldset `#registrar-dias` (verificado en AC2 y en el estado `registrar-invalido`). El grupo `#metodo` de `/registrar` tiene el atributo cableado a `validacion.errores.metodo`, pero **no es alcanzable por UI** porque un método siempre está seleccionado (Efectivo por defecto); AC2 verifica que no marca falso positivo y añade el caso `editar-metodo-invalido`, que provoca el estado real con un pago de método inválido vía GET mockeado y comprueba `#edit-metodo aria-invalid=true`, su error inline y el ErrorSummary.
- **M2 (estado post-pago editable):** `RegistrarPage.tsx` bloquea campos (`disabled={pagoGuardado}` en calendario, fuente, métodos, monto y notas), retira el submit principal y corta `onSubmit`/`guardar`/OCR con `pagoGuardado`. AC5 `post-pago-bloqueado` verifica: campos y métodos deshabilitados, sin "Guardar pago", `requestSubmit()` no hace un segundo `POST /pagos` (sigue 1), el OCR de un comprobante nuevo no altera el monto guardado (999,00 no se aplica), el reintento hace solo un 2.º upload (sin re-crear el pago) y "Ir a ingresos" navega sin confirmación de descarte.
- **M5 (QR válido):** AC5 `qr-valido` sube un PNG por el control "Subir QR de" (Cuentas), con `POST /cuentas/:id/qr` mockeado 200: exactamente 1 request, sin error inline y sin escrituras no mockeadas.
- **M3 (baseline AC7):** ver sección siguiente; se elimina la comparación `before/after` del harness y la afirmación incorrecta del informe anterior.

### `da2e7d8` — contraste AA del resumen OCR

En `974ca45` el estado `registrar-ocr-resumen` light fallaba AA: `dt.text-muted-foreground` "Monto:", "Fecha:" y "Descripción:" medían **4.28:1** y el texto del toast de éxito **4.26:1** (mínimo 4.5:1), estable a +400/+1200/+3200 ms (no artefacto de transición).

Corrección `da2e7d8`:
- `RegistrarPage.tsx`: `dt` del resumen OCR pasa a `text-card-foreground`.
- `ComprobanteDropzone.tsx`: se retiran los toasts de OCR (se conserva el estado inline con `aria-live="polite"`).

Verificación post-fix: **0 fallos de contraste y 0 toasts** en light/dark; el estado inline sigue anunciándose por `aria-live`. No quedan hallazgos abiertos de AC7.

## Baseline AC7 (`metrics-before.json`) — aclaración

`test-results/a11y-gate/metrics-before.json` es el baseline del **bloque A** (20 entradas ruta × tema × viewport) y **no** es una foto del build actual de forms-a11y:

- Su campo `targets` es una **lista de elementos interactivos menores de 44 px** (undersized), no el total de controles. Conteos reales del archivo: `/` 10 (mobile) / 16 (desktop), `/ingresos` 40 / 40, `/splits` 22–28, `/registrar` 16 / 22, `/configuracion` 20 / 26.
- En `metrics-after.json`, `targets` es el **total** de elementos interactivos y `touchFailures`/`small` son las métricas de tamaño/hit-test. Comparar `40` del baseline con `413/419` de `targets` del build actual mezcla dos cantidades distintas: **no es una regresión ni una comparación válida**.
- Por eso el harness ya **no** carga ni compara el baseline, y el gate de AC7 no lo usa. El archivo se conserva como referencia histórica del bloque A (build previo, otra semántica de medición).

## Informativos (no forman parte del gate)

- **Touch targets en desktop:** los recuentos de `small`/`touch` en desktop son informativos (la regla de 44 px aplica a puntero táctil); en mobile todas las rutas dan 0 `touchFailures`.
- **Imágenes sin width/height:** `imgsSinDim` en estados con diálogos (44) — informativo, no gated.
- **`console-log.json`:** 67/67 casos sin entradas de consola, requests fallidos, rechazos no manejados ni escrituras inesperadas; las 27 respuestas mockeadas 4xx/5xx se clasifican como `mockedNetwork`.

## Limitaciones

- El cierre real de pestaña (`beforeunload`) no se puede simular con Playwright; AC4 cubre el aviso in-app y se documenta el grep (0 usos de `beforeunload` en `web/src`).
- El OCR usa el chunk real de tesseract servido por el build (`/assets/index-DgvX7Flt.js`) con fixture de imagen controlada.
- AC7 evalúa contraste AA con el algoritmo del gate (`computeIndicator`) sobre estilos computados.
- `#metodo` de `/registrar` no puede quedar sin valor por UI; su estado de error se cubre en `#edit-metodo` (misma regla `validarMetodoPago`).

## Cómo reproducir

```bash
# staging: rebuild con VITE_API_URL=http://localhost:18082/api/v1, preview :5178, backend auditoría :18082 (solo GET)
node test-results/forms-a11y/harness/forms-audit.cjs
```

Salida: **67 casos / 441 checks, todos PASS**; AC7 PASS (20 rutas + 17 estados, 0 touchFailures, OCR light/dark con 0 contraste y 0 toasts); AC8/AC9/AC10 PASS; AC11 PENDING.

## Artefactos

- `report.md` (este archivo)
- `metrics-before.json` (baseline del bloque A, referencia histórica) · `metrics-after.json` (AC1–AC11 con meta `c5fdc8f`)
- `console-log.json` (consola/failedRequests/unhandled/writes por caso)
- `logs/ac1.md` … `logs/ac6.md`, `logs/matrix.json`, `logs/tsc.log`, `logs/npm-test.log`, `logs/build.log`, `logs/go-test.log`, `logs/git-ac9-ac10.log`, `logs/ac4-beforeunload.txt`
- `screenshots/` (39: AC2 6, AC3 4, AC4 8, AC5 4, AC7 17)
- `harness/forms-audit.cjs` (harness ejecutable)
