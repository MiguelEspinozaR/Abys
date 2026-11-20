# Review — ajustes-registrar-splits

| Campo | Valor |
|---|---|
| **Verdict** | **APPROVED** |
| Reviewer | reviewer (opencode/big-pickle) |
| Fecha | 2026-11-20 |
| Rama / HEAD | `feat/ajustes-registrar-splits` @ `d8a614889319a4d390ccf29d1f5c6f6bf62beb9a` |
| Alcance | diff `main..HEAD` (8 commits) vs SPEC R1–R7 / D1–D8 / AC1–AC17 / §5, PLAN §3–§5, policy §5/§6/§7/§9/§10 |
| Hallazgos bloqueantes | **0** |
| Hallazgos no bloqueantes | **7** (6 advisory + 1 info) |
| Gate AA duro (policy §5) | **PASS** (6/6 puntos, 16 combinaciones + anidado) |
| Secretos expuestos (hard block por defecto) | **Ninguno** (Gitleaks 0 en 7 commits de código) |

> Decisión tomada de forma explícita por Review; no se difiere al orquestador. No se mutó código,
> historial Git ni `.ai/runtime/state.yaml`. No se imprimieron valores secretos. El único cambio
> en el árbol es este artefacto.

---

## 1. Veredicto y justificación

`APPROVED`. La implementación satisface los 17 criterios de aceptación con evidencia suficiente,
cumple el gate duro de accesibilidad de la política §5, respeta la arquitectura (contratos backend
antes que consumidores, sin dependencias nuevas, sin infraestructura de agentes en commits de
producto), respeta la política de Git (rama de feature, Conventional Commits, sin tag/release/merge)
y cierra SemVer `0.4.0` de forma coherente. No hay secretos expuestos ni vulnerabilidad crítica; los
caveats de herramientas ausentes y las tres advisories se aceptan como **no bloqueantes** con el
racional documentado en §4. No existe ninguna violación de SPEC, PLAN, política ni arquitectura que
exija rechazo.

---

## 2. Tabla AC1–AC17

| AC | Veredicto | Base de evidencia (suficiencia) |
|---|---|---|
| AC1 | PASS | Playwright `checks::AC1`: URL `/registrar`, form limpio, toast `Pago registrado`. Código: `finalizarGuardado→limpiarFormulario` sin `navigate`. |
| AC2 | PASS | `AC2-retry` + `AC2-volver` (URL `/registrar` en fallo de comprobante y en ambas salidas, 1 POST / 2 uploads, sin re-POST) + `git grep navigate("/ingresos")=0`. |
| AC3 | PASS | `AC3`: 5 fuentes → exactamente 3 swatches por mayor monto, desempate `fuente_id`, `sr-only` con aliases; `fuentesDots.test.ts` (top3, desempate, acumulación, fallback). |
| AC4 | PASS | `AC4`: verde/ámbar presentes, `#7c3aed` ausente, leyenda con 5 fuentes + verde + ámbar; `git grep bg-violet-500 (registrar)=0`. |
| AC5 | PASS | `AC5`: `Editar pago #101` renderiza calendario sin `Fuentes:` ni swatches; prop `fuentesPorDia` opcional confirmada en código. |
| AC6 | PASS | `AC6`: 2 PUT a `/settings/registrar` + réplica `abys-ui`; `TestSettingsRegistrarEndpoints` (DB-backed, roundtrip, validación 400); `filtrosUrl.test.ts` (`tab=registro`). |
| AC7 | PASS | `AC7` (GET 503 → `efectivo/detallado` locales) + `AC7-redondeo-local` (GET split 503 → `Preciso (centavos)`) + `settingsFallback.test.ts` + revisión de código: `queryFn` atrapa 5xx/red y devuelve local sin propagar `isError`. |
| AC8 | PASS | `AC8`: arranque con `QR`, `Distribuido`, `Enteros (1 Bs)` del backend; `#modo-redondeo` editable. Init síncrono desde store + `useEffect` de una sola vez confirmados en código. |
| AC9 | PASS | `pagoPayload.ts` construye solo `{fecha, monto_enteros}` (sin campo de modo); `pagoPayload.test.ts` + `AC9` (keys del payload, `monto_enteros=15000`) + guard de red. |
| AC10 | PASS | `AC10`: 1 checkbox sin marcar, sin botón `Realizar`, `unexpectedWrites=0`. |
| AC11 | PASS | `AC11`: subtotal `0 → 150,00 → 0 Bs`, se reinicia al reabrir, sin writes; `subtotal.test.ts`; `git grep /realizar (splits)=0`. |
| AC12 | PASS | `AC12`: lightbox `QR ampliado`, botón Cerrar 44×44, Escape y clic fuera cierran **solo** el lightbox sin cerrar el Dialog; `aa-harness::nestedKeyboard` + `overlayKeyboard` PASS. Código: overlay `fixed inset-0 z-50`, Escape en fase capture con `stopPropagation`, `inert={zoom}`, `showCloseButton={!zoom}`, restauración de foco. |
| AC13 | PASS | Backend `TestTotalesSplit` (3 escenarios R7.5) + `TestSplitPendienteExcluyeGeneralHTTP` + `integration_test.go`; Frontend `AC13` (total `220,00` no `270,00`, fila General `· reserva` `0,00 Bs` visible, sin reescritura). Ambos usan `es_general`/`GetGeneral`, sin id fijo. |
| AC14 | PASS | `aa-harness.json` 16/16 + anidado, `hardFailures=[]`; `metrics.json`: 324 muestras de foco mín **3.19**, 0 fallos de touch en móvil/overlays, 0 nombres accesibles, 0 `prefers-reduced-motion`. |
| AC15 | PASS | `commands[0..2]`: `go vet`/`go test` (6 paquetes ok, 0 SKIP)/`go build`, `tsc -b`/`npm test` (173)/`npm run build` — todos exit 0. |
| AC16 | PASS | Los 4 artefactos exigidos existen y están versionados en el branch. |
| AC17 | PASS | `0.4.0` verificado en `CHANGELOG.md:9`, `web/package.json:4` y **ambos** campos `version` de `web/package-lock.json`; docs/backlog actualizados; `git show-ref --tags` vacío; sin merge a `main`. |

**Conclusión AC:** evidencia suficiente para los 17. Los cuatro puntos sensibles señalados
(AC7, AC9, AC12, AC13) están cubiertos tanto por prueba funcional/unitaria como por revisión de
código fuente, no solo por la afirmación del reporte.

---

## 3. Tabla de hallazgos

| ID | Severidad | Archivo:línea | Rationale | Bloqueante? |
|---|---|---|---|---|
| F-1 | advisory | `test-results/security/ajustes-registrar-splits.json:24-43` | `tool_missing` de semgrep/bandit/npm-audit/go-audit. Gitleaks (escáner primario) limpio; sin dependencias nuevas; revisión manual de validación/SQL/color. Ver decisión §4.1. | **No** |
| F-2 | advisory | `web/src/features/registrar/RegistrarPage.tsx:379,170,212` | `guardadoRef` queda `true` tras guardar: suprime el bloqueador de cambios sin guardar para ediciones posteriores en la misma sesión. Sigue el orden prescrito por PLAN M2; no afecta el envío (AC1/AC2 en verde). Ver §4.2 y §6. | **No** |
| F-3 | advisory | `web/src/features/splits/RealizarTxDialog.tsx:31` | Fallback preexistente `cuenta?.es_general ?? transaccion.cuenta_id === 3`. **No tocado por este bloque** (verificado en `git diff main..HEAD`); las rutas nuevas usan `es_general`/`GetGeneral`. Ver §4.2 y §6. | **No** |
| F-4 | advisory | `aa-harness.json::advisoryUiFailures` (97 mediciones / 16 combinaciones) | Contraste de borde de componentes UI < 3:1 en algunos controles. No figura entre los 6 puntos duros de policy §5; marcado `gate:false`. Ver §4.2. | **No** |
| F-5 | info | `backend/docs/*` (gitignored, `.gitignore:12`) | Los artefactos Swagger generados no están versionados (tampoco en `main`); la fuente de verdad —anotaciones `@Router`/`@Description` en `settings_handler.go`/`split_handler.go`— sí está actualizada y commiteada, y `backlog/api.md` documenta el cambio. Coherente con la convención del repo. | **No** |
| F-6 | info | `test-results/security/ajustes-registrar-splits.json:4` | Escaneo ejecutado en `1577109` (7 commits). El 8.º commit `d8a6148` solo añade el propio reporte de seguridad (sin secretos); cobertura efectiva de los 8 commits. | **No** |
| F-7 | info | `test-results/tests/ajustes-registrar-splits.json:7` | Evidencia funcional/AA capturada en `a6f9c81`; HEAD `d8a6148` es un commit posterior **solo de evidencia**, sin código de producto, por lo que no puede alterar el comportamiento verificado. | **No** |

**Recuento:** bloqueantes = **0**; no bloqueantes = **7** (F-1…F-4 advisory, F-5…F-7 info).

---

## 4. Decisiones explícitas

### 4.1 Ítems 1 — caveats `tool_missing` como evidencia de aprobación

**Decisión: aceptables para aprobación; NO requieren verificación manual adicional antes del release.**

Racional:
1. La política global establece a **Gitleaks como escáner primario de secretos**; estuvo disponible y
   dio **0 hallazgos** en los 7 commits de código. Los secretos expuestos son el único hard block
   por defecto y no están presentes.
2. El único hard block de seguridad de la política del proyecto (§9) es "no añadir dependencias sin
   aprobación". Se verificó que **no hay dependencias nuevas**: el diff de `package-lock.json` solo
   cambia `version`; los módulos nuevos son funciones puras y se reutilizan Radix/`swag` ya
   declarados. Por tanto, el hueco de `npm-audit`/`go-audit` no expone superficie nueva.
3. `bandit` es SAST de Python y es **inaplicable** a un proyecto Go/TypeScript (el propio reporte
   lo reconoce).
4. El hueco de `semgrep` se mitigó con **revisión manual documentada** de los vectores relevantes:
   whitelist de `metodo_default`/`modo_default`, consultas parametrizadas vía repositorio pgx
   (sin SQL arbitrario), y validación `esColorHex()` antes de inyectar colores en `style`
   (previene CSS injection desde BD). Los endorsementos de la política §9 ("no exponer endpoints
   nuevos fuera del SPEC") se cumplen: los 2 endpoints nuevos están en el SPEC/PLAN.
5. La política§6 no exige SAST automatizado como gate; los hallazgos de seguridad son **evidencia
   para Review**, no decisiones automáticas de riesgo, salvo hard blocks.

Recomendación **no bloqueante**: ejecutar `semgrep` y `npm audit` cuando estén disponibles como
endurecimiento de seguimiento (_backlog_), sin condicionar este release.

### 4.2 Ítems 2 — advisories: bloqueantes o no bloqueantes

| Advisory | Decisión | Rationale |
|---|---|---|
| `guardadoRef` queda `true` tras guardar | **No bloqueante** | Es el comportamiento prescrito por PLAN M2 (`guardadoRef.current = true` antes de `resetear()`) y por D1/R1.2 (re-baselinear el guard). No viola ningún AC: el envío se verificó en AC1/AC2 y el bloqueador solo se usa en navegación, no en submit. Efecto real: tras guardar, una **segunda** edición sin guardar en la misma sesión no dispara el diálogo de descarte. Es deuda técnica latente, no una regresión de los AC. → _backlog_. |
| `RealizarTxDialog.tsx:31` fallback `id === 3` | **No bloqueante** | Preexistente y **fuera de este bloque** (confirmado: no aparece en `git diff main..HEAD`). La exclusión de General nueva sí usa `c.es_general` (frontend) y `cuentaRepo.GetGeneral` (backend), sin id fijo (R7.1/R7.2). → _backlog_ (unificar el helper legacy). |
| Contraste de borde UI (advisory) | **No bloqueante** | La política §5 lista seis puntos duros: texto AA (4.5:1/3:1), foco ≥3:1, targets, teclado, nombres y reduced-motion. El **contraste de borde de componentes** no es uno de ellos y la política §5 declara explícitamente WWAG AAA / ARIA avanzado como _advisory_. Los seis puntos duros están en verde (foco mín 3.19, 0 fallos de texto/móvil/overlays). Registrar como observación de design-system. → _backlog_. |

### 4.3 Ítems 3 — suficiencia de AC1–AC17

**Decisión: suficiente en los 17, incluidos los cuatro puntos enfatizados.**

- **AC7 (fallo backend 5xx):** doble evidencia funcional (503 en `/settings/registrar` y en
  `/settings/split` → valores locales) + unitaria (`settingsFallback.test.ts`) + verifying en código
  que `queryFn` envuelve `api.get` en `try/catch` y devuelve el local sin lanzar `isError`. Cubre
  5xx, red caída y cuerpo inválido.
- **AC9 (payload sin modo):** el constructor puro `construirDiasPayload` emite exclusivamente
  `fecha` + `monto_enteros`; test unitario + inspección del payload capturado en red (`no modo field`).
- **AC12 (lightbox apilado en Radix Dialog):** evidencia de cierre independiente (Escape/clic fuera
  cierran solo el lightbox; el Dialog sobrevive) + `nestedKeyboard` + `overlayKeyboard`, más revisión
  de la solución de apilamiento (Escape en fase `capture` con `stopPropagation`, `inert`, ocultar el
  close del Dialog con `showCloseButton={!zoom}`, `z-50`, foco devuelto al botón QR).
- **AC13 (exclusión de General en ambas capas):** tests puros y sobre HTTP real en backend +
  Playwright en frontend, con el criterio compartido `es_general`/`GetGeneral`, sin id hardcodeado,
  fila informativa visible y `realizado=false` sin reescritura.
- **AC14 (harness AA):** 16 combinaciones × 6 puntos duros + secuencia anidada, con métricas
  numéricas y `hardFailures=[]`. Los `touchTargets:null` en combinaciones de escritorio son
  correctos: la política §5 exige 44×44 **"en móvil"**, y todas las combinaciones `m390` y overlays
  están en 0 fallos.

### 4.4 Ítems 4 — arquitectura y regresión

| Comprobación | Resultado |
|---|---|
| Sin dependencias nuevas | ✅ `package-lock` solo cambia `version`; reutiliza Radix/`swag`/Zustand/TanStack existentes. |
| Sin `.ai/` / `.opencode/` / infra de agentes en commits de producto | ✅ Revisado commit por commit (8/8); solo `.md` de docs/evidencia en los hitos de docs/evidencia. |
| Migración `000007` idempotente + `down` | ✅ `up` usa `ON CONFLICT (clave) DO NOTHING`; `down` hace `DELETE ... WHERE clave IN (...)`. Sin ids fijos ni reescritura. |
| Swagger / API docs consistentes | ✅ Anotaciones Go actualizadas y commiteadas; `backlog/api.md` documenta el nuevo endpoint y el cambio de aggregate; artefactos generados gitignored por convención del repo. |
| Backend y frontend de acuerdo en exclusión de General vía `es_general` | ✅ Backend `totalesSplit(txs, idGeneral)` con `GetGeneral` resuelto una vez por request (sin N+1), `NULL cuenta_id` se conserva como pendiente; frontend `idsGeneral` desde `cuentas[].es_general`. |
| Versión `0.4.0` en los 3 campos | ✅ `CHANGELOG.md:9`, `web/package.json:4`, `web/package-lock.json` (raíz y `packages[""]`). |
| Sin tag / release / merge | ✅ `git show-ref --tags` vacío; HEAD solo en `feat/ajustes-registrar-splits` (+ su tracking remoto); `main` no consumió el merge. |

---

## 5. Re-verificación requerida

**Ninguna para este veredicto.** El bloque queda aprobado tal cual. Si el SIGN/TEST posterior decide
ejecutar SAST/dependency-audit cuando las herramientas estén disponibles, sería un check
adicional de endurecimiento (no una condición de este review). Cualquier cambio de código posterior
a `d8a6148` sí requeriría re-review del diff afectado (F-7 deja constancia de que la evidencia actual
corresponde a `a6f9c81`, con un commit posterior solo de evidencia).

---

## 6. Recomendación de backlog (no ejecutada por Review)

Se recomienda registrar, **sin editar `backlog/backlog.md` en este bloque**, los siguientes ítems de
deuda técnica para un ciclo posterior:

1. **Bug latente (F-2):** reiniciar `guardadoRef.current = false` al limpiar el formulario en
   `/registrar`, de modo que el guard de cambios sin guardar vuelva a proteger un segundo pago
   editado en la misma sesión. Verificar con Playwright una vez adicional.
2. **Consistencia (F-3):** unificar la resolución de la cuenta General en
   `RealizarTxDialog.tsx:31` para usar `es_general` en vez del fallback `id === 3`, eliminando el
   último id fijo preexistente.
3. **Design system (F-4):** elevar el contraste de borde de los controles formulario/select/checkbox
   a ≥3:1 como endurecimiento (no gate actual), en light y dark.

Estos ítems son follow-ups y **no** forman parte del alcance de `ajustes-registrar-splits` ni
impiden el pase a la siguiente transición (`review_approved -> TEST`).
