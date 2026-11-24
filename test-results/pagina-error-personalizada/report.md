# M3 — Evidencia y validación — `pagina-error-personalizada`

- **Repo:** `/home/miky/Documentos/finanzasMikyGoRef`
- **Rama:** `fix/pagina-error-personalizada`
- **HEAD validado:** `a0384dcddf6b10f5f05ee5d674dc4db3e31d8a52` (corto `a0384dc`; leído desde `.git/refs/heads/...`, sin comandos Git)
- **Fecha:** 2026-11-24
- **Modo:** TEST / solo lectura de código. **No se ejecutó ningún comando Git** (`add`, `commit`, `push`, `switch`, `restore`, `status`, `diff`...), **no se hizo deploy**, **no se escribió en BD** y **no se tocó `.ai/`, `.gitattributes` ni `graphify-out/`**.
- **Código fuente:** sin modificaciones. Únicas escrituras: `test-results/pagina-error-personalizada/` y `test-results/tests/pagina-error-personalizada-m3.json` (más limpieza de snapshots temporales propios de `web/.playwright-cli/`).
- **Veredicto:** **PASS** — AC1–AC7 PASS; gate AA §5 **6/6**.
- **`release_ready`: false** — no hay deploy ni merge autorizados; M4 (seguridad/review) y M5 (entrega) siguen pendientes.

---

## 1. Comandos canónicos y targeted

Ejecutados en el orden indicado, con `workdir=web`. Salida exacta en `logs/`.

| # | Comando | Exit | Resultado |
|---|---|---:|---|
| 1 | `cd web && npx tsc -b` | 0 | Sin salida (compilación limpia). Log vacío: `logs/01-web-tsc.log` |
| 2 | `cd web && npm test` | 0 | `Test Files 19 passed (19)` · `Tests 197 passed (197)` · `Duration 14.31s` · Vitest 5.0.0 |
| 3 | `cd web && npm run build` | 0 | `✓ 3285 modules transformed` · `✓ built in 22.11s` · aviso no bloqueante de chunks >500 kB |
| 4 | `cd web && npx vitest run src/lib/errorChunk.test.ts` (targeted, AC3) | 0 | `Test Files 1 passed (1)` · `Tests 10 passed (10)` · `Duration 860ms` |

Salidas 2–4: `logs/02-web-npm-test.log`, `logs/03-web-npm-build.log`, `logs/04-errorChunk-targeted.log`.

**Cobertura:** no se midió. `web/package.json` no define proveedor ni script de cobertura y la política no fija un umbral para esta feature; se reporta únicamente el resultado de tests (197/197). No se inventa ningún umbral.

**Aviso no bloqueante:** el build emite `(!) Some chunks are larger than 500 kB after minification`. El mayor es `dist/assets/index-DhXJHeAm.js` (526.65 kB; gzip 168.62 kB); `DashboardPage-CZUIAnt7.js` queda en 451.55 kB. El build termina con exit 0; no se cambió la configuración de bundle (fuera del alcance aprobado).

---

## 2. AC1–AC7

| AC | Estado | Notas y evidencia |
|---|---|---|
| **AC1** | **PASS** | `web/src/router.tsx:29-34`: `conError()` envuelve `conSuspense()` y añade `errorElement: <RouteErrorPage />`; `RouteErrorPage` (`:23-26`) usa `useRouteError()` y pasa el error a `<ErrorPage error={error} />`. Las 6 rutas lazy (`:41-46`: index, registrar, ingresos, splits, configuracion, health) usan `conError` dentro de `element: <AppLayout />` (`:37-49`). Raíz y wildcard `*` intactos (`:47` sigue `<Navigate to="/" replace />`). Runtime: se forzó el fallo del chunk en `/` y en `/registrar` con route 404 local; en ambos aparece la ErrorPage dentro de `main[aria-label="Contenido principal"]` con la navegación de `AppLayout` presente. |
| **AC2** | **PASS** | `web/src/App.tsx:7-9` envuelve `<RouterProvider router={router} />` con `<AppErrorBoundary>`. `AppErrorBoundary.tsx` es class component con `getDerivedStateFromError` (`:19-21`), `componentDidCatch` (`:23-25`) y renderiza `<ErrorPage error={this.state.error} />` (`:27-31`) sin hooks de router. Verificación **estática**; no se inyectó un error de render artificial porque eso exigiría modificar código fuente (prohibido en esta corrida). |
| **AC3** | **PASS** | `errorChunk.ts:10-34` clasifica los 3 patrones (incluido el mensaje real del incidente `Failed to fetch dynamically imported module: https://test3.../DashboardPage-DrclDJxr.js`) y `mensajeErrorCarga` devuelve solo el copy aprobado (`:37-52`), reutilizando `MENSAJE_ERROR_GENERICO`; no expone `stack`, URL ni variables internas. `errorChunk.test.ts:17-23` cubre el mensaje real; `:50-60` verifica que no aparezcan `DashboardPage`, `router.tsx` ni `    at `. 10/10 targeted y 197/197 suite completos. |
| **AC4** | **PASS** | `ErrorPage.tsx:16`: `onReintentar ?? (() => window.location.reload())`; prueba funcional con marcador en `window`: tras clic en Reintentar el marcador desaparece (documento nuevo) y, con la route 404 todavía activa, vuelve la pantalla de error. Enlace `<a href="/">Ir al inicio</a>` (`:46-52`); clic y `Enter` teclado llevan a `/` y también recargan el documento. Ambos controles con `max-md:min-h-11 max-md:min-w-11` (`:42`, `:49`). |
| **AC5** | **PASS** | Gate AA §5 **6/6** en light, dark y móvil (390×844). Detalle completo en `aa-gate.json`; mínimos: contraste 4.54:1, targets 310×44 px, anillo de foco 3.07:1, teclado sin trampas, nombres accesibles y reduced-motion con duraciones ~0. Adicionalmente se verificó `/registrar` con el mismo fallo forzado. |
| **AC6** | **PASS** | Los 3 comandos canónicos pasan. `web/package.json` declara las mismas dependencias del stack aprobado; no hay `playwright`/`puppeteer` en dependencias (Playwright se usó desde el entorno con `npx --no-install`; en el lockfile solo aparece `@vitest/browser-playwright` como peer opcional de Vitest, sin import en producto). No se modificaron `deploy.sh`, `status.sh`, `stop.sh`, nginx/systemd/Cloudflare ni cabeceras de caché. Búsqueda literal de patrones de secretos en los 6 archivos de producto implicados y en los artefactos generados: 0 coincidencias. Verificación **estática** de este AC porque estaba prohibido ejecutar Git/diff. |
| **AC7** | **PASS** | Evidencia versionada en `test-results/pagina-error-personalizada/`: `report.md`, `metrics.json`, `aa-gate.json`, `logs/` (4 logs) y 2 capturas clave (`screenshots/error-desktop-dark.png`, `screenshots/error-mobile-dark.png`). Resumen estructurado en `test-results/tests/pagina-error-personalizada-m3.json`. |

---

## 3. Gate AA §5 (detalle)

| # | Criterio | Resultado | Medición |
|---|---|---|---|
| 1 | Targets ≥44×44 móvil | PASS | Reintentar 310×44; Ir al inicio 310×44; botones icon-only de la barra 44×44 |
| 2 | Contraste AA light/dark | PASS | Light: h1 4.77, descripción 4.54, botón 17.18, enlace 19.80. Dark: h1 6.21, descripción 5.23, botón 14.23, enlace 13.94 |
| 3 | Foco visible ≥3:1 | PASS | Anillo 3px `oklch(0.556 0 0)` → rgb(115,115,115): dark 3.76 (botón) / 3.07 (enlace); light 3.78 / 4.74 |
| 4 | Teclado sin trampas | PASS | Tab: h1 (foco al montar) → Reintentar → Ir al inicio → fin; Shift+Tab reversible; Enter activa el enlace |
| 5 | Nombre accesible | PASS | `heading level 1`, `button "Reintentar"`, `link "Ir al inicio" href="/"`; sin controles icon-only nuevos |
| 6 | `prefers-reduced-motion` | PASS | `animation-name: none`; duraciones 1e-05s en h1 y ambos controles |

Nota advisory (no bloqueante): el `<h1 tabIndex={-1}>` recibe foco programático al montar y declara `outline-none` con clases `focus:outline-*`, por lo que su `outline-style` calculado es `none`; al no ser tabulable no le aplica WCAG 2.4.7, y los dos controles tabulables sí muestran anillo visible ≥3:1. No se cambió código por tratarse de un hallazgo advisory fuera del alcance de M3.

---

## 4. Método, límites y alcances no ejecutados

- El error de chunk se reprodujo de verdad en el navegador interceptando las peticiones de los chunks lazy con `playwright-cli route ... --status=404` contra el servidor Vite local preexistente en `http://127.0.0.1:5178` (no se inició ni detuvo servidor alguno). No se contactó `test3.mikylab.com`, producción ni ningún backend.
- Tipos de error simulados: `Failed to fetch dynamically imported module` en `/` y `/registrar`. No se necesitó harness adicional ni dependencias nuevas.
- No se añadieron capturas masivas: solo 2 PNG clave.
- No se pudo usar `graphify query` porque el CLI `graphify` no está disponible en este entorno (`command not found`); se sustituyó por lecturas focalizadas de los archivos implicados. **`graphify-out/` no fue tocado**.
- No se ejecutaron deploy, tag, release, merge, escrituras a BD ni comandos Git. M4 (seguridad y review) y M5 (entrega) quedan para sus executors autorizados.

---

## 5. Veredicto

`overall = PASS`, `ac_pass = 7`, `ac_fail = 0`, `ac_not_verifiable = 0`, `aa_gate = 6/6`, `release_ready = false` (sin deploy ni merge autorizados). Solo el aviso advisory de bundle >500 kB, que no bloquea.
