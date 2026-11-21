# Report — validación final 0.4.1 · `splits-ver-datos-realizar`

| Campo | Valor |
|---|---|
| Rol | `tester` |
| Feature / ciclo | `splits-ver-datos-realizar` / `0.4.1` |
| Commit validado | `83afd2f4655e4509e841b25ac89e8c91ae7928d9` |
| Rama | `fix/splits-ver-datos-realizar` |
| SPEC | `.ai/specs/splits-ver-datos-realizar/spec.md` — AC1–AC18 |
| PLAN | `.ai/plans/splits-ver-datos-realizar/plan.md` §5 — U1–U4, P1–P18 |
| Política | `.ai/policies/project-policy.md` §3, §5, §6, §7, §9 |
| Veredicto | **PASS** — 18/18 AC, 18/18 P, gate AA §5 PASS |
| `release_ready` | **true** (preparado; **sin deploy, tag ni release**) |
| Mutaciones | Ninguna: sin Git write, sin `.ai/`, sin código de producto, sin dependencias |

> Este artefacto y el resto de la evidencia quedan **sin commitear**. No se ejecutó `deploy.sh`,
> `git tag`, `git commit`, `git push` ni merges.

---

## 1. Comandos canónicos (ejecutados exactamente)

```bash
cd web && npx --no-install tsc -b && npm test && npm run build
cd backend && go test ./...
```

| Comando | Resultado | Detalle |
|---|---|---|
| `npx --no-install tsc -b` | ✅ PASS (exit 0) | Sin diagnósticos. |
| `npm test` | ✅ PASS | Vitest 5.0.0 — **18 archivos, 187 tests** en verde (13.18 s). Incluye U1 `realizarSeleccionados.test.ts`, U2 `confirmacionRealizar.test.ts`, U3 `hooks.marcarRealizadas.test.ts`, U4 `subtotal.test.ts` + `format.test.ts`. |
| `npm run build` | ✅ PASS | `tsc -b && vite build`: 3281 módulos, `dist/` generado en 20.78 s. Único warning: chunks >500 kB (`index` 516.95 kB, `DashboardPage` 451.55 kB), **preexistente** y ajeno al diff (REVIEW A3). |
| `go test ./...` | ✅ PASS (regresión) | Entorno listo (go1.26.8, PostgreSQL y backend escuchando): `database`, `handler`, `repository`, `router`, `service`, `splitcalc` → `ok`; `cmd/server`, `docs`, `apperr`, `config`, `middleware`, `model` → sin tests. Sin fallos. |

No se registró ningún fallo de comando; por tanto no hay regresión que reportar como omitida.

---

## 2. Metodología del harness (P1–P18)

- SPA compilada servida localmente: `npx --no-install vite preview --host 127.0.0.1 --port 5178 --strictPort` sobre `web/dist/`.
- Navegador: harness del entorno `playwright-cli` vía `npx --no-install playwright cli`, **`--browser=chrome`** (UA `HeadlessChrome/158`). Sin dependencia npm nueva.
- **Todas** las peticiones API `GET`/`PUT` se interceptan con `page.route('**/*')`:
  - `/api/v1/**` → respuestas mock (30 pendientes en cuenta 11; 2 en General id 3 con `es_general: true`; `/fuentes`, `/pagos`, `/dashboard/history`, `/settings/*`, `/health/db`);
  - `/uploads/*` → PNG 1×1 en línea;
  - cualquier otro origen → `route.abort()`.
- **Cero conexiones a PostgreSQL y cero peticiones reales al backend.** El contador `externalAborted` y `apiUnknown` quedó en 0 en cada escenario. El único error de consola del harness es el 500 **forzado** del escenario P12 (esperado).
- Fixture: 30 × 15500 centavos → subtotal de 3 = `465,00 Bs` (es-BO, `Intl`).

Scripts y salidas crudas: `test-results/splits-ver-datos-realizar/harness/*.cjs` y `harness/results/*.json`.

---

## 3. Matriz AC1–AC18

| AC | Veredicto | Verificación (P/U) | Evidencia clave |
|---|---|---|---|
| AC1 | **PASS** | P1 | 30 renglones; `scrollHeight=2444 > clientHeight=648`; `scrollTop` 0→1796 (=máximo); último renglón visible y dentro del diálogo. |
| AC2 | **PASS** | P2 | 375×812: diálogo `{x:16,y:40.6,w:343,h:730.8}` dentro del viewport; `PageDown`×3 → 1848, `End` → 2385 (=máximo); sin recorte. |
| AC3 | **PASS** | P3 | Tras scroll: footer visible en `y=583..668` (16 px de padding hasta el borde del diálogo); `3 seleccionadas 465,00 Bs` visible; `aria-live="polite"`. |
| AC4 | **PASS** | U4 + P4 | 3 → `465,00 Bs`; 2 → `310,00 Bs`; 3 → `465,00 Bs`; formato es-BO y región `aria-live` verificadas. |
| AC5 | **PASS** | U2 + P5 | 0 seleccionadas → `Realizar (0)` deshabilitado, `aria-label="Realizar 0 transferencias seleccionadas"`. |
| AC6 | **PASS** | U2 + P6 | 3 seleccionadas → habilitado, `Realizar (3)`, `aria-label` con el conteo. |
| AC7 | **PASS** | U2 + P7 | Confirmación `Marcar 3 transferencias por 465,00 Bs?`; **0 PUT** y 0 toasts antes de Confirmar. |
| AC8 | **PASS** | U1/U3 + P8 | `PUT /api/v1/transacciones/{1001,1002,1003}/realizar`, exactamente una vez por id, sin bulk ni duplicados. |
| AC9 | **PASS** | U3 + P9 | **1** toast (`3 transacciones marcadas como realizadas`); una sola ronda de invalidación: `["splits"]`, `["split"]`, `["pagos"]`, `["historial"]` (U3b/U3c) → en navegador solo +1 GET por query activa (`splits`, `pagos`), estable tras 900 ms; sin segunda ronda. |
| AC10 | **PASS** | U2 + P10 | General (`es_general`): `Realizar (2)` deshabilitado, ayuda visible con `aria-describedby=ayuda-general-3`, **0 PUT** tras click programático. |
| AC11 | **PASS** | P11 | Éxito total → diálogo cerrado; al reabrir `0 seleccionadas`, Realizar deshabilitado y 27 filas (lista refrescada vía mock). |
| AC12 | **PASS** | U1/U3 + P12 | 500 forzado en `#1002`: toast `2 de 3 ... Fallaron: #1002`, `role="status"` con el id, diálogo abierto, reintento envía **solo** `[1002]` y cierra. |
| AC13 | **PASS** | P13 | QR → lightbox `role=dialog aria-modal=true`; cuerpo y footer `inert`; Escape cierra lightbox → confirmación → diálogo; Escape absorbido con `aria-busy=true`; clic fuera cierra lightbox. |
| AC14 | **PASS** | P14 | 375 px: targets 44–176 px en ambos ejes (Realizar, Confirmar, Volver, Cancelar, QR, checkbox, Cerrar). |
| AC15 | **PASS** | P15 | Orden: checks → Cancelar → Realizar → Close → QR → wrap; en confirmación checks → Volver → Confirmar; focus automático en Confirmar; `ariaSnapshot` y nombres accesibles correctos. |
| AC16 | **PASS** | P16 + tokens | AA §5 en light/dark: texto normal 4.742–19.798 (light), 6.939–17.176 (dark); foco 4.742 / 3.781 (≥3:1). Advisory ADV-1: deshabilitado light 4.349 (exento, REVIEW A1). |
| AC17 | **PASS** | P17 | `prefers-reduced-motion: reduce`: spinner `animation-name: none`, QR `transition-property: none`, animación del diálogo con duración `1e-05s`. |
| AC18 | **PASS** | script §5 | `0.4.1` en `web/package.json:4`, `web/package-lock.json:3` y `:9`, `README.md:64`, `CHANGELOG.md:9`; lista de tags vacía. |

**Recuento:** 18 PASS / 0 FAIL. Equivalente P1–P18: 18 PASS / 0 FAIL.

---

## 4. Gate de accesibilidad (política §5, duro)

`PASS (6/6)`. Detalle completo en `aa-harness.json`:

1. Touch targets ≥44×44 px en móvil y overlay — PASS.
2. Contraste AA light/dark — PASS para texto habilitado, ayuda y confirmación.
3. Foco visible ≥3:1 — PASS (4.742 light / 3.781 dark).
4. Teclado, orden y sin trampas — PASS; triple Escape con prioridad y absorción durante `isPending`.
5. Nombres accesibles — PASS (QR, Realizar, Cerrar, checkboxes, ayuda, subtotal y resultado).
6. `prefers-reduced-motion` — PASS.

**ADV-1 (advisory, no bloquea):** el texto de `Realizar` deshabilitado en light mide **4.349:1** sobre `bg-muted`. WCAG 1.4.3 exime controles inactivos; es la pareja de tokens prescrita por PLAN M4/§8 y ya registrada como REVIEW A1. No se introdujo ningún umbral nuevo.

---

## 5. AC18 — versión y tags

| Archivo / comprobación | Resultado |
|---|---|
| `web/package.json:4` | `"version": "0.4.1"` |
| `web/package-lock.json:3` y `:9` | `"version": "0.4.1"` (raíz y `packages[""]`) |
| `README.md:64` | `0.4.1 — ver CHANGELOG.md` |
| `CHANGELOG.md:9` | `## [0.4.1] - 2026-11-20` (Corregido / Añadido, sin tag ni release) |
| Tags | 0. `git tag -l` no fue ejecutable por política de permisos de la herramienta; se verificó con los equivalentes de plomería `git for-each-ref --format='%(refname)' refs/tags` y `git show-ref --tags`, ambos vacíos, además de `.git/refs/tags/` vacío y sin `refs/tags` en `packed-refs`. |

---

## 6. Evidencia

- `test-results/splits-ver-datos-realizar/report.md` (este archivo)
- `test-results/splits-ver-datos-realizar/aa-harness.json`
- `test-results/splits-ver-datos-realizar/metrics.json`
- `test-results/splits-ver-datos-realizar/01-lista-larga-subtotal.png`
- `test-results/splits-ver-datos-realizar/02-confirmacion.png`
- `test-results/splits-ver-datos-realizar/03-movil.png`
- `test-results/tests/splits-ver-datos-realizar.json`
- Raw: `test-results/splits-ver-datos-realizar/harness/results/*.json`, scripts en `harness/*.cjs`, logs en `logs/`
- Preexistente (no generado en TEST): `test-results/splits-ver-datos-realizar/review.md`, `test-results/security/splits-ver-datos-realizar.{json,md}`

---

## 7. Cierre

No hay fallos: ni en comandos canónicos, ni en P1–P18, ni en el gate AA. No se deployó, tagueó ni liberó. Todos los artefactos de esta validación permanecen sin commitear.
