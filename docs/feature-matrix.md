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

## 2. Dashboard — `/`

| Aspecto | Web | Android |
|---|---|---|
| KPI 1 | **"Total del mes"** = `formatBs(summary.total_centavos)`, detalle `"{N} días en el período"` | `KpiCard` Compose |
| KPI 2 | **"Pagos"** = `cantidad_pagos`, detalle `"Pagos registrados en el mes"` | idem |
| KPI 3 | **"Días trabajados"** = `dias_trabajados`, detalle `"Suma de días pagados"` | idem |
| KPI 4 | **"Total histórico"** = `Σ history.por_mes[].total_centavos`, detalle `"{n} meses de actividad"` | idem |
| Gráfico 1 | **"Semanal"** — barras por día (lun–dom), nav ±1 semana, alto 240 px, eje Y en Bs sin decimales, tooltip `"{label} · {n} pago(s)"` | `BarChart` con `Canvas` (altura 240 dp) |
| Gráfico 2 | **"Mensual"** — barras por semana (etiqueta `"Sem {n}"`), nav ±1 mes | idem |
| Gráfico 3 | **"Anual"** — barras por mes (etiquetas `ene…dic`), nav ±1 año | idem |
| Gráfico 4 | **"Histórico"** — línea `monotone` de total + serie "Tendencia" (media móvil 3 meses, `strokeDasharray`), rango por defecto = **últimos 12 meses con datos**, nav ±12 meses; sin datos → `"Sin datos en el rango seleccionado"` | `LineChart` con `Canvas` + overlay de media móvil |
| Subtítulos | `"Distribución por semana · {mes}"`, `"Distribución por mes · {anio}"`, `"Evolución mensual con tendencia"` | idem |

**Endpoints**: `GET /dashboard/summary`, `/weekly`, `/monthly`, `/yearly`, `/history`.

**Estrategia offline**: el dashboard **no consume la API** en Android; se calcula **localmente sobre Room**
con la misma semántica SQL del backend (§5 de `api-contract.md`):

| Métrica | Cálculo local equivalente |
|---|---|
| `total_centavos` | `Σ monto_enteros` de pagos con `fechaPago` en (mes, anio) y `deletedAt == null` |
| `cantidad_pagos` | `count(*)` de esos pagos |
| `dias_trabajados` | `count(DISTINCT fecha)` de días trabajados de esos pagos cuya `fecha` cae en el mes |
| `weekly` | 7 días (lunes→domingo) de la semana que contiene la fecha; se rellenan con ceros |
| `monthly` | semanas de 7 días desde el día 1; la última se recorta al último día del mes |
| `yearly` | 12 meses rellenados con ceros |
| `history` | agrupación `(anio, mes)` de pagos activos ordenada ascendentemente |

> Beneficio: el dashboard funciona **100 % offline** y no consume 5 endpoints por refresh.

---

## 3. Registrar — `/registrar`

| Elemento | Web | Android |
|---|---|---|
| Título | "Registrar pago" + "Marca los días trabajados en el calendario y completa el resto del formulario." | idem |
| Layout | 2 columnas (calendario \| formulario) | Columna con calendario arriba y formulario abajo (móvil) |
| Herramientas del calendario | **Trabajo** (toggle), **Pago** (reemplaza), **Quitar** (borra día; en registrar también limpia la fecha de pago) | `SegmentedButtons` / `FilterChip` |
| Marcadores | verde = día trabajado nuevo, violeta = día ya registrado, ámbar = fecha de pago ya registrada | `Canvas`/dots en la celda del calendario |
| Leyenda | "día trabajado (nuevo)", "día ya registrado", "fecha de pago ya registrada" | idem |
| Contador | `"{n} día(s) · {fechaPago ?? "sin fecha de pago"}"` | idem |
| Fuente | Select con punto de color + alias; placeholder "Selecciona la fuente"; badge con la fuente elegida | `ExposedDropdownMenuBox` |
| Método de pago | Segmentado de 3: Efectivo / QR / Transacción (default Efectivo) | `SingleChoiceSegmentedButtonRow` |
| Monto (Bs) | Input decimal, placeholder "Ej: 1.234,56"; auxiliar `= {cents} centavos ({bs} Bs)` o `"Ingresa un monto válido, p. ej. 265,00"`; exige `> 0` | idem |
| Notas | Textarea, placeholder "Referencia, período pagado, observaciones…"; vacío → `null` | idem |
| Comprobante | Dropzone "Arrastra o haz clic para subir el comprobante" / "PNG, JPG o WEBP · opcional · lectura con OCR"; miniatura + "Quitar"; **se sube al guardar** | `PhotoPicker` + preview + "Quitar" |
| Botón | "Guardar pago" (ancho completo), deshabilitado si falta fuente, fecha, monto>0 o ≥1 día | idem |

**Flujo**: `POST /pagos` → si hay comprobante, `POST /pagos/{id}/comprobante` → navegar a Ingresos.
**Toasts**: "Pago registrado" + "Pago #N creado con split automático." / "Pago #N creado correctamente." /
warning "Pago #N registrado sin split automático" (descripción = `split_warning`).

### 3.1 OCR — decisión del proyecto

**Fuera de alcance en Fase 1** (decisión del usuario: *"Sin OCR en Fase 1"*).
Se replicará en Fase 2 con **ML Kit Text Recognition** (on-device, equivalente a `tesseract.js`).
Contrato a reimplementar (documentado para la fase futura):

| Extrae | Regla del web (`services/ocr.ts`) |
|---|---|
| `monto_enteros` | Rango 1000–10 000 000 centavos; scoring por línea (+3 palabras de contexto, −4 ruido, +2 si "bs/bob", +1 si 2 decimales, +2 si positivos sin ruido); descarta enteros de 7+ dígitos; separador decimal inferido |
| `fecha` | `YYYY-MM-DD`/`YYYY/MM/DD` → `"DD de mes de YYYY"` → `DD/MM/YYYY` |
| `referencia` | línea con `referencia|ref.|n°|nº` + número de 4+ dígitos (máx. 80 chars) |
| `descripcion` | línea con `descripción|detalle|concepto|glosa|comentario|observación|motivo` (máx. 120 chars) |

En Android, la captura de imagen usa **Photo Picker** (`PickVisualMedia`), sin permiso de galería.

---

## 4. Ingresos — `/ingresos`

| Elemento | Web | Android |
|---|---|---|
| Título | "Ingresos" + `"{n} pagos registrados"` | idem |
| Filtros | "Desde", "Hasta", "Fuente" (Todas), "Método" (Todos) + botones "Aplicar" / "Limpiar" | `FilterChip` + `DatePicker` + bottom sheet "Aplicar filtros" |
| Agrupación | por año descendente, con pill del nº de pagos del año | `stickyHeader` por año |
| Fila | punto de color + alias de fuente, fecha (`mié 27 ago 2026`) + notas, badge de método, monto (`1.234,56 Bs`), miniatura de comprobante, 3 acciones (split/editar/eliminar) | `Card` con `Row` + `IconButton`s |
| Detalle expandido | "Días trabajados (N)" con chips `jueves · 2026-08-27`; "Comprobante" o "Sin comprobante"; "ID #12" (+ " · Split: preciso (#3)") | `AnimatedVisibility` + `FlowRow` de chips |
| Badge de split | `pago.split_modo ?? "split"` con tooltip "Este pago ya tiene split" | `AssistChip` |
| Zoom de comprobante | overlay a pantalla completa, cierre con X y `Escape` | `Dialog` a pantalla completa |
| Vacío | "No hay pagos que coincidan con los criterios." / "Ajusta los filtros o registra un nuevo pago." | idem |
| Paginación | "Página {n} de {m}" + "Anterior" / "Siguiente" | `LazyColumn` con scroll infinito + indicador |

**Diálogo de edición**: "Editar pago #{id}", warning "Pago con split" → *"El monto no se puede modificar si el pago tiene split (lo rechaza la API). El resto de campos sí es editable."* (campo monto **deshabilitado**), calendario que **reemplaza** los días, botón "Guardar cambios".
**Diálogo de borrado**: "¿Eliminar pago #{id}?" + *"Se eliminará el pago de {Bs} de {fuente} del {fecha}. También se eliminará su split pendiente. Esta acción no se puede deshacer."* → "Cancelar" / "Eliminar".

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
| Pull periódico | `SyncPullWorker` cada 15 min y al abrir la app; `SyncAllWorker` cada 30 min. |
| Orden de push | `fuentes → cuentas → pagos → días → splits → transacciones → settings`. |
| Reintentos | Backoff exponencial por operación (`nextAttemptAt`), `Result.retry()` en el worker. A los 5 intentos → `FAILED` (requiere acción del usuario). |
| Errores 409/422 | No se reintentan: la fila queda `FAILED` y la UI muestra el mensaje literal del backend + acción "Descartar cambio local". |
| Split calculado offline | `SplitCalculator` (Kotlin) replica `splitcalc.go`; el resultado local es una **vista previa** hasta que el servidor confirma. |
| Dashboard | Cálculo local sobre Room (no consume `/dashboard/*`). |
| Health | Siempre remoto (no se cachea). |

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
| Registrar | "Registrar pago", "Marca los días trabajados en el calendario y completa el resto del formulario.", "Calendario", "Datos del pago", "Comprobante (opcional)", "Guardar pago", "Trabajo", "Pago", "Quitar", "Arrastra o haz clic para subir el comprobante", "PNG, JPG o WEBP · opcional · lectura con OCR", "Leer comprobante", "Quitar" |
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
| **P3** | OCR con ML Kit, edición de tasas en historial avanzado, comparador de pagos | Mejoras posteriores. |
