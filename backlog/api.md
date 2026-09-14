# API REST

Prefijo base: `/api/v1`. Errores en formato consistente:

```json
{ "error": { "code": "<codigo>", "message": "<mensaje>", "details": "..." } }
```

Estados usados: 400 (validación), 404 (no encontrado), 409 (conflicto/regla de negocio), 422 (immutabilidad), 500.

## Pagos y días trabajados

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/pagos` | Crear pago (con días trabajados) |
| GET | `/pagos` | Listar (filtros: fecha_inicio, fecha_fin, fuente_id, metodo_pago, page, page_size) |
| GET | `/pagos/:id` | Detalle |
| PUT | `/pagos/:id` | Actualizar (con reglas de splits/transacciones) |
| DELETE | `/pagos/:id` | Eliminar (bloqueado si hay transacciones realizadas) |
| POST | `/pagos/:id/dias` | Agregar día trabajado |
| DELETE | `/pagos/:id/dias/:diaId` | Eliminar día trabajado (mínimo 1) |
| POST | `/pagos/:id/comprobante` | Subir imagen de comprobante (el OCR corre en cliente) |
| GET | `/pagos/:id/split` | Split del pago |

## Fuentes

| Método | Ruta |
|---|---|
| POST / GET | `/fuentes` |
| PUT / DELETE | `/fuentes/:id` |

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

## Dashboard

| Método | Ruta |
|---|---|
| GET | `/dashboard/summary?mes=&anio=` |
| GET | `/dashboard/weekly?fecha=` |
| GET | `/dashboard/monthly?mes=&anio=` |
| GET | `/dashboard/yearly?anio=` |
| GET | `/dashboard/history` |

## Health

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Ping |
| GET | `/health/db` | Conexión, latencia, versión PostgreSQL, tamaño DB, tablas con conteos |

## Convenciones

- Montos: `monto_enteros` en centavos (26500 = 265.00 Bs).
- Tasas: `tasa_bps` en basis points (2000 = 20%).
- Zona horaria: `America/La_Paz` (UTC-4).
- CORS: multi-origen separado por comas (`CORS_ORIGIN`); en producción incluye `https://test3.mikylab.com`.