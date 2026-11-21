# Backlog del proyecto

Lista de funcionalidades, su estado actual y el plan a futuro.

## Features

| Feature | Descripción | Estado |
|---|---|---|
| Dashboard v2 | Charts calculados desde montos de días trabajados agrupados por día y fuente: semanal apilado (color + patrón, leyenda, tooltip desglosado), mensual por bloques del mes, anual por mes, histórico sin tendencia y tortas de distribución mes/año por fuente; cards "Total últimos 30 días" y "Total histórico"; un único scroll del documento | Completado (BUILD; release `0.3.0` preparada, deploy verificado en test3) |
| Registrar pago | Calendario de días trabajados con **monto por día** (el total del pago es la suma de sus días), fecha, fuente, método (efectivo/QR/transacción), notas y comprobante con drag & drop. Modo **detallado** (monto por día) o **distribuido** (total a repartir con modos `redondeado`/`enteros`/`preciso` y residuo al último día). Sin OCR. Tras guardar permanece en `/registrar` con el formulario limpio; hasta 3 puntos por fuente en el calendario; método, modo y redondeo se inicializan desde los defaults configurables | Completado |
| Ingresos | Listado de pagos agrupado por año, filtros (fecha, fuente, método), miniatura de comprobante con visor (lightbox), generar split desde cada fila (ícono con tooltip), editar y eliminar (restringido si hay transacciones realizadas) | Completado |
| Splits | Distribución de un pago entre cuentas: 3 modos de cálculo (redondeado, entero, preciso), snapshot de tasas, recalcular pendientes y marcar transacciones realizadas (modal con QR). Lista únicamente los pagos con split; se generan desde la pestaña Ingresos. Muestra el pendiente total por cuenta con acceso a sus datos (QR, banco y número). "Ver datos" es desplazable, mantiene el subtotal de la selección visible y ahora tiene una acción **Realizar** masivo con confirmación que marca las transferencias seleccionadas. La cuenta **General (reserva)** no suma al pendiente, su fila sigue visible pero deshabilitada y con valor informativo | Completado |
| Configuración | CRUD de fuentes (alias, color, logo con subida de archivo), modo de split por defecto y split automático por fuente; CRUD de cuentas (alias, número, banco, QR), tasas con historial y opción "aplicar a pendientes"; pestaña "Registro" con método de pago y modo de registro por defecto (backend + fallback local) | Completado |
| Health checker | Estado de la conexión a la base de datos, latencia, versión de PostgreSQL, tamaño y conteo por tabla. Reemplaza al antiguo "SQL tab" (sin ejecución arbitraria de SQL) | Completado |
| Sidebar colapsable | Estilo IDE: 3 zonas (logo, secciones Finanzas/Sistema, tema + colapso), dark/light mode. "Configuración" aparece una sola vez, en el grupo Sistema | Completado |
| Navegación móvil | En pantallas pequeñas el sidebar se oculta; una top bar muestra el logo Abys (título de la sección y toggle de tema) y al tocar el logo se despliega un panel anclado arriba-izquierda con toda la navegación, fondo oscurecido y cierre al navegar/Escape | Completado |
| Listas responsive | En móvil, las listas de Ingresos y Splits se muestran como tarjetas apiladas: el texto se envuelve en vez de cortarse con elipsis, y el monto, el badge de método, el comprobante y las acciones quedan siempre visibles. En `md+` la vista no cambia | Completado |
| Accesibilidad UI (gate AA) | Gate duro de accesibilidad: touch targets ≥44×44 px en móvil, foco visible ≥3:1 en light/dark, `prefers-reduced-motion`, skip link y navegación por teclado. Evidencia en `test-results/a11y-gate/` | Completado |
| Accesibilidad de formularios (Bloque B) | 6 `<form>` con submit (Registrar, Editar, Fuente, Cuenta, Tasa, Generar split), labels/fieldsets y `*` en obligatorios; errores inline + resumen con foco; guardia de cambios con `AlertDialog` + `useBlocker` (sin `beforeunload`); uploads validados por tipo y tamaño ≤10 MB; reintento de comprobante sin recrear el pago (D16); reversión del split por defecto ante error; notas >500 con contador real y error inline. Evidencia en `test-results/forms-a11y/` | Completado |
| Histórico agrupado + a11y del bloque C | `/ingresos` y `/splits` como histórico por año con filtros/rango en URL (fuente de verdad: `rango`/`desde`/`hasta`/`fuente`/`metodo`), secciones colapsables y carga bajo demanda (“Cargar más”, tope efectivo `page_size` 500); `?tab=` en `/configuracion`; en `/splits` los filtros afectan solo la lista y los totales de cabecera/“Pendiente por cuenta” se mantienen globales (D8); reemplazo de `transition-all`; `meta theme-color` dinámica sincronizada con el tema (valor rgb/hex, inicial estática); a11y de los 4 gráficos (figura con nombre/descripción, tabla `sr-only`, `accessibilityLayer`, patrones/markers y contraste AA en escala de grises). Evidencia en `test-results/historial-a11y/`, `test-results/tests/historial-a11y.json`, `test-results/security/historial-a11y.{json,md}` y `test-results/historial-a11y/review.md`. Limitaciones: índice de años en `/splits` basado en pagos (D-A), tope `page_size` 500, `theme-color` inicial estática, harness AA smoke; SCAN con fallback regex (Gitleaks no disponible) | Completado (BUILD + SCAN PASS fallback regex + REVIEW APPROVED + TEST PASS + deploy verificado en `test3`, AC14) |

## Datos

- Base de datos: `Abys` (PostgreSQL local).
- Datos históricos migrados desde el proyecto anterior: **188 pagos, 359 días trabajados, 3 fuentes, 3 cuentas, 9 splits, 27 transacciones** (línea base validada).
- Moneda: BOB; los montos se almacenan como centavos enteros (BIGINT).

## Roadmap

### Hecho
- [x] Backend completo: modelo de datos, migraciones, API REST + Swagger, validaciones y reglas de negocio.
- [x] Frontend completo: 6 vistas conectadas a la API, sidebar colapsable, dark/light.
- [x] Despliegue: scripts `deploy.sh` / `status.sh` / `stop.sh`, túnel Cloudflare hacia `test3.mikylab.com`.
- [x] Accesibilidad UI (gate AA): touch targets 44 px, foco ≥3:1, reduced-motion y skip link; AC1–AC12 verificados con evidencia.
- [x] Bloque B: accesibilidad de formularios (6 `<form>` con submit, labels/fieldsets y `*`, errores inline + resumen + foco, guardia con `AlertDialog` + `useBlocker` sin `beforeunload`, uploads ≤10 MB y reintento de comprobante; AC1–AC10/AC12 PASS, AC11 pendiente de deploy).
- [x] Validación de tamaño máximo de imagen en el comprobante (frontend) — límite 10 MB, alineado con `MaxUploadSize`.
- [x] Histórico agrupado + a11y del bloque C: BUILD + SCAN PASS (fallback regex, Gitleaks no disponible) + REVIEW APPROVED + TEST PASS + deploy verificado en `test3` (AC1–AC14). URL como fuente de verdad en listados (`rango`/`desde`/`hasta`/`fuente`/`metodo`) y `?tab=` en configuración; histórico por año con carga bajo demanda y “Cargar más” (tope efectivo `page_size` 500); en `/splits` totales globales (D8); `theme-color` dinámica (rgb/hex, inicial estática); gráficos accesibles (nombre/descripción, tabla `sr-only`, `accessibilityLayer`, patrones, contraste AA). Limitaciones: índice de años en `/splits` por pagos (D-A), tope 500, harness AA smoke.

- [x] Dashboard v2 + release `0.3.0`: monto por día trabajado (pago = Σ días, validación 422), registro híbrido detallado/distribuido (modos `redondeado`/`enteros`/`preciso`), backfill histórico con día sintético, charts por día/fuente con tortas mes/año y cards 30d/histórico, scroll único del documento; eliminación del OCR y retiro de `tesseract.js`. Versión preparada en `CHANGELOG.md`, `README.md` y `web/package.json`/`web/package-lock.json`. **Sin tag ni release en GitHub.** Deploy a `test3` realizado y verificado (reinicio manual del humano).

- [x] Ajustes de registrar y splits + release `0.4.0`: permanencia en `/registrar` con formulario limpio y sin salto a `/ingresos` (incluido el reintento de comprobante); calendario con hasta 3 puntos por fuente (mayor monto, desempate `fuente_id`) y leyenda accesible; defaults de método/modo en `/config` con `GET/PUT /settings/registrar`, precedencia backend y réplica/fallback en `abys-ui`; redondeo inicializado desde `split_modo_default`; "Ver datos" con pendientes, checkboxes no persistentes y subtotal en vivo; QR ampliable; General excluida de `total_pendiente` y del pendiente del frontend por `es_general`/`GetGeneral` (sin ids fijos ni reescritura). Documentación actualizada en `CHANGELOG.md`, `README.md`, `backlog/api.md` y `backlog/arquitectura.md`. **Sin tag ni release en GitHub.**
- [x] Ajustes de splits + release `0.4.1`: diálogo desplazable (scroll), subtotal y conteo visibles con footer fijo, botón **Realizar** masivo con confirmación inline que reutiliza PUT /transacciones/:id/realizar, General deshabilitado; soluciona alcance con muchas pendientes; desplegada en `test3` el 2026-11-20 (reinicio manual y health verificado); **sin tag ni release**.

### Pendiente (orden propuesto)
- [ ] Seguridad del despliegue: login/autenticación (la app está pública sin login en v1, riesgo conocido).
- [ ] Evitar indexación: `robots.txt` o `X-Robots-Tag: noindex` en `test3.mikylab.com`.
- [x] Liberar el objeto `URL.createObjectURL` tras usarlo en el dropzone (memoria).
- [ ] Quitar el id de cuenta fijo como fallback (General) en el diálogo de transacción.
- [ ] App móvil (Flutter) — fuera de alcance por ahora.
- [ ] Multi-idioma — fuera de alcance por ahora (UI en español).
- [ ] A5: menú de acciones secundarias en `/ingresos` para recuperar densidad móvil (requiere SPEC aparte).
- [ ] guardadoRef se mantiene true después del save, suprimiendo el bloqueador de cambios sin cambios para ediciones posteriores en la misma sesión (comportamiento prescrito por D1/R1.2; no afecta AC)
- [ ] Fallback preexistente en RealizarTxDialog.tsx:31 usa `cuenta_id === 3` en lugar de `es_general` (identificado en revisión; nuevas rutas usan `es_general`/`GetGeneral`; no bloqueante)
- [ ] Contraste de borde UI: elevar a ≥3:1 como endurecimiento design system (no gate actual §5; verificado en 16 combinaciones AA)
- [ ] Seguir semgrep y npm-audit cuando estén disponibles como endurecimiento de seguimiento (_backlog_), sin condicionar este release

## Notas operativas

- El proyecto anterior (`finanzasMikyGo`) sigue desplegado en `test.mikylab.com` con los puertos 8080/5173; los scripts de Abys usan **8081** (backend) y **5178** (frontend) para no interferir.
- El túnel Cloudflare (`mikylab`) y nginx son compartidos entre proyectos; no se deben reiniciar a la ligera.
- **Bloque B — AC11 verificado:** AC1–AC12 verificados; AC11 (deploy en vivo a `test3.mikylab.com`) validado con evidencia en `test-results/deployments/forms-a11y.json`.
- **Bloque B — OBS-2 (aceptada, no bloqueante):** en `registrar-nav` con puntero, "Seguir editando" devuelve el foco al enlace de navegación que abrió el aviso, no al formulario; los datos se conservan y no se navega. Con teclado o clic programático el foco vuelve al campo.
- **Bloque C — AC14 verificado:** deploy de `feat/historial-a11y` (commit `dfe4f88`) a `test3.mikylab.com` con health checks OK (backend/frontend/SPA/túnel activos); evidencia en `test-results/deployments/historial-a11y.json`. Rollback de referencia: bloque B (`feat/forms-a11y`). Las tres ramas (`feat/a11y-gate`, `feat/forms-a11y`, `feat/historial-a11y`) siguen sin mergear a `main`.
- **Dashboard v2 — release `0.3.0`:** BUILD completado en `feat/dashboard-v2`, desplegado en `test3`, sin tag ni release en GitHub. El deploy a `test3` verificado health-check (migración `000007`, defaults `/settings/registrar`, exclusión General verificada en 21 splits).
- **Dashboard v2 — N1 (observación no bloqueante de REVIEW):** contraste de bordes estáticos por debajo de 3:1 en `/registrar` (`button#fuente`, `textarea#notas` y botón de dropzone; light ~1.26:1, dark ~1.33–1.57:1). Controles preexistentes y tokens sin cambios en `0.3.0`; candidato a WCAG 1.4.11 como deuda del design system. No bloquea AC15.
- **Ajustes registrar/splits — release `0.4.0`:** documentación y versión preparadas en `feat/ajustes-registrar-splits`, mergeadas a `main` en `194841c`, sin tag ni release. Deploy a `test3` realizado y verificado (reinicio manual del humano). Sigue pendiente el item preexistente del fallback con id fijo (General) en `RealizarTxDialog`, fuera del alcance de este bloque.
- **Ajustes splits — release `0.4.1`:** desplegada en `test3` el 2026-11-20 con health verificado; sin tag ni release en GitHub (diálogo desplazable, subtotal visible, botón Realizar con confirmación, General deshabilitado). Reporte `test-results/deployments/splits-ver-datos-realizar.json`.