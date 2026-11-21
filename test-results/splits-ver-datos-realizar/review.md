# Review — splits-ver-datos-realizar

| Campo | Valor |
|---|---|
| **Verdict** | **APPROVED** |
| **approved_for_test** | **true** |
| Reviewer | reviewer (opencode/big-pickle) |
| Fecha | 2026-11-20 |
| Rama / HEAD | `fix/splits-ver-datos-realizar` @ `201df6655cc55a05921e7018ccdb701814ab65b9` |
| Base | `main` @ `194841c` |
| Alcance | diff `194841c..201df66` (3 commits) vs SPEC R1–R5 / AC1–AC18, PLAN D-PLAN-1..4 / M0–M6, policy §5/§6/§7/§9/§10, `test-results/security/splits-ver-datos-realizar.{json,md}` y ejecución local de comandos canónicos |
| Hallazgos bloqueantes (destino BUILD) | **0** |
| Hallazgos no bloqueantes | **6** (A1–A4 advisory, I1–I2 info) |
| **Gate AA duro (policy §5 / R4)** | **PASS** (6/6 puntos) |
| Secretos expuestos (hard block por defecto) | **Ninguno** (Gitleaks 0; filtrado literal de `backend/.env` redactado antes del commit `201df66`) |

> Decisión tomada de forma explícita por Review; no se difiere al orquestador. Este revisor **no
> mutó** código, historial Git ni `.ai/runtime/state.yaml`. No se imprimieron ni reprodujeron valores
> secretos. El único cambio en el árbol es este artefacto (`review.md`), **sin commitear**.

---

## 1. Veredicto y justificación

`APPROVED` con `approved_for_test: true`. La implementación satisface R1–R5 y las 18 AC a nivel de
código y de pruebas unitarias, cumple el gate duro de accesibilidad de la política §5, respeta la
arquitectura (frontend-only; reutiliza `PUT /transacciones/:id/realizar`; sin backend, migraciones,
endpoints ni dependencias nuevas), cumple la política de Git (rama de feature, Conventional Commits
en español, rama pusheada y en sync, sin force-push, sin tag/release/merge/deploy) y cierra la versión
`0.4.1` de forma coherente en los 3 campos + README + CHANGELOG + backlog. No hay secretos expuestos
ni vulnerabilidad crítica. Los cuatro `tool_missing` del reporte de seguridad son **advisory** por
política; el filtrado de secretos del reporte Markdown fue redactado antes de cualquier commit y el
contenido commiteado está limpio (verificado por lectura y por escaneo de patrones sobre todo el rango).

El estado del ciclo es `REVIEW` y la transición `REVIEW → TEST` ocurre cuando Review aprueba; por tanto
los artefactos de evidencia propios de TEST (`report.md`, `aa-harness.json`, `metrics.json`, capturas y
`test-results/tests/splits-ver-datos-realizar.json`) **no existen aún y no son condición de este
veredicto**. SPEC §8 separa explícitamente «REVIEW aprobado (incluido gate AA)» de «TEST con 18/18 AC
y evidencia». Se registran como obligación de TEST en A4, no como bloqueo.

---

## 2. Verificación explícita de los 7 puntos requeridos

### 2.1 R1 — Scroll del diálogo

| Comprobación | Resultado |
|---|---|
| R1.1 `max-h-[90dvh] overflow-y-auto` en `DialogContent` | ✅ `CuentaDetalleDialog.tsx:167-170`: `max-h-[90dvh] overflow-y-auto overscroll-contain`. Conserva el centrado `fixed top-1/2 -translate-x/y-1/2` heredado (~5dvh de margen). |
| Scroll único, sin lista anidada | ✅ `<ul className="space-y-2">` (`:237`) sin `overflow`; el único contenedor con scroll es `DialogContent`. Coherente con el criterio de «un único scroll» del proyecto. |
| R1.2 móvil / teclado (PageDown/End) y gesto táctil | ✅ `overflow-y-auto` sobre el scrollport del diálogo; Radix enfoca `DialogContent`, por lo que PageDown/End desplazan. Sin recorte arriba/abajo gracias a `90dvh`. (Confirmación empírica P1/P2 queda para TEST.) |
| R1.3 lightbox: fondo inerte + Escape jerárquico | ✅ `inert={zoom}` en el cuerpo (`:180`) y en el footer (`:273`); `showCloseButton={!zoom}` (`:168`); overlay `fixed inset-0 z-50` con `role="dialog" aria-modal="true"` (`:345-352`); listener único en captura con prioridad `zoom → confirmar → Radix` (`:77-95`). Foco al cerrar vuelve al botón QR (`:97-103`). |

### 2.2 R2 — Subtotal siempre visible

| Comprobación | Resultado |
|---|---|
| R2.1 footer sticky | ✅ `<footer className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-auto border-t bg-popover px-4 py-3">` (`:271-275`), hermano del cuerpo dentro del scrollport. |
| R2.2 conteo | ✅ `{seleccionadas.size} seleccionadas` (`:278`). |
| R2.3 `aria-live` en vivo | ✅ `<div className="flex items-baseline gap-2" aria-live="polite">` envuelve conteo + importe (`:277-280`). |
| R2.4 centavos BOB / es-BO / sin persistencia | ✅ `sumaMontosSeleccionados(transacciones, seleccionadas)` (`:116`) + `formatBs` (`:279`); `subtotal.test.ts` añade caso de 30 filas → `46500` → `465,00 Bs`. El subtotal no escribe: la persistencia solo ocurre en `confirmar()`. |

### 2.3 R3 — Acción Realizar (confirmación antes de escribir; PUT por id; toast e invalidación únicos)

| Comprobación | Resultado |
|---|---|
| R3.1/R3.2 botón con conteo y nombre accesible | ✅ `Realizar ({seleccionadas.size})` (`:304`) + `aria-label={`Realizar ${seleccionadas.size} transferencias seleccionadas`}` (`:301`); `disabled={!puedeRealizar(...)}` (`:300`). |
| R3.3 confirmación ANTES de cualquier escritura | ✅ `irAConfirmar()` (`:128-132`) solo cambia `paso` a `"confirmar"` y limpia `zoom`/`mensaje`; el texto `textoConfirmacion(n, subtotal)` incluye N y monto es-BO (`confirmacionRealizar.ts:6-8`). Ningún `PUT` ocurre hasta `confirmar()` (`:140-162`). |
| R3.4 un `PUT` por id, endpoint existente, sin bulk | ✅ `useMarcarRealizadas()` (`hooks.ts:436-457`): `realizarSeleccionados(ids, id => api.put<Transaccion>(`/transacciones/${id}/realizar`))`; `Promise.allSettled` (`:19`). `useMarcarRealizada()` (singular) queda intacto (`:415-429`); el guard `toHaveBeenCalledTimes(1)` + la ausencia de delegación lo verifican (`hooks.marcarRealizadas.test.ts:48,60-72`). Sin diff en `backend/`, migraciones ni contrato. |
| R3.5 estado de carga único | ✅ `marcar.isPending` controla `disabled` de Volver y Confirmar (`:316,324`), spinner `Loader2` (`:326-331`) y `aria-busy` en el footer (`:274`). |
| R3.6 una sola notificación + una sola ronda de invalidación | ✅ `onSuccess` (`hooks.ts:441-456`) emite **un** `toast.success`/`toast.error` y **4** `invalidateQueries` (una por prefijo `["splits"]`, `["split"]`, `["pagos"]`, `["historial"]` vía `invalidarHistorial`, `hooks.ts:310-312`). U3b/U3c corroboran `toastSuccess=1`, `toastError=1` y `CLAVES` exactas (`hooks.marcarRealizadas.test.ts:83,100`). |
| R3.7 ids fallidos en el mensaje | ✅ toast de error con `#id` (`:447-450`) y `role="status"` en el diálogo con la lista de `#id` (`:152-156`). |
| R3.8 limpieza / cierre / reintento | ✅ Éxito total → `alCambiarApertura(false)`, que reinicia selección, paso y mensaje (`:145-147`, `:67-74`). Fallo parcial → selección reducida a `idsParaReintento(resultado)` y `paso="confirmar"` (`:150-151`), diálogo abierto, segundo clic reenvía solo esos ids (`:141`). Coherente con D-PLAN-2 y con el «para poder reintentar» de R3.8. |
| R3.9 General por `es_general`, sin id 3 | ✅ `puedeRealizar` = `seleccionadas.size > 0 && cuenta.es_general !== true` (`confirmacionRealizar.ts:20`); ayuda visible `AYUDA_GENERAL` con `id` + `aria-describedby` (`:284-288`, `:302`). Guard de grep: la única ocurrencia de `=== 3` en `web/src/features/splits/` sigue siendo la preexistente `RealizarTxDialog.tsx:31`; `SplitsPage.tsx` no fue tocado. |

### 2.4 R4 — Gate AA duro §5 (detalle en §5)

Pasa 6/6 por revisión de código y tokens: targets ≥44 px, contraste AA de texto light/dark, foco
visible ≥3:1, orden de foco y triple Escape, nombres accesibles y `prefers-reduced-motion`. Ver §5.

### 2.5 R5 — Versión 0.4.1

| Archivo | Resultado |
|---|---|
| `web/package.json:4` | ✅ `"0.4.1"` |
| `web/package-lock.json:3` y `:9` | ✅ `"0.4.1"` en raíz y `packages[""]` (3 campos en total con package.json) |
| `README.md:64-65` | ✅ `0.4.1 — ver CHANGELOG.md`; aclara que 0.4.0 sigue en test3 y 0.4.1 sin deploy/tag/release |
| `CHANGELOG.md:9-17` | ✅ `## [0.4.1] - 2026-11-20` con **Corregido** y **Añadido** y la nota «sin tag ni release en GitHub» |
| `backlog/backlog.md` | ✅ ítem de release 0.4.1 y nota de que D6 queda supersedido solo por la acción Realizar; el fallback `id === 3` sigue registrado como deuda fuera de alcance |
| tag / release / deploy | ✅ `git tag -l` vacío; `deploy_approved: false` y `tag_or_release_approved: false` en `state.yaml`; sin `test3` |

### 2.6 Seguridad

- Gitleaks 1.25.1, **0 secretos** en `194841c..759d4d9` (reporte JSON/MD). Es el escáner primario
  según la skill `security-scanning`; los secretos expuestos son el único hard block y están ausentes.
- `semgrep`, `bandit`, `npm-audit`, `go-audit` → `tool_missing`. Por política global y por la skill,
  `tool_missing` es **advisory**, nunca prueba de limpieza ni hard block. `bandit` es además
  inaplicable (SAST de Python vs Go/TypeScript).
- El estado `SCAN → REVIEW` (`state.yaml:35`) documenta que el Markdown del reporte tuvo un filtrado
  literal de `backend/.env` y fue **redactado antes de cualquier commit**. Lectura íntegra de los dos
  archivos commiteados en `201df66`: solo texto de averías («no se inspeccionan ni reproducen
  valores»), sin valores. Escaneo adicional de patrones (credenciales en URL, `password/secret/token=`,
  AWS, JWT, Bearer, private key, hex-64) sobre todo el diff `194841c..201df66`: **0 coincidencias**.
- Revisión manual de los vectores nuevos: sin SQL, sin endpoints nuevos, sin llamadas a secretos, sin
  variables de entorno nuevas; `api.put` a ruta parametrizada por id numérico; módulos puros.
- El rango del reporte excluye el commit final `201df66`, que solo añade los propios reportes ya
  verificados por lectura → cobertura efectiva completa (ver I2).

### 2.7 Tests y comandos canónicos (ejecutados por este revisor)

| Comando | Resultado |
|---|---|
| `cd web && npm test` | ✅ **18 archivos, 187 tests en verde** (Vitest 5.0.0; 13.73 s) |
| `cd web && npx tsc -b` | ✅ exit 0 |
| `cd web && npm run build` | ✅ exit 0 (`tsc -b && vite build`; solo el warning de chunks >500 kB preexistente, ver A3) |
| Diseño de tests API | ✅ Los tests unitarios nuevos son puros / con mocks: `vi.mock("./api")` con `api.put` (sin BD) y mocks de `useMutation`, `toast`, `useQueryClient`. El PLAN define P1–P18 con `page.route()` para **todos** los GET/PUT y cero escrituras a BD (`plan.md:131`), acorde a la política §6:75. Sin Playwright en `package.json`. |

### 2.8 Arquitectura, dependencias y Git

| Comprobación | Resultado |
|---|---|
| Sin dependencias nuevas (policy §9) | ✅ El diff de `package-lock.json` solo cambia `version`; los módulos nuevos son funciones puras; no hay `npm install`, `go.mod` ni SQL. |
| Sin `.ai/` / `.opencode/` / registros de modelos / infra de agentes en commits de producto | ✅ `git diff --name-only 194841c..201df66` → solo `web/`, `README.md`, `CHANGELOG.md`, `backlog/` y `test-results/security/`; 0 coincidencias de infra interna. |
| Convención de commits | ✅ 3 commits, todos Conventional Commits en español: `feat(web): ...`, `docs: ...`, `test: ...`; autoría `Miky <miky@localhost>` (sin identidades fabricadas). |
| Rama pusheada / sin force-push | ✅ `HEAD` = `origin/fix/splits-ver-datos-realizar` = `201df66`, upstream configurado, sin divergencia; reflog lineal desde `194841c`, sin `forced update`. |
| Sin merge a `main`, tag, release ni deploy | ✅ Verificado (`git tag -l` vacío; `main` intacta; sin artefactos de deploy nuevos). |

---

## 3. Cobertura AC1–AC18 (base de suficiencia a nivel REVIEW)

| AC | Estado | Base |
|---|---|---|
| AC1 | PASS (código) | `max-h-[90dvh] overflow-y-auto` + scroll único; verificación de alcance del último renglón → P1 en TEST. |
| AC2 | PASS (código) | `90dvh` + centrado conservado; verificación de bounding box 375 px → P2 en TEST. |
| AC3 | PASS (código) | footer `sticky bottom-0` con contenedor `aria-live`; `isVisible` tras scroll → P3 en TEST. |
| AC4 | PASS (unitario) | `subtotal.test.ts` caso 30 filas + `formatBs` es-BO; actualización en vivo en `:277-280`; P4 en TEST. |
| AC5 | PASS (unitario + código) | `puedeRealizar` con `Set()` vacío → `false` (`confirmacionRealizar.test.ts:35`); `disabled={!habilitado}`. |
| AC6 | PASS (unitario + código) | `puedeRealizar` con selección → `true` (`:43`); etiqueta `Realizar (N)` + `aria-label`. |
| AC7 | PASS (código) | `irAConfirmar` sin escrituras; `textoConfirmacion` con N y monto; 0 PUT antes de Confirmar → P7 en TEST. |
| AC8 | PASS (unitario) | `realizarSeleccionados.test.ts` U1a + `hooks.marcarRealizadas.test.ts` U3a: un `put` por id con URL exacta; request log → P8 en TEST. |
| AC9 | PASS (unitario) | U3b/U3c: exactamente 1 toast y las 4 keys en una ronda; conteo de refetch → P9 en TEST. |
| AC10 | PASS (unitario + código) | U2c General → `false`; ayuda `AYUDA_GENERAL` visible y `aria-describedby`; guard de grep sin id 3 nuevo. |
| AC11 | PASS (código) | `alCambiarApertura(false)` limpia selección y cierra; refetch vía 4 invalidaciones → P11 en TEST. |
| AC12 | PASS (unitario + código) | U1b/U1c/U2b + mensaje con `#id`; reintento de fallidos en `confirmar()` → P12 en TEST. |
| AC13 | PASS (código) | Listener capture con prioridad zoom → confirmación → Radix; `inert`, `showCloseButton={!zoom}`, foco devuelto al QR → P13 en TEST. |
| AC14 | PASS (código) | Base `Button` con `max-md:min-h-11` (`button.tsx:7`) + `max-md:min-w-11` en los 4 botones; QR y Cerrar con ambos ejes; checkbox `max-md:size-11`. Medición → P14/aa-harness en TEST. |
| AC15 | PASS (código) | Orden DOM lista → subtotal → Cancelar/Realizar → Confirmar; foco programado al entrar/volver; nombres accesibles; → P15 en TEST. |
| AC16 | PASS (revisión de tokens) | ratios calculados de los tokens reales: ver §5. → P16/aa-harness en TEST. |
| AC17 | PASS (código) | `motion-reduce:animate-none` en `Loader2` (`:328`) y `motion-reduce:transition-none` en el QR (`:209`) → P17 en TEST. |
| AC18 | PASS | Los 3 campos de versión + README + CHANGELOG + backlog verificados; `git tag -l` vacío. |

**Conclusión AC:** suficiencia para APPROVED. Los AC que requieren medición en navegador quedan
correctamente diferidos a TEST (transición `REVIEW → TEST`); la implementación ya contiene los
mecanismos que los harán medibles (A4).

---

## 4. Hallazgos bloqueantes: **ninguno (0)**

No hay violación de arquitectura, política, SPEC o PLAN, ni riesgo de seguridad inaceptable que
exija devolver el ciclo a BUILD. **Required changes: ninguno.**

---

## 5. Gate AA duro — **PASS** (policy §5.1–5.6 / R4.1–R4.6)

| # | Punto duro | Resultado | Evidencia |
|---|---|---|---|
| 1 | Touch targets ≥44×44 px en móvil (incl. overlays) | ✅ | `button.tsx:7` (`max-md:min-h-11`) + `max-md:min-w-11` en Cancelar/Realizar/Volver/Confirmar; QR y Cerrar con `max-md:min-h-11 max-md:min-w-11` (`:209,356`); checkbox `max-md:size-11` y `Label` `max-md:min-h-11` (`:247,251`). |
| 2 | Contraste AA 4.5:1 / 3:1 en light y dark | ✅ | Tokens `index.css`: `muted-foreground` 0.556 (light) / 0.708 (dark), `popover` 1.0 / 0.205, `muted` 0.97 / 0.269, `ring` 0.556. Ratios calculados: texto/ayuda/conteo sobre `bg-popover` **4.73 light / 6.91 dark**; disabled sobre `bg-muted` **4.34 light / 5.83 dark** (ver A1). Sin `opacity-50` en texto gracias a `DESHABILITADO_LEGIBLE` (`:38-40`). |
| 3 | Foco visible ≥3:1 (WCAG 1.4.11) | ✅ | Ring `focus-visible:ring-3 ring-ring` de la base `Button`; QR `focus-visible:ring-2 ... ring-offset-2` + `max-md:ring-3` (`:209`); ratios ring/fondo: **4.73** sobre popover light, **4.34** sobre muted light, **3.79** sobre popover dark, **4.18** sobre background dark → todos ≥3:1. |
| 4 | Navegación por teclado, orden lógico, sin trampas; triple Escape | ✅ | Orden DOM lista → subtotal (no foco) → Cancelar/Realizar → Confirmar; foco a Confirmar al entrar y a Realizar al volver (`:105-114`); Escape capture: `zoom` → cierra lightbox, `paso==="confirmar"` → vuelve a selección (absorbido durante `isPending`), si no Radix cierra el diálogo (`:77-95`); un solo ámbito Radix, sin portales anidados (D-PLAN-2). |
| 5 | Nombre accesible en icon-only y campos | ✅ | QR `aria-label` (`:208`), Cerrar `aria-label="Cerrar"` (`:361`), Realizar `aria-label` (`:301`), checkbox con `id` + `<Label htmlFor>` (`:243-251`), ayuda con `id`/`aria-describedby`, resultado con `role="status"`, lightbox con `aria-label`/`aria-modal`. |
| 6 | `prefers-reduced-motion` | ✅ | `motion-reduce:animate-none` en `Loader2` (`:328`) y `motion-reduce:transition-none` en el botón QR (`:209`). |

Advisory (no bloquea, política §5): `WCAG AAA`, ARIA avanzado y lectores de pantalla completos.

---

## 6. Hallazgos no bloqueantes

| ID | Tipo | Ubicación | Detalle y decisión |
|---|---|---|---|
| **A1** | advisory (AA) | `CuentaDetalleDialog.tsx:38-40,291,298,314,322` | El texto del botón **deshabilitado** (`muted-foreground` sobre `bg-muted`) mide **4.34:1 en light**, 0.16 por debajo de 4.5. **No bloquea**: (i) WCAG 1.4.3 exime los controles inactivos; (ii) el PLAN M4/§8 prescribe **exactamente** esta pareja de tokens como mitigación frente a `opacity-50`; (iii) todo texto habilitado y la ayuda están en 4.73/6.91; (iv) el precedente del repo trata desvíos de token marginales como observación de design-system, no como fallo del gate duro. Recomendación para TEST: confirmar con `aa-harness.json`; si se quiere ≥4.5 estricto también en deshabilitados, usar `disabled:text-foreground` en un ciclo de design-system (no en este parche). |
| **A2** | advisory (seguridad) | `test-results/security/splits-ver-datos-realizar.{json,md}` | `tool_missing` de semgrep/bandit/npm-audit/go-audit → `complete_partial`. Advisory por política; sin dependencias nuevas ni superficie nueva; revisión manual documentada. Ejecutar SAST/dependency-audit cuando estén disponibles como endurecimiento de _backlog_. |
| **A3** | advisory (build) | `npm run build` | Warning de chunks >500 kB (`DashboardPage` 451 kB, `index` 517 kB). Preexistente y ajeno a este diff; code-splitting fuera de alcance. |
| **A4** | advisory (evidencia/TEST) | `test-results/splits-ver-datos-realizar/` y `test-results/tests/splits-ver-datos-realizar.json` | Aún no existen. Coherente con el estado `REVIEW` y con SPEC §8 (REVIEW aprueba; TEST produce 18/18 AC y evidencia). **TEST debe** generar `report.md`, `aa-harness.json`, `metrics.json`, hasta 3 capturas y el JSON agregado con `status: PASS`, `release_ready: true`, confirmando P1–P18 con `page.route()` y cero escrituras a BD. Requerido para MILESTONE_CHECK/DONE, **no para este veredicto**. |
| **I1** | info | `hooks.ts:441-455` | `onSuccess` emite 4 `invalidateQueries`; es «una ronda» (una llamada por prefijo), tal como D-PLAN-1 y U3b/U3c especifican, no una única llamada global. Sin contradicción con R3.6. |
| **I2** | info (seguridad) | `test-results/security/splits-ver-datos-realizar.json:4` | El rango escaneado es `194841c..759d4d9`; el commit final `201df66` solo añade los dos reportes de seguridad, leídos íntegramente por este revisor (sin valores) y cubiertos además por el escaneo de patrones de §2.6 → cobertura efectiva del rango completo `194841c..201df66`. |

**Recuento:** bloqueantes = **0**; no bloqueantes = **6** (A1–A4 advisory, I1–I2 info).

---

## 7. Re-verificación requerida

**Ninguna para este veredicto.** El bloque queda aprobado tal cual y la transición es
`REVIEW → TEST` (`approved: true`). Cualquier cambio de código posterior a `201df66` sí exigiría
re-review del diff afectado. La ejecución de SAST/dependency-audit y la medición real del harness AA
son checks de TEST/endurecimiento, no condiciones de esta aprobación. Sin deploy, tag ni release sin
autorización humana nueva.

---

## 8. Cierre

- **Verdict:** `APPROVED`
- **approved_for_test:** `true`
- **Gate AA duro (§5 / R4):** `PASS`
- **Bloqueantes (→ BUILD):** `0`
- **No bloqueantes:** `6` (A1–A4, I1–I2)
- **Hard block de seguridad:** `No` — 0 secretos, filtrado redactado pre-commit, sin vulnerabilidad crítica.

Ruta de este artefacto: `test-results/splits-ver-datos-realizar/review.md` (sin commitear).
