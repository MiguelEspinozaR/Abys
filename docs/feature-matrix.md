# Matriz de funcionalidad — Web Abys → Android Abys

> **Fuentes**: `Abys/web/src/features/*` (UX y textos literales), `Abys/web/src/lib/format.ts` (formatos),
> `Abys/web/src/services/hooks.ts` (queries e invalidaciones), `Abys/backend/**` (contrato y reglas).
> Contrato HTTP: [`api-contract.md`](./api-contract.md) · Modelo local: [`data-model.md`](./data-model.md).

---

## 0. Resumen de equivalencias

| Web | Android | Pantalla / paquete | Prioridad |
|---|---|---|---|
| `/` Dashboard | `DashboardScreen` | `presentation/dashboard` | P1 |
| `/registrar` | `RegistrarScreen` | `presentation/registrar` | P1 |
| `/ingresos` | `IngresosScreen` | `presentation/ingresos` | P1 |
| `/splits` | `SplitsScreen` | `presentation/splits` | P1 |
| `/configuracion` | `ConfiguracionScreen` (3 tabs) | `presentation/configuracion` | P2 |
| `/health` | `HealthScreen` | `presentation/health` | P2 |

Navegación web: sidebar (desktop) / bottom-sheet (móvil) con 2 grupos (**Finanzas**, **Sistema**).
Navegación Android: `NavigationBar` inferior (5 destinos) + Ajustes (con Health anidado), replicando los grupos.

| Web | Android |
|---|---|
| `Sidebar` / `TopBarMovil` | `AbysBottomBar` + `TopAppBar` con título de ruta |
| `Tabs` de Configuración | `TabRow` dentro de `ConfiguracionScreen` |
| `Dialog` / `AlertDialog` | `ModalBottomSheet` / `AlertDialog` de M3 |
| `Card` | `Card` de M3 |
| `Badge` | `AssistChip` / `Badge` propio |
| `Toast` (Sonner) | `Snackbar` en `Scaffold` |
| `Table` | `LazyColumn` con `Card` por fila (móvil) |

---

## 1. Formatos compartidos (capa `core/format`)

Replicar **exactamente** `Abys/web/src/lib/format.ts` (tiene tests en `format.test.ts`).

| Función web | Kotlin | Regla | Test de paridad |
|---|---|---|---|
| `formatBs(cents)` | `Money.formatBs()` | `NumberFormat("es-BO")` con 2 decimales + `" Bs"`; negativo con `−` (U+2212); no numérico → `"—"` | `26500 → "265,00 Bs"`, `123456 → "1.234,56 Bs"`, `1 → "0,01 Bs"`, `-50 → "−0,50 Bs"` |
| `bsToCents(str)` | `Money.parseBs()` | Quita espacios y sufijo `bs`/`bs.`; con ambos separadores el **último** es decimal; solo comas: >1 coma = miles; 1 coma = decimal; negativo/no numérico/vacío → `null`; `Math.round(n*100)` | `"1.234,56"→123456`, `"265"→26500`, `"265 Bs"→26500`, `"12.345"→1235`, `"-50"→null` |
| `formatearFechaEs(fecha)` | `DateFormat.esCorta()` | `DateTimeFormatter` es-BO: `EEE d MMM yyyy` (ej. `mié 27 ago 2026`) | idem |
| `diaSemanaEs(fecha)` | `DateFormat.diaSemana()` | `domingo…sábado` en minúsculas | `"2026-08-27" → "jueves"` |
| `toISODate` / `fromISODate` | `LocalDate` ↔ `String` | ISO local, **sin shift UTC** | `"2026-09-07"` |
| `labelMetodo(m)` | `MetodoPago.label` | `efectivo→Efectivo`, `qr→QR`, `transaccion→Transacción` | idem |
| `formatTasaBps(bps)` | `Percent.format()` | `NumberFormat("es-BO")` 0–2 decimales de `bps/100` + `" %"` (**espacio antes de %**) | `2000 → "20 %"`, `3050 → "30,5 %"` |
| `bpsToPercentNum` / `percentNumToBps` | `Percent.toBps()` | `round(pct*100)` | `20.5 → 2050` |

> **Locale**: el web usa `es-BO` salvo en dos títulos del dashboard que quedan en inglés por un bug
> (`format(..., "MMMM yyyy")` sin locale). En Android se usa **es-BO de forma consistente**.

---

## 2. Dashboard — `/` (v0.3.0 · dashboard v2)

| Aspecto | Web | Android (implementado) |
|---|---|---|
| KPI 1 | **"Total últimos 30 días"** = `formatBs(summary.total_30d_centavos)`, detalle `"Incluye hoy · zona La Paz"` | `KpiCard` (icono `Payments`) |
| KPI 2 | **"Total histórico"** = `formatBs(summary.total_historico_centavos)`, detalle de meses de actividad | `KpiCard` (icono `Schedule`) |
| Gráfico 1 | **"Semanal"** — barras **apiladas por fuente** (lun–dom), nav ±1 semana, leyenda por alias | `StackedBarChart` + leyenda de fuentes |
| Gráfico 2 | **"Mensual"** — barras por **bloques** 1–7/8–14/15–21/22–28/29–fin, nav ±1 mes | `BarChart` con etiquetas `"1–7"`, … |
| Gráfico 3 | **"Anual"** — barras por mes (`ene…dic`), nav ±1 año (independiente del mes) | `BarChart` + año propio |
| Gráfico 4 | **"Histórico"** — línea de totales mensuales (**sin tendencia**), rango por defecto últimos 12 meses con datos, nav ±12 meses | `LineChart` + navegación de rango |
| Gráfico 5 | **"Distribución del mes"** — torta por fuente con monto y porcentaje | `DistributionPieChart` + leyenda |
| Gráfico 6 | **"Distribución del año"** — torta por fuente | idem, año propio |
| Estado de sync | — (el web siempre está en línea) | `SyncStatusChip` + banner de error + aviso **"Faltan datos por sincronizar"** |
| Acción extra | — | Botón refrescar: contrasta con `GET /dashboard/summary` y avisa si el servidor tiene más |

**Endpoints** (solo contraste; opcionales): `GET /dashboard/summary` (sin params),
`/weekly`, `/monthly`, `/yearly`, `/history`, `/distribution/monthly`, `/distribution/yearly`.

**Estrategia offline**: el dashboard **no consume la API** en Android; se calcula **localmente
sobre Room** con la semántica del backend v0.3.0 (`DashboardDao`), agrupando por
`dias_trabajados.fecha`:

| Métrica | Cálculo local equivalente |
|---|---|
| `summary.total_30d_centavos` | `Σ dias.montoEnteros` con `fecha ∈ [hoy−29, hoy]` (pagos activos) |
| `summary.total_historico_centavos` | `Σ dias.montoEnteros` de todos los pagos activos |
| `weekly` | 7 días (lunes→domingo) con `por_fuente` por día; `por_fuente` ordenado por total desc y `fuente_id` |
| `monthly` | bloques 1–7, 8–14, 15–21, 22–28 y 29–fin de mes |
| `yearly` | 12 meses rellenados con ceros |
| `history` | agrupación `(anio, mes)` de los días activos, sin tendencia |
| `distribution/monthly\|yearly` | `Σ` por fuente del período (incluye fuentes soft-deleted para alias/color históricos) |

> Beneficio: el dashboard funciona **100 % offline**; el servidor solo se usa para detectar que
> faltan datos (comparación del total de 30 días).

---

## 3. Registrar — `/registrar` (v0.3.0 · registro híbrido, sin OCR)

| Elemento | Web | Android (implementado) |
|---|---|---|
| Título | "Registrar pago" + "Marca los días trabajados en el calendario y elige cómo cargar los montos." | idem |
| Layout | 2 columnas (calendario \| formulario) | Columna con scroll: calendario arriba y formulario abajo (móvil) |
| Calendario | 3 herramientas: **Trabajo**, **Pago**, **Quitar** | Toque corto = marcar día trabajado; toque largo = quitar (adaptación móvil) |
| Marcadores | verde = día trabajado, ámbar = fecha de pago | `Box` con color + leyenda |
| Fuente | Select con punto de color + alias | `ExposedDropdownMenuBox` |
| Método de pago | Segmentado de 3: Efectivo / QR / Transacción | `FilterChip`s |
| **Modo de montos** | **Detallado** (monto por día) o **Distribuido** (total repartido equitativamente) | Chips `ModoRegistro.DETALLADO / DISTRIBUIDO` |
| Modo Detallado | Input por día; error `"Ingresa el monto de cada día seleccionado, p. ej. 150,00"`; total = Σ | lista fecha + monto (Bs) |
| Modo Distribuido | Input total + redondeo (`Redondeado (1 Bs)` / `Enteros (1 Bs)` / `Preciso (centavos)`) + vista previa por día; el sobrante va al último día | `DistribuirUseCase` (espejo de `distribuir.ts`) + vista previa |
| Total | Card **"Total del pago"** derivado (Σ días) | idem, en tiempo real |
| Ayuda | `"Usa coma decimal y punto para miles: 1.234,56."` | idem |
| Notas | Textarea, placeholder "Referencia, período pagado, observaciones…" | idem |
| Comprobante | Dropzone (sin OCR en v0.3.0) | **pendiente**: Photo Picker + multipart (mejora posterior) |
| Botón | "Guardar pago" (deshabilitado si falta fuente, días, monto o total ≤ 0) | idem |

**Flujo**: `PagoRepository.crearPago` escribe en Room con `syncState = PENDING_CREATE` y encola el
push; el worker envía `POST /pagos` con los días `{fecha, monto_enteros}` y **omite el total**
(derivado, evita `422 TOTAL_DESINCRONIZADO`). Sin OCR: el comprobante no extrae datos.

### 3.1 OCR — decisión del proyecto

**Eliminado en v0.3.0** (el web dejó de usar OCR: el registro es híbrido y manual).
No se implementa en Android; la captura de imagen queda como mejora posterior con Photo Picker.

---

## 4. Ingresos — `/ingresos`

| Elemento | Web | Android |
|---|---|---|
| Título | "Ingresos" + `"{n} pagos registrados"` | idem |
| Filtros | "Desde", "Hasta", "Fuente" (Todas), "Método" (Todos) + botones "Aplicar" / "Limpiar" | `FilterChip` + `DatePicker` + bottom sheet "Aplicar filtros" |
| Agrupación | por año descendente, con pill del nº de pagos del año | `stickyHeader` por año |
| Fila | punto de color + alias de fuente, fecha (`mié 27 ago 2026`) + notas, badge de método, monto (`1.234,56 Bs`), miniatura de comprobante, 3 acciones (split/editar/eliminar) | `Card` con `Row` + `IconButton`s |
| Acciones de fila | split (generar si no tiene) · editar · eliminar | `Edit`, generar split (`CallSplit`) y eliminar (`Delete`); si ya tiene split se muestra el badge y se oculta el botón de split |
| **Editar pago (v0.3.0)** | Diálogo fuente/método/fecha/notas + días con `fecha` y `monto_enteros`; total derivado; BR-081 bloquea la edición si el pago tiene split | `EditarPagoDialog` (Room-first, mensaje "Pago actualizado") |
| Detalle expandido | "Días trabajados (N)" con chips `jueves · 2026-08-27` (+ monto en v0.3.0); "Comprobante" o "Sin comprobante"; "ID #12" (+ " · Split: preciso (#3)") | `FlowRow` de chips con fecha y monto |
| Badge de split | `pago.split_modo ?? "split"` con tooltip "Este pago ya tiene split" | `AssistChip` |
| Zoom de comprobante | overlay a pantalla completa, cierre con X y `Escape` | `Dialog` a pantalla completa |
| Vacío | "No hay pagos que coincidan con los criterios." / "Ajusta los filtros o registra un nuevo pago." | idem |
| Paginación | "Página {n} de {m}" + "Anterior" / "Siguiente" | `LazyColumn` con scroll infinito + indicador |

**Diálogo de edición**: "Editar pago #{id}", warning "Pago con split" → *"El monto no se puede modificar si el pago tiene split (lo rechaza la API). El resto de campos sí es editable."* (campo monto **deshabilitado**), calendario que **reemplaza** los días, botón "Guardar cambios".
**Diálogo de borrado**: "¿Eliminar pago #{id}?" + *"Se eliminará el pago de {Bs} de {fuente} del {fecha}. También se eliminará su split pendiente. Esta acción no se puede deshacer."* → "Cancelar" / "Eliminar".

> En Android el **borrado** está implementado (`AlertDialog` con el texto literal del web); el
> diálogo de **edición** sigue pendiente. El error del backend (p. ej. 409 por tener
> transacciones realizadas) se muestra en una tarjeta de error y el aviso de éxito en un
> banner, ambos en la misma pantalla.

**Endpoints**: `GET /pagos` (filtros + `page`/`page_size`), `PUT /pagos/{id}`, `DELETE /pagos/{id}`, `POST /splits`.

---

## 5. Splits — `/splits`

| Elemento | Web | Android |
|---|---|---|
| Título | "Splits" + "Distribución de cada pago entre cuentas según sus tasas. Los splits pendientes se congelan al marcar cada transferencia como realizada." | idem |
| StatCards | "Splits generados", "Pendiente total", "Realizado total" | `Row` de 3 `KpiCard` |
| "Pendiente por cuenta" | Una fila por cuenta: alias (+ "· reserva" si General), `"{banco} · {numero}"`, monto pendiente y botón "Ver datos"; pie "Total pendiente". Vacío: "No hay cuentas configuradas." | idem |
| Lista de pagos con split | "Pago #{id} · {fuente}", "{fecha} · {n} día(s)", monto, badge "Completo" (emerald) o "{Bs} pend." | idem |
| Detalle del split | badge "modo {modo}", "Pendiente: {Bs}" · "Realizado: {Bs}", botón "Eliminar split" (deshabilitado si hay realizadas, tooltip "No se puede eliminar un split con transacciones realizadas") | idem |
| Fila de transacción | alias snapshot, "{tasa} %" (+ "· reserva" si General), monto, badge "Realizada"/"Pendiente", botón "Realizar" | idem |
| Warning 0 Bs | borde ámbar + "0 Bs en cuenta no General" (tooltip "Transacción de 0 Bs en una cuenta que no es General: revisa la distribución.") | idem (BR-013) |
| Diálogo generar split | "Generar split — pago #{id}", "Crea un split para repartir {monto} Bs entre las cuentas con las tasas vigentes.", select "Modo de cálculo" con 3 textos completos, "Cancelar"/"Generar split" | `ModalBottomSheet` |
| Diálogo realizar | "Transferir a {alias}", "Confirma la transferencia realizada desde tu banca para congelar la transacción.", caja con banco/número, "Tasa aplicada (snapshot)", **QR 160×160** + "Escanea el QR desde tu app bancaria y transfiere exactamente {Bs}." / "Esta cuenta no tiene QR cargado. Transfiere con los datos del banco." | idem |
| Diálogo cuenta | "{alias}" (+ "· reserva"), "Cuenta General usada para la reserva de redondeo." / "Datos de la cuenta para transferir el monto pendiente.", filas Banco / Número de cuenta / Tasa vigente / Pendiente, QR 176×176 | idem |

**Endpoints**: `GET /pagos?page_size=500`, `GET /splits`, `GET /cuentas`, `POST /splits`, `DELETE /splits/{id}`, `PUT /transacciones/{id}/realizar`.

> El "Generar split" vive en **Ingresos** en el web; en Android se conserva ahí y además se ofrece en Splits.

**Implementado en Android** (`presentation/components/SplitDialogs.kt`, reutilizado por ambas pantallas):

| Diálogo | Web | Android |
|---|---|---|
| Generar split | "Generar split — pago #{id}", select con 3 modos | `GenerarSplitDialog` (mismos 3 modos con su descripción literal) |
| Transferir a {alias} | "Transferir a {alias}", caja con banco/número, "Tasa aplicada (snapshot)", QR 160×160 | `RealizarTransaccionDialog` (idéntico, con Coil para el QR) |
| Ver datos de cuenta | "{alias}", filas Banco / Número / Tasa / Pendiente, QR 176×176 | `CuentaDetalleDialog` (idéntico) |
| Eliminar split | "¿Eliminar el split del pago #{id}?" | `AlertDialog` con el texto literal; botón **deshabilitado** si hay realizadas (BR-036) |

Además: la fila de cada split muestra "Pago #{id} · {fuente}", "{fecha} · {n} día(s)", el monto y
el badge "Completo" / "{Bs} pend."; y las transacciones muestran "· reserva" cuando la cuenta es
General (como `FilaTransaccion` del web).

---

## 6. Configuración — `/configuracion`

Tabs: **Cuentas** (default) · **Fuentes** · **Splits**.

### 6.1 Cuentas
| Elemento | Web | Android |
|---|---|---|
| Alerta | "Suma de tasas > 100%" + "La suma de tasas de las cuentas ({x}) supera el 100%. La API rechazará nuevos splits hasta corregirlo." | `Card` de error |
| Título | "Cuentas ({n}) · suma otras: {x}" | idem |
| Tabla | Cuenta · Banco / Número · QR · Tasa · Acciones | `Card` por cuenta (móvil) |
| General | alias + badge "Residual (derivada)", tasa `max(0, 10000 − Σ otras)` + "= 100% − otras · no configurable", **solo** botón historial | idem |
| Tasa | botón con `formatTasaBps(tasa_bps)` → diálogo "Tasa de {alias}" | idem |
| Diálogo tasa | "Actual: {x}. La suma de tasas de cuentas ≠ General no puede superar 100% (lo valida el servidor).", campo "Tasa en %" + "(100% = 10000 bps)", placeholder "Ej: 25", checkbox "Aplicar a transacciones pendientes" + helper "Recalcula los splits con transacciones pendientes usando esta nueva tasa." | idem |
| Diálogo historial | "Historial de tasas — {alias}", "Cada cambio queda registrado; los splits conservan el snapshot de ese momento.", filas `{bps} %` + fecha/hora, vacío "Sin registros todavía." | idem |
| QR | miniatura 36×36 o placeholder; subir/quitar **sin confirmación** | idem (Photo Picker) |
| Diálogo cuenta | "Nueva cuenta" / "Editar cuenta \"{alias}\"", campos Alias (obligatorio), Banco, Número; "Crear cuenta"/"Guardar cambios" | idem |
| Diálogo borrado | "¿Eliminar cuenta \"{alias}\"?" + "La cuenta se desactiva; los snapshots históricos de splits se conservan." | idem |

### 6.2 Fuentes
| Elemento | Web | Android |
|---|---|---|
| Título | "Fuentes ({n})" + botón "Nueva fuente" | idem |
| Tabla | Alias · Color · Logo · Split · Acciones | `Card` por fuente |
| Color | punto + badge mono con el hex | idem (selector de color) |
| Split | badge "Auto · {modo}" o texto "Manual" | idem |
| Diálogo fuente | "Nueva fuente" / "Editar fuente \"{alias}\"", "Las fuentes identifican el origen de tus pagos (plataforma, cliente, etc.).", Alias ("Ej: Athena"), Color (`input type=color` + hex), switch "Split automático" + helper "Genera el split al registrar un pago de esta fuente.", select "Modo de cálculo" (solo si split_auto) con "Usar el modo por defecto" / preciso / redondeado / enteros | idem |
| Diálogo borrado | "¿Eliminar fuente \"{alias}\"?" + "La fuente se desactiva; los pagos históricos se conservan." | idem |

### 6.3 Splits (configuración)
| Elemento | Web | Android |
|---|---|---|
| Card 1 | "Modo de cálculo por defecto" + "Se usa al generar un split cuando la fuente no define un modo propio.", select con "preciso (truncado al centavo)", "redondeado (half-up a 1 Bs)", "enteros (truncado a 1 Bs)" | idem |
| Card 2 | "Fuentes con split automático ({n})" + "Configura el split automático de cada fuente en la pestaña Fuentes."; vacío → alerta "Sin fuentes en automático" + "Activa \"Split automático\" en una fuente para que sus pagos generen el split al registrarse." | idem |
| **Ajustes Android (extra)** | — | Sección propia: **URL del backend** (editable, cifrada), **Sincronizar ahora**, **Estado de la cola de pendientes**, **Modo claro/oscuro** |

---

## 7. Health — `/health`

| Elemento | Web | Android |
|---|---|---|
| Título | "Salud del sistema" + "Métricas en vivo de la base de datos del backend." / "Última comprobación: {hora}" | idem |
| Botón | "Refrescar" (spinner) | idem |
| Métricas | "Conexión" (`ok`/`error`), "Latencia" (`{x} ms`), "Versión PostgreSQL" (primera palabra), "Tamaño de la DB" | `KpiCard` |
| Tablas | "Tablas ({n})" con columnas Tabla / Registros (mono, `toLocaleString("es-BO")`) | `LazyColumn` |
| Badge | "PostgreSQL {version_pg}" completa | idem |
| Error | "No se pudo consultar el estado del servidor." + "Verifica que el backend esté corriendo en http://localhost:8080." | idem, **con la URL configurada** (no fija) |

**Endpoint**: `GET /health/db` (503 → estado de error).

---

## 8. Estrategia offline/sync por entidad y operación

### 8.1 Matriz entidad × operación

| Entidad | Lectura (UI) | Escritura local | Push | Pull | Reglas especiales |
|---|---|---|---|---|---|
| **Fuente** | `Room` `Flow` | `Room` + `PENDING_*` | `POST/PUT/DELETE /fuentes`, `POST/DELETE /fuentes/{id}/logo` (multipart) | `GET /fuentes` | Always enviar `color` en `PUT` (si no, el backend escribe `""`) |
| **Pago** | `Room` `Flow` (con filtro/paginación local) | `Room` + `PENDING_*` | `POST/PUT/DELETE /pagos` | `GET /pagos` (paginado) | `monto` inmutable si hay split (422); no borrar con realizadas (409) |
| **Día trabajado** | `@Relation` del pago | `Room` (cascade) | Incluido en el body del pago (`dias_trabajados`); si el pago ya existe → `POST/DELETE /pagos/{id}/dias` | Incluido en `GET /pagos` | ≥ 1 día siempre; fecha única por pago |
| **Comprobante** | `Room` (`imagenRuta`) + Coil | Archivo en `filesDir`, op `UPLOAD` | `POST /pagos/{id}/comprobante` (multipart `archivo`) | `imagen_ruta` del pull | Máx. 10 MB, ext `.png/.jpg/.jpeg/.webp/.gif`; el archivo se sube **después** de crear el pago |
| **Cuenta** | `Room` `Flow` | `Room` + `PENDING_*` | `POST/PUT/DELETE /cuentas`, `POST/DELETE /cuentas/{id}/qr` | `GET /cuentas` | `tasa_bps` derivada; General no editable ni eliminable |
| **Historial de tasa** | `@Relation` de la cuenta | se escribe al confirmar un cambio de tasa | `PUT /cuentas/{id}/tasa` (el servidor inserta el historial) | `GET /cuentas/{id}/historial-tasas` | ⚠️ `tasa: 0` → **400** (bug `binding:"required"`); avisar al usuario |
| **Split** | `Room` + transacciones | `Room` + `PENDING_*` | `POST /splits`, `PUT /splits/{id}`, `DELETE /splits/{id}` | `GET /splits` | Tras el push, el split local se **reemplaza** por el del servidor; no borrar con realizadas |
| **Transacción** | `Room` `Flow` | marcar `realizado` local | `PUT /transacciones/{id}/realizar` | `GET /splits` (embebidas) | Irreversible; `alias_snapshot` y `tasa_bps` congelados |
| **Settings (split)** | `Room` | `Room` | `PUT /settings/split` | `GET /settings/split` | — |
| **Health** | **no cacheado** | — | — | `GET /health/db` en cada carga | Es una lectura "en vivo" del servidor |

### 8.2 Reglas de sincronización

| Regla | Implementación |
|---|---|
| Fuente de verdad | La UI **solo** lee de Room. Los repositorios exponen `Flow` de Room; la red solo escribe en Room. |
| Escritura local-first | Toda mutación escribe en Room **y** encola la operación en `pending_operations` **en la misma transacción**. |
| Push periódico | `SyncPushWorker` (`NetworkType.CONNECTED`), además de push inmediato tras cada mutación local (OneTime, `APPEND_OR_REPLACE`). |
| Pull periódico | `SyncPullWorker` cada **15 min** (`ExistingPeriodicWorkPolicy.UPDATE`) y al abrir la app. |
| Push + pull periódico | `SyncAllWorker` cada **30 min**. |
| Conectividad recuperada | `ConnectivityMonitor` (callback de `ConnectivityManager`) encola un `SyncAllWorker` en cuanto la red vuelve (`KEEP`: no duplica si ya hay una sync en curso). |
| Sincronización manual | `SyncStatusRepository.sincronizarAhora()` → `SyncAllWorker` (`REPLACE`), expuesto en Ajustes. |
| Restricción de red | Todos los trabajos exigen `NetworkType.CONNECTED`: sin red se **aplazan** (no fallan) y se ejecutan al recuperar la conectividad. |
| Orden de push | `fuentes → cuentas → pagos → días → splits → transacciones → settings`. |
| Reintentos | Backoff exponencial por operación (`nextAttemptAt`), `Result.retry()` en el worker. A los 5 intentos → `FAILED` (requiere acción del usuario). |
| Errores 409/422 | No se reintentan: la fila queda `FAILED` y la UI muestra el mensaje literal del backend + acción "Descartar cambio local". |
| Split calculado offline | `SplitCalculator` (Kotlin) replica `splitcalc.go`; el resultado local es una **vista previa** hasta que el servidor confirma. |
| Dashboard | Cálculo local sobre Room (no consume `/dashboard/*`). |
| Health | Siempre remoto (no se cachea). |
| Resultado de la sync | Los procesadores devuelven `SyncOutcome` (`OK`/`RETRY`/`FATAL`), **independiente de WorkManager**; los workers lo traducen a `Result.success()`/`retry()`/`failure()`. |

### 8.3 Conflictos (resumen; detalle en `data-model.md` §9)

| Situación | Resolución |
|---|---|
| Cambio local vs cambio remoto | **Gana el local** (última escritura del usuario); se reenvía. |
| El servidor rechaza el cambio local (409/422) | `FAILED` + mensaje del backend + "Descartar cambio local". |
| Transacción "realizada" offline recalculada en el servidor | Gana el servidor en el monto (BR-021); la app marca la fila para revisión. |
| Cambio de tasa que invalida splits locales | Se recalcula localmente y se marca `aplicar_pendientes`. |

---

## 9. Textos de la UI (resumen literal)

Los strings marcados como **literales** deben reproducirse tal cual (son la fuente de la identidad visual del producto).

| Contexto | Texto |
|---|---|
| Nav | "Dashboard", "Registrar", "Ingresos", "Splits", "Configuración", "Health" |
| Grupos | "Finanzas", "Sistema" |
| App | "Abys", "ingresos" |
| Tema | "Modo claro", "Modo oscuro" |
| Registrar | "Registrar pago", "Marca los días trabajados en el calendario y elige cómo cargar los montos.", "Calendario", "Datos del pago", "Modo de registro", "Detallado", "Distribuido", "Monto por día (Bs)", "Total a distribuir (Bs)", "Redondeo", "Redondeado (1 Bs)", "Enteros (1 Bs)", "Preciso (centavos)", "VISTA PREVIA", "Total del pago", "Usa coma decimal y punto para miles: 1.234,56.", "Guardar pago" |
| Ingresos | "Ingresos", "{n} pagos registrados", "Filtros", "Desde", "Hasta", "Fuente", "Todas", "Método", "Todos", "Aplicar", "Limpiar", "Días trabajados ({n})", "Comprobante", "Sin comprobante", "ID #{id}", "Editar pago #{id}", "Guardar cambios", "¿Eliminar pago #{id}?" |
| Splits | "Splits", "Splits generados", "Pendiente total", "Realizado total", "Pendiente por cuenta", "Total pendiente", "Ver datos", "No hay splits generados.", "Complet[o]", "{Bs} pend.", "Eliminar split", "¿Eliminar el split del pago #{id}?", "Transferir a {alias}", "Marcar realizada", "Tasa aplicada (snapshot)", "Realizada", "Pendiente", "0 Bs en cuenta no General" |
| Configuración | "Configuración", "Administra fuentes de ingreso, cuentas de distribución y splits.", "Cuentas", "Fuentes", "Splits", "Nueva cuenta", "Nueva fuente", "Historial de tasas — {alias}", "Modo de cálculo por defecto", "Modo por defecto", "Aplicar a transacciones pendientes", "Residual (derivada)", "= 100% − otras · no configurable" |
| Health | "Salud del sistema", "Métricas en vivo de la base de datos del backend.", "Refrescar", "Conexión", "Latencia", "Versión PostgreSQL", "Tamaño de la DB", "Tablas ({n})" |
| Modos de split | "preciso (truncado al centavo)", "redondeado (half-up a 1 Bs)", "enteros (truncado a 1 Bs)", "Preciso — reparte centavos exactos, residuo a General", "Redondeado — montos redondeados al entero", "Enteros — distribuye solo montos enteros" |

---

## 10. Prioridad de implementación

| P | Ítem | Justificación |
|---|---|---|
| **P0** | Room + entidades + DAOs + `SplitCalculator` + formato Bs/bps/fechas | Base de todo; el cálculo de splits es la regla más delicate del dominio. |
| **P0** | Retrofit + interceptor de error + `TokenStore` cifrado + `BaseUrlStore` | Infra de red; el resto depende de ella. |
| **P0** | WorkManager: push/pull + cola de pendientes | Requisito offline-first. |
| **P1** | Dashboard (local), Registrar, Ingresos | Flujos de uso diario. |
| **P1** | Splits (listar, generar, realizar, eliminar) | Flujo financiero核心. |
| **P2** | Configuración (cuentas/fuentes/splits + ajustes de app) | Configuración + ajustes de URL/sync. |
| **P2** | Health | Diagnóstico. |
| **P3** | Comprobante con Photo Picker + multipart, zoom de comprobante, edición de tasas avanzada | Mejoras posteriores (OCR eliminado en v0.3.0). |
