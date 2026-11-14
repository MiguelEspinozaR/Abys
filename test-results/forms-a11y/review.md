# Review — forms-a11y (re-revisión)

**Fecha:** 2026-11-13  
**Rama:** `feat/forms-a11y` · **HEAD:** `5c90899` (== `origin/feat/forms-a11y`) · **Base:** `490de51`  
**Producto/evidencia revisada:** `c5fdc8f` / `7149436` · **Re-SCAN:** `5c90899` (solo reporte de seguridad; sin delta de producto)

## Veredicto

**APPROVED**

**`REVIEW -> TEST` autorizado con observaciones no bloqueantes.** No hay hallazgos bloqueantes; OBS-1 (caso `editar-backdrop`) se completa en TEST. AC11 sigue **PENDING** post-release, fuera de BUILD/REVIEW.

## Hallazgos

### Bloqueantes

Ninguno.

### No bloqueantes / seguimiento en TEST

1. **OBS-1 — Falta el caso AC4 `editar-backdrop` en la evidencia versionada.**  
   SPEC §8 exige para Editar: `dirty + Escape/overlay/Cancelar`. El harness cubre X/Cancelar (`editar-close`) y Escape (`editar-escape`), pero no el overlay de Editar; `report.md` lista backdrop solo para Fuente/Cuenta/Tasa.  
   Verificación independiente con GET mockeados: overlay de Editar → ConfirmarDescarte → “Seguir editando” deja el foco en `INPUT #edit-monto` (dentro del diálogo, no `BODY`) y no hay escrituras. Es un **gap de evidencia**, no de implementación. Agregar el caso al harness y a `logs/ac4.md` en TEST (sin cambio de código).

2. **OBS-2 — `registrar-nav` usa clic programático; el clic real deja foco en el link.**  
   El harness hace `page.evaluate(() => link.click())`, por lo que el foco previo es `#monto` y “Seguir editando” lo restaura. Con un clic real de mouse sobre el link “Ingresos”, el foco previo es el link y se restaura el link (no `BODY`; el formulario y los datos se conservan y no se navega). No incumple el objetivo del fix (nunca `BODY`), pero si se exige foco dentro del formulario también para navegación, añadir un caso con clic real y/o enfocar explícitamente el formulario en TEST.

3. **OBS-3 — Metadatos de evidencia desalineados con el HEAD actual.**  
   `report.md` dice “El runtime está en BUILD” (el runtime real es `REVIEW`), AC10 apunta a `c5fdc8f` mientras HEAD es `5c90899` (commit solo de seguridad), y `test-results/tests/forms-a11y.json` conserva una nota de working tree “modificado/sin trackear” aunque el árbol está limpio. No afecta al producto; corregir en DOCUMENT/TEST.

## Verificación R4.5 y AC4

- **R4.5 — “Seguir editando”:** `ConfirmarDescarteDialog` captura el foco previo en `useLayoutEffect`, restaura con `focus({preventScroll:true})` y usa `onCloseAutoFocus` con `preventDefault`; `descartandoRef` evita restaurar al descartar. Verificado en código (`web/src/components/form/ConfirmarDescarteDialog.tsx`) y con probes Playwright:
  - Registrar nav: foco final `#monto` en el escenario del harness (clic programático).
  - Editar Escape y backdrop: `#edit-monto`.
  - Fuente Escape y backdrop desde `#fuente-alias`: `#fuente-alias`.
  - Cuenta backdrop desde `#cuenta-alias`: `#cuenta-alias`.
  - X/Cancelar/Escape/backdrop en Fuente/Cuenta/Tasa: foco dentro de `[data-slot=dialog-content]` (botón Close o campo), nunca `BODY`.
- **R4.5 — backdrop:** `web/src/components/ui/dialog.tsx` añade `onMouseDown` con `preventDefault` en `DialogOverlay`; el `pointerdown` de Radix sigue cerrando. Probe independiente: backdrop sucio abre ConfirmarDescarte y restaura el campo; backdrop limpio cierra directo (0 confirmaciones, 0 diálogos).
- **AC4:** `metrics-after.json` → `ac4: 13 casos / 104 checks / pass`; `logs/ac4.md` incluye `fuente-nav/close`, `cuenta-nav/close`, `tasa-nav/close`, X/Cancelar/Escape/backdrop, cierre sin dirty y 0 escrituras. Coincide con `console-log.json` (67 casos, 0 consola/failedRequests/unhandled/unexpectedWrites) y `test-results/tests/forms-a11y.json` (67/441 PASS).

## H1 / M1 / M2 / M3 / M5

- **H1 (touch targets ErrorSummary):** 17 `formStates` con `touchFailures=0`; `registrar-invalido` light/dark sin fallos. Los 3 estados con `small=1` son informativos (switch/checkbox dentro de wrapper etiquetado) y no fallan el hit-test 44×44.
- **M1 (`aria-invalid` en grupos):** `#registrar-dias` con `aria-invalid=true` y `aria-describedby=registrar-dias-error`; caso alcanzable `#edit-metodo` verificado en AC2.
- **M2 (post-pago):** campos bloqueados, sin re-POST `/pagos`, OCR sin efecto, reintento solo del comprobante, salida sin confirmación.
- **M3 (baseline AC7):** baseline del bloque A fuera del gate; semántica de `targets` aclarada; no se compara con el build actual.
- **M5 (QR válido):** PNG mockeado, exactamente 1 POST a `/cuentas/:id/qr`, sin error inline ni escrituras no mockeadas.

## ACs y evidencia

| AC | Resultado | Evidencia |
|---|---|---|
| AC1–AC3 | PASS | `logs/ac1.md` (7/32), `logs/ac2.md` (10/45), `logs/ac3.md` (23/187) |
| AC4 | PASS (13/104; falta `editar-backdrop`, OBS-1) | `logs/ac4.md` (13/104), `metrics-after.json`, `screenshots/ac4-*` |
| AC5 | PASS | `logs/ac5.md` (10/54), `screenshots/ac5-*` |
| AC6 | PASS | `logs/ac6.md` (4/19) |
| AC7 | PASS | `metrics-after.json` → 20 rutas + 17 estados, 0 touchFailures, 0 contraste, 0 overflow, 0 consola |
| AC8 | PASS | `logs/tsc.log`, `logs/npm-test.log`, `logs/build.log`, `logs/go-test.log` |
| AC9 | PASS | `logs/git-ac9-ac10.log`; sin deps nuevas, sin backend, sin archivos fuera de alcance |
| AC10 | PASS | `origin/feat/forms-a11y` contiene `c5fdc8f`; `5c90899` es solo seguridad |
| AC11 | PENDING | Post-release, fuera de BUILD/REVIEW |
| AC12 | PASS | `report.md`, `metrics-*.json`, `console-log.json`, `logs/`, `screenshots/` (39), `harness/` |

## Seguridad, arquitectura y SPEC

- **Seguridad:** `test-results/security/forms-a11y.md`/`.json` → PASS, sin hard blocks. Sin secretos (regex; gitleaks no disponible y declarado advisory), sin SAST, sin deps nuevas, sin cambios de configuración, sin backend, sin `beforeunload`.
- **Arquitectura/alcance:** cambios solo en `web/src/**` y `test-results/**`; `web/package.json`, lockfile, `backend/go.mod`/`go.sum` sin cambios; 0 archivos fuera de alcance.
- **SPEC R1–R6 / D16 / D17:** sin regresiones nuevas. D16 (pago guardado + fallo de comprobante no se re-crea) y D17 (errores de formulario inline, sin toast) siguen cubiertos por AC5/AC3. El cambio de foco/overlay es R4.5/R4.3/R6.4 y no altera semántica, validación ni mapeo de errores.
- **Calidad reproducida:** `cd web && npm test -- --run` → 6 archivos, 69 tests PASS; `npx tsc -b` → exit 0; `npm run build` (con `VITE_API_URL=http://localhost:18082/api/v1`) → exit 0; `cd backend && go test ./...` → PASS. No se modificó código de producto ni historial Git.

## Recomendación de transición

- **APPROVED:** ejecutar `REVIEW -> TEST`.
- En TEST: agregar `editar-backdrop` a AC4 (SPEC §8) y, opcionalmente, `registrar-nav` con clic real; corregir las notas de metadatos (OBS-3). No se requiere otro ciclo de BUILD por estos puntos.
- Mantener **AC11 PENDING** hasta el deploy post-release.
