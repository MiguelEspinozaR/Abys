# Test — ajustes-registrar-splits

| Campo | Valor |
|---|---|
| Decisión | **PASS** — AC1–AC17 en verde; gate AA duro (policy §5) en verde |
| Ejecutor | tester (opencode/big-pickle) |
| Fecha | 2026-11-20 |
| Rama | `feat/ajustes-registrar-splits` @ `a6f9c81ad28ddd54e3b671fda03c5ca8a893fffd` |
| `release_ready` | **`true`** (verificación; deploy a `test3` queda fuera del alcance del tester) |
| RESULTADO | `test-results/tests/ajustes-registrar-splits.json` |
| Evidencia AA | `test-results/ajustes-registrar-splits/aa-harness.json` |
| Métricas | `test-results/ajustes-registrar-splits/metrics.json` |

## Resumen

La matriz completa de comandos pasó sin skips; las integraciones con `abys_test` se ejecutaron con
`DB_PASSWORD` tomado de `backend/.env` sin imprimir secretos. El harness funcional cubrió 15/15
comprobaciones (AC1–AC13, incluido el payload AC9) y el harness AA cubrió 16/16 combinaciones más la
secuencia anidada `Dialog → lightbox`, sin fallos de los seis controles duros de la política §5.
No se modificó código de producto, `.ai/`, `.opencode/` ni historial de Git: los únicos cambios en el
árbol son los cuatro artefactos de evidencia, sin commitear. No se hizo deploy ni tag.

**AC fallidos: ninguno.** Cobertura: no se ejecutó medición de cobertura ni se aplicó umbral; la
evidencia se limita a resultados de suites y al gate AA.

## Entorno

- Frontend: `http://127.0.0.1:5178` (`vite preview --port 5178 --strictPort`), build de `web/dist`
  posterior a la fuente más reciente (17:26 vs 17:19:44) y con marcadores del bloque presentes.
- Backend de auditoría: `http://127.0.0.1:8082` (`/opt/abys-invest/bin/api`). `GET /api/v1/health` y
  `GET /api/v1/settings/registrar` respondieron 200 por `curl` (solo lectura real).
- Playwright del entorno: `channel: 'chrome'`, paquete cacheado fuera del repo
  (`/home/miky/.npm/_npx/e41f203b7505f1fb/node_modules/playwright`). **No** se añadió dependencia a
  `web/package.json`. Sin screenshots: todas las métricas son valores numéricos en JSON.
- Todas las rutas `**/api/v1/**` fueron interceptadas con `page.route()` antes de navegar. Los GET se
  sirvieron con fixtures deterministas; los writes esperados (POST /pagos, POST comprobante, PUT
  settings) se simulaban; cualquier otro write recibía `599 HARNESS_BLOCKED_WRITE`. No se registró
  ningún write inesperado (`unexpectedWrites: []` en todos los escenarios).
- Observación de entorno: el build servido en `:5178` conserva la base por defecto
  `http://localhost:8080/api/v1` en el bundle. Como toda llamada API fue interceptada, **no se
  contactó** `:8080`, `:8081`, `:5173` ni `test3`. La comprobación real de solo lectura se hizo contra
  `:8082` con `curl`, según policy §6.

## Comandos canónicos (AC15)

| Comando (cwd) | Resultado | Evidencia |
|---|---|---|
| `set -a && . ./.env >/dev/null 2>&1 && set +a && go vet ./...` (`backend`) | PASS, exit 0 (10.876 s cadena backend) | `/tmp/opencode/m7-logs/{backend-chain,go-vet}.log` |
| `go test ./... -count=1` (`backend`, `DB_NAME=abys_test`, sin `ABYS_SKIP_INTEGRATION`) | PASS, 6 paquetes `ok`, 0 SKIP | `/tmp/opencode/m7-logs/go-test.log`, `go-test-verbose.log` |
| `go build -o /tmp/opencode/abys-server ./cmd/server` (`backend`) | PASS, exit 0 | `/tmp/opencode/m7-logs/go-build.log` |
| `npx --no-install tsc -b` (`web`) | PASS, log vacío | `/tmp/opencode/m7-logs/web-tsc.log` |
| `npm test` (`web`) | PASS, 15 archivos / 173 tests, 12.37 s | `/tmp/opencode/m7-logs/web-npm-test.log` |
| `npm run build` (`web`) | PASS (79.931 s cadena web) | `/tmp/opencode/m7-logs/web-npm-build.log` |

Tests DB-backed nombrados en verde: `TestMigration000006Backfill`, `TestSettingsRegistrarEndpoints`,
`TestPagoRepoMontoPorDia`, `TestIntegrationAPI`, `TestDashboardContracts`,
`TestSplitPendienteExcluyeGeneralHTTP`; también `TestTotalesSplit` y la batería `splitcalc`/`service`.
Targeted adicional: `vitest run pagoPayload fuentesDots subtotal settingsFallback filtrosUrl` →
5 archivos / 52 tests PASS (`/tmp/opencode/m7-logs/web-targeted.log`).

Guardas estáticos: `navigate("/ingresos")` → 0; `bg-violet-500` en `features/registrar` → 0;
`/realizar` en `features/splits` → 0; `es_general` en `SplitsPage.tsx` → líneas 67 y 196; versión
`0.4.0` en `package.json` y en ambos campos de `package-lock.json`; `git tag -l` → vacío.

## Targeted tests (Playwright, harness del entorno)

Harness funcional: 15/15 comprobaciones PASS (`AC1`, `AC9`, `AC2-retry`, `AC2-volver`, `AC3`, `AC4`,
`AC5`, `AC6`, `AC7`, `AC7-redondeo-local`, `AC8`, `AC13`, `AC10`, `AC11`, `AC12`).
Harness AA: 16/16 combinaciones PASS + `nestedKeyboard` PASS. Detalles en los JSON de evidencia.

## Matriz AC1–AC17

| AC | Veredicto | Evidencia |
|---|---|---|
| AC1 | PASS | `/registrar` tras guardar, formulario limpio, toast `Pago registrado`; `test-results/tests/ajustes-registrar-splits.json::checks::AC1` |
| AC2 | PASS | Fallo de comprobante y las dos salidas (`Reintentar`, `Volver a registrar`) permanecen en `/registrar`; 1 POST, 2 uploads; `grep` 0 navegaciones; `AC2-retry`, `AC2-volver` |
| AC3 | PASS | Día 15 con 5 fuentes → exactamente 3 puntos (rojo/azul/verde de mayor monto) y `sr-only "Fuentes: Athena, Essencia, Malnova"`; desempate por `fuente_id` en día 10; `AC3` + `fuentesDots.test.ts` |
| AC4 | PASS | Verde (`bg-emerald-500`) y ámbar (`bg-amber-500`) presentes; morado `#7c3aed` ausente; leyenda con 5 fuentes + verde + ámbar; `AC4` + guard `bg-violet-500=0` |
| AC5 | PASS | `/ingresos → Editar pago #101` renderiza calendario `Días trabajados` sin `Fuentes:` ni swatches; `AC5` |
| AC6 | PASS | Dos PUT a `/settings/registrar` y réplica `abys-ui` `transaccion/detallado`; `TestSettingsRegistrarEndpoints`, `filtrosUrl.test.ts`, `AC6` |
| AC7 | PASS | GET 503 → `efectivo/detallado` locales; GET split 503 → `Preciso (centavos)` local; `settingsFallback.test.ts`, `AC7`, `AC7-redondeo-local` |
| AC8 | PASS | Arranque con `QR`, `Distribuido` y `Enteros (1 Bs)` del backend; `#modo-redondeo` cambiable a `Preciso (centavos)`; `AC8` |
| AC9 | PASS | Payload `fuente_id,fecha_pago,metodo_pago,notas,dias_trabajados` sin campo de modo y con `monto_enteros` por día; `pagoPayload.test.ts`, `AC9` |
| AC10 | PASS | `Ver datos` de Cuenta Ahorros: 1 checkbox sin marcar, sin botón `Realizar`, 0 writes; `AC10` |
| AC11 | PASS | Subtotal `0 → 150,00 → 0 Bs`, se reinicia al reabrir, sin persistencia ni writes; `subtotal.test.ts`, `AC11` |
| AC12 | PASS | Lightbox `QR ampliado`, botón `Cerrar` 44×44, cierra con Escape y clic fuera sin cerrar el Dialog; `AC12`, `aa-harness.json::nestedKeyboard` |
| AC13 | PASS | `Pendiente total 220,00 Bs`, tarjeta `220,00 Bs`, fila General `· reserva` con `0,00 Bs` visible; `TestSplitPendienteExcluyeGeneralHTTP`, `TestTotalesSplit`, `AC13` |
| AC14 | PASS | Gate §5: 16/16 combinaciones AA + anidado; 324 muestras de foco mínimo 3.19; 0 fallos de touch móvil/overlay; `aa-harness.json`, `metrics.json` |
| AC15 | PASS | Todas las suites de la matriz en verde, sin SKIP; ver tabla de comandos |
| AC16 | PASS | Los 4 artefactos exigidos existen y están sin commitear |
| AC17 | PASS | `0.4.0` en CHANGELOG/README/package/package-lock, docs y backlog actualizados en `HEAD`; **sin tag**; `git show --stat HEAD` |

## Gate AA (AC14) — detalle

- Touch targets ≥44×44 en móvil (390×844) y en overlays: 0 fallos. Controles nuevos medidos:
  `#fuente` 176.3×44, `#modo-redondeo` 326×44, selects de configuración 326×44, opciones de popup
  321×44, checkbox 44×44, botón QR 176×176, cierre del dialog 44×44, cierre del lightbox 44×44.
- Contraste de texto AA light/dark: 0 fallos en las 16 combinaciones.
- Foco visible ≥3:1: 324 muestras, mínimo **3.19**, máximo 20.43, 0 fallos.
- Teclado sin trampas: 0 trampas en rutas; popup con Escape devuelve el foco al trigger; Dialog con
  Escape devuelve el foco a `Ver datos`; lightbox con Escape cierra solo el lightbox y devuelve el
  foco al botón QR, dejando el Dialog operativo (`nestedKeyboard` PASS).
- Nombres accesibles: 0 fallos. `prefers-reduced-motion`: 0 elementos ofensores en las 16
  combinaciones.
- Contraste de borde de componentes UI: 97 mediciones advisory en 16 combinaciones. **No bloquea**:
  no figura en los seis puntos duros de policy §5 (se reporta como observación, como en evidencias
  previas). Ver `aa-harness.json::advisoryUiFailures`.

## Incidencias y observaciones

1. **Ningún AC fallido.** Los resultados funcionales no reportaron errores de
   consola/pageerror/requestfailed; los writes inesperados fueron 0.
2. Adicionales diferidos (preexistentes, fuera del alcance; **no bloquean**):
   - `guardadoRef` permanece `true` después de guardar (`RegistrarPage.tsx:379`, `:170`).
   - `RealizarTxDialog.tsx:31` conserva el fallback `cuenta?.es_general ?? transaccion.cuenta_id === 3`.
3. Durante una corrida intermedia del AA se midieron 43.1 px en el checkbox y en el cierre del
   Dialog por capturar la geometría mientras aún corría la animación de apertura de Radix. El harness
   añadió una espera de 600 ms tras abrir el overlay; la corrida final registró 0 fallos de touch.
   No se modificó código de producto.
4. Deploy a `test3` y tag/release siguen fuera del alcance de esta entrega; `release_ready` refleja
   únicamente el resultado de la verificación.

## Artefactos

- `test-results/ajustes-registrar-splits/report.md`
- `test-results/ajustes-registrar-splits/aa-harness.json`
- `test-results/ajustes-registrar-splits/metrics.json`
- `test-results/tests/ajustes-registrar-splits.json`
