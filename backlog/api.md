# API REST

Prefijo base: `/api/v1`. Errores en formato consistente:

```json
{ "error": { "code": "<codigo>", "message": "<mensaje>", "details": "..." } }
```

Estados usados: 400 (validación), 404 (no encontrado), 409 (conflicto/regla de negocio), 422 (`IMMUTABLE_DATA` — inmutabilidad — y `TOTAL_DESINCRONIZADO` — el total enviado no coincide con la suma de los días), 500.

## Pagos y días trabajados

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/pagos` | Crear pago (con días trabajados) |
| GET | `/pagos` | Listar (filtros: fecha_inicio, fecha_fin, fuente_id, metodo_pago, page, page_size) |
| GET | `/pagos/:id` | Detalle |
| PUT | `/pagos/:id` | Actualizar (con reglas de splits/transacciones) |
| DELETE | `/pagos/:id` | Eliminar (bloqueado si hay transacciones realizadas) |
| POST | `/pagos/:id/dias` | Agregar día trabajado (con `fecha` y `monto_enteros`) |
| DELETE | `/pagos/:id/dias/:diaId` | Eliminar día trabajado (mínimo 1) |
| POST | `/pagos/:id/comprobante` | Subir imagen de comprobante (solo archivo; no hay OCR) |
| GET | `/pagos/:id/split` | Split del pago |

### Contrato de días trabajados (0.3.0, breaking)

`POST /pagos`, `PUT /pagos/:id` y `POST /pagos/:id/dias` usan días como objetos con monto en centavos:

```json
{
  "fuente_id": 1,
  "fecha_pago": "2026-10-22",
  "monto_enteros": 60000,
  "metodo_pago": "transaccion",
  "dias_trabajados": [
    { "fecha": "2026-10-20", "monto_enteros": 20000 },
    { "fecha": "2026-10-21", "monto_enteros": 20000 },
    { "fecha": "2026-10-22", "monto_enteros": 20000 }
  ]
}
```

- En respuestas, cada día añade `id` y `pago_id` (`dias_trabajados: [{ id, pago_id, fecha, monto_enteros }]`).
- `monto_enteros` del pago es **derivado**: el backend persiste Σ de los días e ignora el total del cliente. Si el cliente envía un total `> 0` distinto de la suma, responde `422` con código `TOTAL_DESINCRONIZADO`.
- Vigentes: al menos un día, `monto_enteros >= 0` por día, fechas únicas dentro del pago, y rechazo `422` (`IMMUTABLE_DATA`) si se cambia la suma de días de un pago con split.

> **Nota (bloque C, frontend):** el histórico de `/ingresos` consume `GET /pagos` con los mismos parámetros y aplica rangos por año en cliente mediante `fecha_inicio`/`fecha_fin`; la carga es bajo demanda por sección con `page_size` efectivo hasta 500 y “Cargar más” cuando hay más páginas. No hay cambios de contrato backend/API.

## Fuentes

| Método | Ruta | Descripción |
|---|---|---|
| POST / GET | `/fuentes` | Crear/listar (incluye `split_auto` y `split_auto_modo`) |
| PUT / DELETE | `/fuentes/:id` | Actualizar/eliminar (soft delete) |
| POST | `/fuentes/:id/logo` | Subir logo (multipart `archivo`) |
| DELETE | `/fuentes/:id/logo` | Eliminar logo |

## Cuentas y tasas

| Método | Ruta | Descripción |
|---|---|---|
| POST / GET | `/cuentas` | Crear/listar |
| GET / PUT / DELETE | `/cuentas/:id` | Detalle/actualizar/eliminar |
| POST | `/cuentas/:id/qr` | Subir QR |
| DELETE | `/cuentas/:id/qr` | Eliminar QR |
| GET | `/cuentas/:id/historial-tasas` | Historial de tasas |
| PUT | `/cuentas/:id/tasa` | Cambiar tasa — body `{ tasa, aplicar_pendientes }` |

## Splits y transacciones

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/splits` | Generar split para un pago (atómico) |
| GET | `/splits` | Listar |
| GET | `/splits/:id` | Detalle |
| PUT | `/splits/:id` | Recalcular (respetando transacciones realizadas) |
| DELETE | `/splits/:id` | Eliminar (elimina pendientes; rechaza si hay realizadas) |
| GET | `/transacciones` | Listar transacciones |
| PUT | `/transacciones/:id/realizar` | Marcar realizada (congela monto y tasa) |

## Dashboard (0.3.0)

Todos los importes están en **centavos** y se agrupan por `dias_trabajados.fecha`, uniendo `pagos` activos con `fuentes`. Se incluyen fuentes soft-deleted para preservar `alias` y `color` históricos. Las respuestas van envueltas en `{ "data": ... }`.

| Método | Ruta | Respuesta (`data`) |
|---|---|---|
| GET | `/dashboard/summary` (sin parámetros) | `{ total_30d_centavos, total_historico_centavos }` — 30 días calendario en `America/La_Paz` (incluye hoy) y Σ histórica de días |
| GET | `/dashboard/weekly?fecha=` | `{ semana_inicio, semana_fin, dias: [{ fecha, total_centavos, por_fuente: [{ fuente_id, alias, color, total_centavos }] }] }` — lunes–domingo, 7 días rellenados |
| GET | `/dashboard/monthly?mes=&anio=` | `{ mes, anio, bloques: [{ bloque, inicio, fin, total_centavos }] }` — bloques 1–7, 8–14, 15–21, 22–28, 29–fin de mes (29–31 en meses de 31 días) |
| GET | `/dashboard/yearly?anio=` | `{ anio, meses: [{ mes, total_centavos }] }` — 12 meses |
| GET | `/dashboard/history` | `{ por_mes: [{ anio, mes, total_centavos }] }` — totales mensuales, **sin tendencia** |
| GET | `/dashboard/distribution/monthly?mes=&anio=` | `{ mes, anio, total_centavos, por_fuente: [{ fuente_id, alias, color, total_centavos }] }` |
| GET | `/dashboard/distribution/yearly?anio=` | `{ anio, total_centavos, por_fuente: [{ fuente_id, alias, color, total_centavos }] }` |

`por_fuente` está ordenado por total descendente y `fuente_id`; el estado vacío se representa con totales en cero y lista vacía.

## Health

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Ping |
| GET | `/health/db` | Conexión, latencia, versión PostgreSQL, tamaño DB, tablas con conteos |

## Configuración

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/settings/split` | Modo de split por defecto |
| PUT | `/settings/split` | Cambiar modo por defecto — body `{ modo_default }` |

## Convenciones

- Montos: `monto_enteros` en centavos (26500 = 265.00 Bs).
- Tasas: `tasa_bps` en basis points (2000 = 20%).
- Zona horaria: `America/La_Paz` (UTC-4).
- CORS: multi-origen separado por comas (`CORS_ORIGIN`); en producción incluye `https://test3.mikylab.com`.
- Uploads (`/pagos/:id/comprobante`, `/fuentes/:id/logo`, `/cuentas/:id/qr`): multipart con campo `archivo`; tipos permitidos PNG/JPEG/WEBP/GIF y tamaño máximo **10 MB** (`MAX_UPLOAD_SIZE`, default `MaxUploadSize: 10`). Un archivo inválido responde `VALIDATION_ERROR` (400). El cliente valida el mismo límite (10×1024×1024 bytes) antes de enviar.
- Errores en formularios: el cliente lanza `ApiRequestError` con `code` y `status`; el mapeo a campo o resumen es explícito por formulario en `web/src/lib/api-errors.ts` (`VALIDATION_ERROR` 400, `BUSINESS_RULE_CONFLICT` 409, `IMMUTABLE_DATA` 422, `TOTAL_DESINCRONIZADO` 422 — ambos resueltos por el estado 422 —, `NETWORK_ERROR` status 0 con reintento, `INTERNAL_ERROR`/500 y desconocidos al resumen). El mensaje del backend se muestra tal cual y los formularios no lo duplican con `toast.error`; el toast se reserva para acciones fuera de formularios.
- **Sin OCR:** no existe extracción de monto/fecha/descripción desde el comprobante; `/pagos/:id/comprobante` recibe solo la imagen, con los mismos tipos y límite de 10 MB.