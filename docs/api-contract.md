# Contrato de API — Abys Android ↔ Backend Abys

> **Fuente de verdad**: `Abys/backend` (Go + Gin + pgx/v5) y `Abys/backlog/api.md`.
> Verificado leyendo `internal/router/router.go`, `internal/handler/*`, `internal/service/*`,
> `internal/repository/*`, `internal/splitcalc/*`, `internal/apperr/apperr.go` y `migrations/*`.
> **No modificar `Abys/`.** Este documento describe el contrato que la app Android debe consumir.

---

## 0. Convenciones globales

| Aspecto | Valor | Nota |
|---|---|---|
| Prefijo base | `/api/v1` | Todas las rutas de este doc son relativas a `BASE_URL + /api/v1` |
| Estáticos | `/uploads/<archivo>` | Sirve comprobantes/logos/QR subidos; **no** lleva prefijo `/api/v1` |
| Swagger | `/swagger/index.html` | Documentación interactiva del backend |
| Montos | `monto_enteros` — **BIGINT centavos** | `26500` = 265,00 Bs. Conversión **solo al visualizar** |
| Tasas | `tasa_bps` — **basis points** | `2000` = 20 %. Rango válido `0..10000` |
| Tasa en API de cambio | `tasa` (float, **porcentaje**) | `PUT /cuentas/:id/tasa` recibe `20.5` y devuelve `tasa_bps: 2050` |
| Fechas de negocio | `YYYY-MM-DD` (DATE) | `fecha_pago`, `fecha` de días trabajados |
| Timestamps | RFC3339 con offset | Ej. `2026-07-02T02:17:05.00713-04:00` (TIMESTAMPTZ) |
| Zona horaria | `America/La_Paz` (UTC−4) | Regla de negocio del proyecto; el backend usa `time.LoadLocation("America/La_Paz")` |
| Soft delete | campo `deleted_at` | Los registros eliminados **no** aparecen en listados ni dashboard, pero se conservan en histórico |
| Auth | **Ninguna** (v1 sin login, BR-030) | La API no exige `Authorization`. La app deja la infra lista (token cifrado + interceptor) |

### 0.1 Envoltorio de éxito

```jsonc
{ "data": <T> }                       // la mayoría de endpoints
{ "data": <T[]>, "meta": { ... } }    // solo GET /pagos (paginación)
```

**Excepción `POST /pagos`**: la respuesta trae campos **adicionales al nivel raíz**, fuera de `data`:

```jsonc
{
  "data": { /* pago completo */ },
  "split_auto": true,          // presente solo si se generó split automático
  "split_id": 42,              // presente solo si se generó split automático
  "split_warning": "..."       // presente si el pago se guardó pero el split automático falló
}
```

> `split_warning` **no es un error HTTP**: el pago quedó creado (201). La app debe mostrarlo como
> advertencia no bloqueante.

### 0.2 Envoltorio de error

```jsonc
{ "error": { "code": "VALIDATION_ERROR", "message": "…", "details": "…" } }
```

`details` es opcional (solo si el error lo define).

| HTTP | `code` | Significado en la app |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Entrada inválida → mostrar mensaje, no reintentar |
| 404 | `NOT_FOUND` | Recurso inexistente o soft-deleted |
| 409 | `BUSINESS_RULE_CONFLICT` | Regla de negocio (p. ej. pago ya tiene split) |
| 422 | `IMMUTABLE_DATA` | Dato inmutable (p. ej. cambiar la suma de días con split existente) |
| 422 | `TOTAL_DESINCRONIZADO` | El `monto_enteros` enviado (> 0) no coincide con Σ de los días (v0.3.0) |
| 500 | `INTERNAL_ERROR` | Error del servidor → reintentable con backoff |
| 503 | `DB_UNAVAILABLE` | Solo `GET /health/db` → base de datos caída |

Rutas inexistentes → `404` con `{"error":{"code":"NOT_FOUND","message":"ruta no encontrada: /path"}}`.

### 0.3 Base URL y configuración (Android)

| Entorno | Base URL |
|---|---|
| Emulador → host `localhost` | `http://10.0.2.2:8080/api/v1` |
| Dispositivo físico en la misma LAN | `http://<IP_DEL_HOST>:8080/api/v1` |
| Producción (túnel Cloudflare) | `https://test3.mikylab.com/api/v1` |

- El backend local escucha en `PORT` (default `8080`); en el servidor de despliegue corre en `8081` detrás del túnel.
- `MAX_UPLOAD_SIZE` default `10` (MB) → la app debe rechazar archivos > 10 MB antes de subir.
- `CORS_ORIGIN` es irrelevante para Android (no es navegador), pero el servidor debe permitir el tráfico desde la app (no hay CORS en apps nativas).
- La **base URL es configurable en runtime** (pantalla Ajustes) y se persiste cifrada. Default de build: `http://10.0.2.2:8080/api/v1`.

### 0.4 Uploads (multipart)

Todos los uploads usan **el mismo nombre de campo: `archivo`**.

| Regla | Valor |
|---|---|
| Extensiones permitidas | `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif` (comparación *case-insensitive*) |
| Tamaño máximo | `MAX_UPLOAD_SIZE` MB (default 10) → 400 `VALIDATION_ERROR` |
| Nombre en disco | `<prefijo>_<unixNano><ext>` (prefijo: `comprobante`, `logo`, `qr`) |
| Ruta devuelta | `/uploads/<nombre>` (guardar **esta ruta relativa**, no absoluta) |
| Content-Type del archivo | el de la imagen (`image/png`, `image/jpeg`, …) |

---

## 1. Pagos y días trabajados

> **Contrato de días trabajados (0.3.0, breaking).** `POST /pagos`, `PUT /pagos/:id` y
> `POST /pagos/:id/dias` reciben los días como objetos `{fecha, monto_enteros}` (monto en
> centavos, ≥ 0). El `monto_enteros` del **pago** es **derivado**: el backend persiste
> Σ de los días e **ignora** el total del cliente. Si el cliente envía un total `> 0`
> distinto de la suma, responde `422 TOTAL_DESINCRONIZADO`. En respuestas, cada día añade
> `id`, `pago_id` y `monto_enteros`.
>
> **Android**: omite `monto_enteros` en los requests del pago (`null`) — R3.2 del web — para
> no arriesgar el `422`. El total se calcula localmente como Σ de los días.

### 1.1 `POST /api/v1/pagos` — Crear pago (201)

Body:

```jsonc
{
  "fuente_id": 3,                    // required, debe existir y estar activa
  "fecha_pago": "2026-08-14",        // required, YYYY-MM-DD real (rechaza 31/02)
  "monto_enteros": null,             // opcional: el backend lo deriva de Σ días (se omite)
  "metodo_pago": "qr",               // required, ∈ {efectivo, qr, transaccion}
  "notas": "texto opcional",         // opcional/null
  "dias_trabajados": [               // required, min 1, fechas únicas, monto_enteros >= 0
    { "fecha": "2026-08-10", "monto_enteros": 29550 },
    { "fecha": "2026-08-11", "monto_enteros": 29550 }
  ]
}
```

Respuesta `201`:

```jsonc
{
  "data": {
    "id": 189, "fuente_id": 3, "fecha_pago": "2026-08-14",
    "monto_enteros": 59100, "metodo_pago": "qr", "notas": null, "imagen_ruta": null,
    "created_at": "2026-08-14T…-04:00", "updated_at": "2026-08-14T…-04:00",
    "fuente_alias": "Malnova", "fuente_color": "#e4c852",
    "dias_trabajados": [
      { "id": 900, "pago_id": 189, "fecha": "2026-08-10", "monto_enteros": 29550 },
      { "id": 901, "pago_id": 189, "fecha": "2026-08-11", "monto_enteros": 29550 }
    ],
    "split_id": 42, "split_modo": "preciso"   // opcionales (omitempty)
  },
  "split_auto": true, "split_id": 42
}
```

Errores: `400` (validación, fecha inválida, método inválido, días duplicados, < 1 día),
`404` (fuente inexistente → en la práctica `400`), `409`,
`422 TOTAL_DESINCRONIZADO` (total enviado ≠ Σ días).

**Auto-split**: si la `fuente` tiene `split_auto = true`, el backend genera el split con el modo
`fuente.split_auto_modo` o, si es null, con el modo por defecto global (`settings.split_modo_default`, default `preciso`).
Si el split no puede generarse (p. ej. no hay cuenta General), el pago **se guarda igual** y se devuelve `split_warning`.

### 1.2 `GET /api/v1/pagos` — Listar (200)

Query params:

| Param | Tipo | Default | Notas |
|---|---|---|---|
| `fecha_inicio` | `YYYY-MM-DD` | — | `fecha_pago >=` |
| `fecha_fin` | `YYYY-MM-DD` | — | `fecha_pago <=` |
| `fuente_id` | int | — | inválido → `400` |
| `metodo_pago` | string | — | `efectivo\|qr\|transaccion` |
| `page` | int | `1` | `< 1` → 1 |
| `page_size` | int | `20` | `< 1` → 20; `> 500` → 500 |

Respuesta:

```jsonc
{
  "data": [ /* PagoDetallado[] */ ],
  "meta": { "page": 1, "page_size": 20, "total": 188, "total_pages": 10 }
}
```

Orden: `fecha_pago DESC, id DESC`. Solo pagos **no eliminados**.

### 1.3 `GET /api/v1/pagos/{id}` — Detalle (200 / 404)

Devuelve `{ "data": PagoDetallado }` (mismo shape que en el listado, sin `meta`).

### 1.4 `PUT /api/v1/pagos/{id}` — Actualizar (200 / 400 / 404 / 422)

Body (todos los campos obligatorios salvo `notas`, `monto_enteros` y `dias_trabajados`):

```jsonc
{
  "fuente_id": 3,
  "fecha_pago": "2026-08-14",
  "monto_enteros": null,             // opcional: derivado de Σ días (se omite)
  "metodo_pago": "qr",
  "notas": null,
  "dias_trabajados": [               // opcional; objetos {fecha, monto_enteros}
    { "fecha": "2026-08-10", "monto_enteros": 29550 },
    { "fecha": "2026-08-11", "monto_enteros": 29550 }
  ]
}
```

- Si `dias_trabajados` **está presente** (incluso `[]`): reemplaza el set completo de días
  (valida ≥ 1, fechas únicas y `monto_enteros >= 0` por día).
- Si **se omite**: los días no cambian.
- `422 IMMUTABLE_DATA` si se cambia la **suma de los días** y el pago **ya tiene split**
  (`"no se puede cambiar el monto de un pago con split; elimina o recalcula el split primero"`).
- `422 TOTAL_DESINCRONIZADO` si `monto_enteros > 0` y no coincide con Σ días.
- Respuesta `{ "data": PagoDetallado }`.

### 1.5 `DELETE /api/v1/pagos/{id}` — Eliminar (200 / 404 / 409)

Soft delete. `409 BUSINESS_RULE_CONFLICT` si el pago tiene **transacciones realizadas**
(`"no se puede eliminar un pago con transacciones realizadas"`).

Respuesta: `{ "data": { "deleted": true, "id": 189 } }`

### 1.6 `POST /api/v1/pagos/{id}/dias` — Agregar día (201)

Body: `{ "fecha": "2026-08-12", "monto_enteros": 12000 }` → 400 si falta la fecha o es
inválida; `monto_enteros` debe ser ≥ 0.
Fecha duplicada dentro del mismo pago → `400` (constraint `UNIQUE (pago_id, fecha)`).
Respuesta: `{ "data": { "pago_id": 189, "fecha": "2026-08-12", "monto_enteros": 12000, "agregado": true } }`

### 1.7 `DELETE /api/v1/pagos/{id}/dias/{diaId}` — Quitar día (200 / 400 / 404)

`400` si el pago queda con menos de 1 día (`"un pago debe mantener al menos un día trabajado"`).
Respuesta: `{ "data": { "eliminado": true, "pago_id": 189, "dia_id": 900 } }`

### 1.8 `POST /api/v1/pagos/{id}/comprobante` — Subir imagen (200)

`multipart/form-data`, campo **`archivo`**.
Respuesta: `{ "data": { "id": 189, "imagen_ruta": "/uploads/comprobante_1730000000000000000.jpg" } }`

### 1.9 `GET /api/v1/pagos/{id}/split` — Split del pago (200)

`{ "data": null }` si el pago no tiene split; si lo tiene, `{ "data": Split }` (ver §4).

---

## 2. Fuentes

### 2.1 `POST /api/v1/fuentes` — Crear (201)

```jsonc
{ "alias": "Malnova", "color": "#e4c852", "logo_ruta": null, "split_auto": false, "split_auto_modo": null }
```

- `alias` required. `color` opcional → default `#3b82f6` (si se manda vacío).
- `split_auto_modo` ∈ `{redondeado, enteros, preciso}` o `null` (usa el modo global por defecto).
- Respuesta `{ "data": Fuente }`:

```jsonc
{ "id": 3, "alias": "Malnova", "color": "#e4c852", "logo_ruta": null,
  "split_auto": false, "split_auto_modo": null,
  "created_at": "…", "updated_at": "…" }
```

### 2.2 `GET /api/v1/fuentes` — Listar (200) → `{ "data": Fuente[] }` (solo activas)

### 2.3 `PUT /api/v1/fuentes/{id}` — Actualizar (200)

Mismo body que crear. Respuesta: `{ "data": { "id": 3, "actualizado": true } }` (**no** devuelve la entidad).

### 2.4 `DELETE /api/v1/fuentes/{id}` — Eliminar (200) → `{ "data": { "eliminado": true, "id": 3 } }`

### 2.5 Logo

| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| `POST` | `/fuentes/{id}/logo` | multipart `archivo` | `{ "data": { "id": 3, "logo_ruta": "/uploads/logo_…png" } }` |
| `DELETE` | `/fuentes/{id}/logo` | — | `{ "data": { "id": 3, "logo_ruta": null } }` |

---

## 3. Cuentas, tasas e historial

### 3.1 `POST /api/v1/cuentas` — Crear (201)

```jsonc
{ "alias": "Business", "numero": "1016387238", "banco": "BMSC" }
```

- `alias` required. `numero`/`banco` opcionales (null).
- **No** se puede crear una cuenta General por esta vía (`es_general` siempre `FALSE`).
- Respuesta `{ "data": Cuenta }` (ver 3.3).

### 3.2 `GET /api/v1/cuentas` — Listar (200) → `{ "data": Cuenta[] }`

Orden: `es_general DESC, alias` (General primero, luego alfabético).

### 3.3 `GET /api/v1/cuentas/{id}` — Detalle (200 / 404) → `{ "data": Cuenta }`

```jsonc
{ "id": 1, "alias": "Business", "numero": "1016387238", "banco": "BMSC",
  "qr_ruta": null, "es_general": false, "tasa_bps": 2000,
  "created_at": "…", "updated_at": "…" }
```

> `tasa_bps` es **derivada**: para cuentas normales = última entrada de `historial_tasas`;
> para General = `10000 − Σ(tasas vigentes de las demás)`.

### 3.4 `PUT /api/v1/cuentas/{id}` — Actualizar (200)

Mismo body que crear. Respuesta `{ "data": Cuenta }`.

### 3.5 `DELETE /api/v1/cuentas/{id}` — Eliminar (200 / 400 / 404 / 409)

Soft delete. La cuenta **General no se puede eliminar** (409). No afecta transacciones históricas.
Respuesta: `{ "data": { "eliminado": true, "id": 1 } }`

### 3.6 QR

| Método | Ruta | Respuesta |
|---|---|---|
| `POST` | `/cuentas/{id}/qr` (multipart `archivo`) | `{ "data": { "id": 1, "qr_ruta": "/uploads/qr_…png" } }` |
| `DELETE` | `/cuentas/{id}/qr` | `{ "data": { "id": 1, "qr_ruta": null } }` |

### 3.7 `GET /api/v1/cuentas/{id}/historial-tasas` — Historial (200 / 404)

```jsonc
{ "data": [ { "id": 12, "cuenta_id": 1, "tasa_bps": 2000,
              "aplicada_desde": "2026-07-30T09:49:26.843281-04:00",
              "created_at": "2026-07-30T09:49:26.843281-04:00" } ] }
```

Orden: `aplicada_desde DESC, id DESC` → **la primera entrada es la tasa vigente**.

### 3.8 `PUT /api/v1/cuentas/{id}/tasa` — Cambiar tasa (200 / 400 / 404 / 409 / 422)

```jsonc
{ "tasa": 20.5, "aplicar_pendientes": false }
```

- `tasa` en **porcentaje** (0..100). Se convierte a bps: `round(tasa * 100)` → `2050`.
- No se puede cambiar la tasa de la cuenta **General** (400: *"la tasa de la cuenta General es derivada…"*).
- `409` si `Σ tasas vigentes (otras) + nueva > 100%`.
- Registra **siempre** una entrada nueva en `historial_tasas` (BR-050).
- Si `aplicar_pendientes = true` → recalcula **todos** los splits con pendientes, en una única transacción global.

Respuesta:

```jsonc
{ "data": { "tasa_bps": 2050, "splits_recalculados": 3, "registrado": true } }
```

---

## 4. Splits y transacciones

### 4.1 `POST /api/v1/splits` — Generar split (201 / 400 / 404 / 409)

```jsonc
{ "pago_id": 189, "modo_calculo": "preciso" }
```

- `modo_calculo` opcional → default `preciso`. Valores: `redondeado`, `enteros`, `preciso`.
- `409` si el pago **ya tiene split** (`"el pago ya tiene un split (máximo 1 por pago)"`).
- `409` si no hay cuenta General (`"no hay cuenta General configurada"`).
- `400` si las cuotas superan el monto del pago.
- Cálculo: `monto × tasa_bps / 10000`; según modo:
  - `redondeado`: redondeo *half-up* al Bs entero → `((raw + 50) / 100) * 100`
  - `enteros`: truncado al Bs entero → `(raw / 100) * 100`
  - `preciso`: centavos exactos → `raw`
  - General = `monto − Σ(no-General)` (absorbe el residuo; nunca negativo).

Respuesta `201` → `{ "data": Split }`.

### 4.2 `GET /api/v1/splits` — Listar (200) → `{ "data": Split[] }`

### 4.3 `GET /api/v1/splits/{id}` — Detalle (200 / 404) → `{ "data": Split }`

### 4.4 `PUT /api/v1/splits/{id}` — Recalcular (200 / 404 / 409 / 422)

- Congela las **realizadas**; redistribuye el remanente entre las **pendientes** con las tasas vigentes.
- `409` si hay más de una transacción General pendiente, o si las cuotas no cuadran sin General pendiente.
- `422 IMMUTABLE_DATA` si el remanente no alcanza para las cuotas recalculadas.
- Respuesta → `{ "data": Split }` (ya actualizado).

### 4.5 `DELETE /api/v1/splits/{id}` — Eliminar (200 / 404 / 409)

Elimina el split y sus transacciones **pendientes** (cascade).
`409` si hay **transacciones realizadas** (`"no se puede eliminar un split con transacciones realizadas"`).
Respuesta: `{ "data": { "eliminado": true, "id": 42 } }`

### 4.6 `PUT /api/v1/transacciones/{id}/realizar` — Marcar realizada (200 / 404)

Congela monto y datos; registra `fecha_realizacion`. **No es reversible** por la API v1.
Respuesta → `{ "data": Transaccion }` (la transacción ya actualizada).

### 4.7 `GET /api/v1/transacciones` — Listar (200)

Query params opcionales: `split_id` (int), `cuenta_id` (int), `realizado` (`true|false`).
Respuesta → `{ "data": Transaccion[] }`.

### 4.8 Shapes

```jsonc
// Split
{ "id": 42, "pago_id": 189, "modo_calculo": "preciso",
  "created_at": "…", "updated_at": "…",
  "transacciones": [ /* Transaccion[] */ ],
  "total_realizado": 29550,   // Σ montos realizadas
  "total_pendiente": 29550 }  // Σ montos pendientes

// Transaccion
{ "id": 700, "split_id": 42, "cuenta_id": 1,      // cuenta_id puede ser null
  "monto_enteros": 11820, "tasa_bps": 2000,
  "alias_snapshot": "Business",                     // snapshot: sobrevive a cambios de la cuenta
  "realizado": false, "fecha_realizacion": null,    // RFC3339 o null
  "created_at": "…", "updated_at": "…" }
```

> `alias_snapshot` y `tasa_bps` son **snapshots**: el histórico no depende del estado actual de la cuenta.

---

## 5. Dashboard (v0.3.0)

Todos los importes se agrupan por **`dias_trabajados.fecha`** (no por `fecha_pago`) y salen de
`dias_trabajados.monto_enteros` de pagos **no eliminados**. `por_fuente` incluye fuentes
**soft-deleted** (para preservar alias/color históricos) y está ordenado por total descendente
y `fuente_id`. El estado vacío se representa con totales en cero y listas vacías.

| Método | Ruta | Query | Respuesta `data` |
|---|---|---|---|
| `GET` | `/dashboard/summary` | **ninguno** | `{ total_30d_centavos, total_historico_centavos }` |
| `GET` | `/dashboard/weekly` | `fecha` (YYYY-MM-DD, default = hoy en La Paz) | `{ semana_inicio, semana_fin, dias: [{ fecha, total_centavos, por_fuente: [{ fuente_id, alias, color, total_centavos }] }] }` |
| `GET` | `/dashboard/monthly` | `mes`, `anio` — requeridos | `{ mes, anio, bloques: [{ bloque, inicio, fin, total_centavos }] }` |
| `GET` | `/dashboard/yearly` | `anio` (YYYY) — requerido | `{ anio, meses: [{ mes, total_centavos }] }` |
| `GET` | `/dashboard/history` | — | `{ por_mes: [{ anio, mes, total_centavos }] }` |
| `GET` | `/dashboard/distribution/monthly` | `mes`, `anio` — requeridos | `{ mes, anio, total_centavos, por_fuente: [{ fuente_id, alias, color, total_centavos }] }` |
| `GET` | `/dashboard/distribution/yearly` | `anio` (YYYY) — requerido | `{ anio, total_centavos, por_fuente: [...] }` |

Semántica:

- `summary.total_30d_centavos` = Σ de los días de los **últimos 30 días calendario**
  (incluye hoy, zona `America/La_Paz`); `total_historico_centavos` = Σ de todos los días.
- `weekly` siempre devuelve **7 días** (lunes→domingo de la semana que contiene `fecha`),
  rellenando ceros, con el desglose `por_fuente` de cada día.
- `monthly` divide el mes en **bloques**: 1–7, 8–14, 15–21, 22–28 y 29–fin de mes
  (en febrero de 28 días hay 4 bloques).
- `yearly` siempre devuelve **12 meses** rellenando ceros.
- `history` devuelve solo totales mensuales: **sin tendencia** desde 0.3.0.

Errores: `400` si `mes`/`anio` son inválidos (`"se requieren mes (1-12) y anio (YYYY) válidos"` / `"se requiere anio (YYYY) válido"`).

---

## 6. Health

### 6.1 `GET /api/v1/health` — Ping (200)

```jsonc
{ "status": "ok", "time": "/api/v1/health" }
```

> Quirk: el campo `time` contiene **la ruta del request**, no una hora. No usarlo como timestamp.

### 6.2 `GET /api/v1/health/db` — Estado de la BD (200 / 503)

```jsonc
{ "status": "ok",
  "data": { "conexion": "ok", "latencia_ms": 1.23, "version_pg": "16.3",
            "tamano_db": "12 MB",
            "tablas": [ { "nombre": "fuentes", "registros": 3 },
                        { "nombre": "pagos", "registros": 188 },
                        { "nombre": "dias_trabajados", "registros": 1500 },
                        { "nombre": "cuentas", "registros": 3 },
                        { "nombre": "historial_tasas", "registros": 5 },
                        { "nombre": "splits", "registros": 12 },
                        { "nombre": "transacciones", "registros": 36 } ] } }
```

Si la DB no responde → **503**:

```jsonc
{ "status": "error", "error": { "code": "DB_UNAVAILABLE", "message": "no se pudo conectar a la base de datos" } }
```

---

## 7. Configuración global

| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| `GET` | `/settings/split` | — | `{ "data": { "modo_default": "preciso" } }` |
| `PUT` | `/settings/split` | `{ "modo_default": "redondeado" }` | `{ "data": { "modo_default": "redondeado" } }` |

- Modo por defecto: `redondeado` \| `enteros` \| `preciso`. Valor inicial en BD: `preciso`.
- `PUT` con modo inválido → `400` (`"modo de split inválido: …"`).

---

## 8. Modelos compartidos (JSON ⇄ Kotlin)

| Concepto | Backend | Kotlin (capa `data.remote.dto`) |
|---|---|---|
| Centavos | `monto_enteros` (int64) | `Long` (nunca `Double`) |
| Basis points | `tasa_bps` (int64) | `Long` |
| Fecha de negocio | `YYYY-MM-DD` (string) | `String` (ISO local) o `LocalDate` con `@Serializable` custom |
| Timestamp | RFC3339 con offset | `String` + parser a `Instant` en el mapper |
| Nullable | `*string`, `*int64` | `String?`, `Long?` |
| Boolean | `realizado`, `split_auto`, `es_general` | `Boolean` (no nullable) |
| Enum | `metodo_pago`, `modo_calculo` | `enum class` con `@Serializable` + `SerialName` |

`monto_enteros` **debe** ser `Long` en Kotlin: los montos pueden superar `Int.MAX_VALUE` en centavos
(2.147.483.647 centavos ≈ 21.474.836,47 Bs).

---

## 9. Reglas de negocio que el backend NO valida (responsabilidad de la app)

1. **Monto editable**: la app debe deshabilitar los montos/días si el pago tiene split (el backend responde 422 `IMMUTABLE_DATA`, pero la UI lo evita).
2. **Días ≥ 1**: la app no debe permitir quitar el último día (el backend responde 400).
3. **Advertencia de 0 Bs**: una transacción de 0 Bs en una cuenta distinta de General muestra warning visual (BR-013) — el backend la acepta.
4. **`split_warning`**: el backend avisa (no falla) cuando el auto-split no se pudo generar.
5. **Tasa General**: no editable; se muestra como derivada (`100% − Σ otras`).
6. **Comprobante sin OCR** (v0.3.0): el registro es híbrido y el comprobante **no extrae datos**. La subida (multipart) sigue disponible y en Android es una mejora posterior.

---

## 10. Quirks del backend que la app debe conocer

Detectados leyendo el código (no están documentados en `backlog/api.md`):

| # | Quirk | Impacto en Android |
|---|---|---|
| Q1 | `PUT /cuentas/{id}/tasa` con `{"tasa": 0}` → **400** (`binding:"required"` sobre `float64` rechaza el cero) | Mostrar aviso: "El backend no acepta una tasa de 0 %; usa un valor mayor que 0." |
| Q2 | `PUT /fuentes/{id}` **sin `color`** escribe `color = ''` (el default `#3b82f6` solo se aplica en `POST`) | Enviar siempre `color` en cada update |
| Q3 | `meta` de `GET /pagos` devuelve `page`/`page_size` **crudos**; el cap real es 500 (el Swagger dice 100) y `total_pages` se calcula con el valor crudo | No confiar en `meta` para la UI local; calcular paginación localmente sobre Room |
| Q4 | `GET /splits` y `GET /transacciones` **no filtran** pagos soft-deleted | Al hacer pull, ignora splits cuyo pago local esté eliminado (o márcalos) |
| Q5 | `GET /pagos/{id}/split` devuelve `{"data": null}` **tanto** si el pago no tiene split **como** si el pago no existe (no 404) | Tratar `null` como "sin split" |
| Q6 | Errores de FK/UNIQUE/CHECK de Postgres se mapean a **400 `VALIDATION_ERROR`** (no 404/409). Ej.: `POST /pagos/{id}/dias` sobre un pago inexistente → 400 | Idempotencia del push: un 400 por FK puede indicar que el padre aún no existe → reintentar tras el push del padre |
| Q7 | `POST /pagos/{id}/comprobante` y `POST /cuentas/{id}/qr` guardan el archivo **antes** de validar la entidad → un 404 deja huérfanos en `uploads/` | Sin impacto en la app (el backend es el dueño del directorio) |
| Q8 | `DELETE /splits/{id}` es **hard delete** (cascade de transacciones); `DELETE /pagos|fuentes|cuentas/{id}` es **soft delete** | Reflejar distinto en la UI local: el split se borra, el resto queda con `deletedAt` |
| Q9 | No existe `version`/`etag`: la única señal de cambio es `updated_at` (que **solo** cambian los UPDATEs) | El pull compara `updated_at`; `dias_trabajados` e `historial_tasas` no tienen `updated_at` (se tratan como append-only) |
| Q10 | El offset de los timestamps depende de la sesión de Postgres (el backend no fija `TimeZone` en la conexión) | Parsear como `OffsetDateTime`/`Instant` de forma tolerante; **nunca** asumir el offset `-04:00` |
| Q11 | `GET /health` **no** lleva `data` y su campo `time` contiene la ruta, no una hora | No usar `time` como timestamp |
| Q12 | `GET /health/db` devuelve **503** con forma `{status, error{code,message}}` (distinta del error estándar) | Tratar 503 como "DB caída" |
| Q13 | `GET /transacciones?realizado=X`: cualquier valor distinto de `true`/`1` significa `false`; `split_id`/`cuenta_id` no parseables se ignoran en silencio | Enviar solo valores válidos |
| Q14 | `es_general` **no** tiene constraint UNIQUE (el backend toma la de menor `id`) | No hardcodear `id == 3` (el web sí lo hace: fallback `cuenta_id === 3`); usar siempre `es_general` |
| Q15 | `CambiarTasa` inserta el historial **antes** de recalcular pendientes y **fuera de la transacción** | Si el recálculo falla, la tasa **ya quedó registrada**: reintentar solo `aplicar_pendientes` |

---

## 11. Checklist de validación contra el backend

```bash
# Backend local (desde Abys/backend, con .env configurado)
go run ./cmd/server            # :8080

# Smoke tests con la base URL por defecto del emulador Android
curl -s http://localhost:8080/api/v1/health | jq
curl -s "http://localhost:8080/api/v1/pagos?page=1&page_size=5" | jq '.meta, (.data|length)'
curl -s "http://localhost:8080/api/v1/dashboard/summary" | jq
curl -s "http://localhost:8080/api/v1/dashboard/distribution/monthly?mes=8&anio=2026" | jq '.data'
curl -s http://localhost:8080/api/v1/cuentas | jq '.data[]|{id,alias,tasa_bps,es_general}'
curl -s http://localhost:8080/api/v1/settings/split | jq

# Error tipado (debe devolver 400 + VALIDATION_ERROR)
curl -s -X POST http://localhost:8080/api/v1/pagos -H 'Content-Type: application/json' \
  -d '{"fuente_id":1,"fecha_pago":"2026-02-31","metodo_pago":"efectivo","dias_trabajados":[{"fecha":"2026-02-31","monto_enteros":100}]}' | jq

# Error 422 TOTAL_DESINCRONIZADO (total ≠ Σ días)
curl -s -X POST http://localhost:8080/api/v1/pagos -H 'Content-Type: application/json' \
  -d '{"fuente_id":1,"fecha_pago":"2026-08-14","monto_enteros":999,"metodo_pago":"efectivo","dias_trabajados":[{"fecha":"2026-08-10","monto_enteros":100}]}' | jq
```
