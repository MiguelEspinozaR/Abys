# Evidencia M4 — forms-a11y (AC1–AC12)

**Fecha:** 2026-11-12 · **Rama:** `feat/forms-a11y` · **Commit:** `da2e7d8` (`da2e7d86043c22d87ad494b13c85499fa5a62685`, base `490de51`) · HEAD == origin.
**Entorno de auditoría:** vite preview `http://localhost:5178` (build `web/dist` con `VITE_API_URL=http://localhost:18082/api/v1`) + backend auditoría `:18082` (solo GETs reales).
**Navegador:** Chrome 156.0.8078.79 (headless, `channel: chrome`) · Node v22.22.1 · Playwright 1.65.0.
**Corrida:** 2026-11-12T01:20:18Z → 01:30:09Z.

## Seguridad de la ejecución

- Todas las escrituras de API se mockean con `page.route()` (respuestas 4xx/5xx/200/599 controladas).
- Red de seguridad registrada antes que cualquier mock: cualquier método distinto de GET/HEAD/OPTIONS no mockeado responde **599 `HARNESS_BLOCKED_WRITE`** (header `x-harness-mock: 1`) y se registra como escritura inesperada.
- Backend `:18082` recibió **solo GETs reales**; `:8081`/`:8082` no se tocaron. No se modificó código de producto ni Git.

## Veredicto global

| Área | Resultado |
|---|---|
| AC1–AC6 (58 casos, 336 checks) | **PASS** |
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
| AC2 | Validación inline + resumen + foco | `logs/ac2.md` — 9 casos / 39 checks: errores inline con `aria-invalid`+`aria-describedby`, fieldset `#registrar-dias` asociado vía `aria-describedby`, ErrorSummary con ítems enfocables, foco al primer campo inválido, monto bloqueado con split | PASS |
| AC3 | Errores de API mapeados a campo/resumen | `logs/ac3.md` — 23 casos / 187 checks: 400/409/422/500 por formulario (registrar, editar, fuente, cuenta, tasa, generar split, splits tab); mapeo por `code`/status; diálogo permanece abierto | PASS |
| AC4 | Aviso de cambios sin guardar | `logs/ac4.md` — 7 casos / 24 checks: navegación con form sucio muestra ConfirmarDescarte con foco en "Seguir editando"; descarte restaura y navega; form limpio navega directo; Escape/backdrop/X en Editar; `logs/ac4-beforeunload.txt` (0 usos de `beforeunload`) | PASS |
| AC5 | Comprobantes (PDF/tamaño/OCR) | `logs/ac5.md` — 8 casos / 35 checks: PDF y >11 MB rechazados con mensaje, drop rechazado, OCR rellena monto/fecha/notas, fallo de comprobante tras pago 200 → reintentar, logo/QR válidos e inválidos | PASS |
| AC6 | Teclado y foco (Tab/Shift+Tab, trap, splits) | `logs/ac6.md` — 4 casos / 19 checks: primer Tab = "Saltar al contenido", orden de tabulación, focus trap en diálogos, splits con flechas (autoguardado) | PASS |
| AC7 | Sin overflow, contraste AA, consola limpia | `metrics-after.json` → `ac7`: 20 rutas con **0 overflow, 0 fallos de contraste, 0 errores de consola, 0 truncados, 0 controles sin nombre**; 17 estados (incluye `registrar-ocr-resumen` light **y dark**) todos PASS con 0 contraste, 0 toasts y estado inline `aria-live=polite` | PASS |
| AC8 | Calidad | `logs/tsc.log` (exit 0), `logs/npm-test.log` (6 archivos, 69 tests), `logs/build.log` (exit 0), `logs/go-test.log` (exit 0) | PASS |
| AC9 | Alcance del diff | `logs/git-ac9-ac10.log`: 22 archivos cambiados en `490de51..da2e7d8`, `diffDeps` vacío, 0 archivos fuera de alcance | PASS |
| AC10 | Repositorio remoto | `da2e7d86043c…` en `origin/feat/forms-a11y` = HEAD | PASS |
| AC11 | Deploy verificado en vivo | — | PENDING (post-release) |
| AC12 | Evidencia versionada | Este `report.md` + `metrics-before.json`/`metrics-after.json` + `console-log.json` + `logs/` + `screenshots/` (30) + `harness/` | PASS |

## AC7 — detalle

### Rutas (20 combinaciones)

0 overflow horizontal, 0 fallos de contraste, 0 truncados, 0 controles sin nombre y 0 errores de consola/requests fallidos en `/`, `/ingresos`, `/splits`, `/registrar`, `/configuracion` en light/dark × mobile(390)/desktop(1280).

### Estados (17)

Todos PASS. `registrar-ocr-resumen` verificado en **light y dark** (`metrics-after.json → ac7.formStates`):

| Tema | Contraste | Toasts | Estado inline |
|---|---|---|---|
| light | 0 fallos | 0 | `aria-live=polite` → "Comprobante leído: Monto 265,00 Bs · Fecha jue, 5 nov 2026" |
| dark | 0 fallos | 0 | ídem |

Capturas: `screenshots/ac7-registrar-ocr-m390-light.png` y `screenshots/ac7-registrar-ocr-m390-dark.png`.

### Historial del hallazgo — corregido en da2e7d8

En `974ca45` el estado `registrar-ocr-resumen` light fallaba AA: `dt.text-muted-foreground` "Monto:", "Fecha:" y "Descripción:" medían **4.28:1** y el texto del toast de éxito **4.26:1** (mínimo 4.5:1), estable a +400/+1200/+3200 ms (no artefacto de transición).

Corrección `da2e7d8`:
- `RegistrarPage.tsx`: `dt` del resumen OCR pasa a `text-card-foreground`.
- `ComprobanteDropzone.tsx`: se retiran los toasts de OCR (se conserva el estado inline con `aria-live="polite"`).

Verificación post-fix: **0 fallos de contraste y 0 toasts** en light/dark; el estado inline sigue anunciándose por `aria-live`. No quedan hallazgos abiertos de AC7.

## Informativos (no forman parte del gate)

- **Touch targets:** 0 controles pequeños en mobile en todas las rutas; en desktop los recuentos (`small`) son informativos porque la regla de 44 px solo aplica a puntero táctil. Estados: `registrar-invalido` 3 items del ErrorSummary (20 px de alto) y `fuente-invalido`/`tasa-invalido` 1 control cada uno — informativos.
- **Imágenes sin width/height:** `imgsSinDim` en estados con diálogos (44) — informativo, no gated.
- **Baseline desactualizado:** `metrics-before.json` registra `/ingresos` con 40 targets; hoy son 413 (mobile) / 419 (desktop) por los botones por fila nuevos. La comparación `before/after` es informativa, no una regresión.
- **`console-log.json`:** 58/58 casos sin entradas de consola, requests fallidos ni escrituras inesperadas; las respuestas mockeadas 4xx/5xx se clasifican como `mockedNetwork`.

## Limitaciones

- El cierre real de pestaña (`beforeunload`) no se puede simular con Playwright; AC4 cubre el aviso in-app y se documenta el grep (0 usos de `beforeunload` en `web/src`).
- El OCR usa el chunk real de tesseract servido por el build (`/assets/index-DgvX7Flt.js`) con fixture de imagen controlada.
- AC7 evalúa contraste AA con el algoritmo del gate (`computeIndicator`) sobre estilos computados.

## Cómo reproducir

```bash
# staging: rebuild con VITE_API_URL=http://localhost:18082/api/v1, preview :5178, backend auditoría :18082 (solo GET)
node test-results/forms-a11y/harness/forms-audit.cjs
```

Salida esperada: 58/58 casos PASS, AC7 PASS (20 rutas + 17 estados, OCR light/dark con 0 contraste y 0 toasts), AC8/AC9/AC10 PASS.

## Artefactos

- `report.md` (este archivo)
- `metrics-before.json` (baseline AC7 previo) · `metrics-after.json` (AC1–AC11 con meta `da2e7d8`)
- `console-log.json` (consola/failedRequests/unhandled/writes por caso)
- `logs/ac1.md` … `logs/ac6.md`, `logs/matrix.json`, `logs/tsc.log`, `logs/npm-test.log`, `logs/build.log`, `logs/go-test.log`, `logs/git-ac9-ac10.log`, `logs/ac4-beforeunload.txt`
- `screenshots/` (30: AC2, AC3, AC4, AC5, AC7 rutas/estados incl. OCR light/dark)
- `harness/forms-audit.cjs` (harness ejecutable)
