# Arquitectura

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Go 1.26, Gin, pgx/v5 (sin ORM) |
| Base de datos | PostgreSQL (local, sin Docker) |
| Migraciones | golang-migrate (versionadas en `backend/migrations/`) |
| API | REST + Swagger (swaggo), prefijo `/api/v1` |
| Configuración | `.env` + variables de entorno (godotenv) |
| Frontend | React 19 + TypeScript + Vite |
| Estilos | Tailwind CSS + shadcn/ui |
| Gráficos | Recharts |
| Estado | TanStack Query (server state) + Zustand (solo UI) |
| Notificaciones | Sonner |

## Backend

Estructura en `backend/`:

- `cmd/server` — punto de entrada (carga config, conecta DB, arranca el router).
- `internal/config` — lectura de configuración por entorno.
- `internal/database` — conexión pgxpool.
- `internal/model` — entidades.
- `internal/repository` — acceso a datos (SQL directo).
- `internal/service` — lógica de negocio y validaciones.
- `internal/handler` — handlers HTTP + uploads.
- `internal/router` — registro de rutas y middlewares (CORS multi-origen, logger, recovery).
- `internal/splitcalc` — cálculo de splits (3 modos) con tests unitarios.
- `migrations` — migraciones golang-migrate (schema, seed, datos históricos).
- `docs` — Swagger generado.

El backend sirve además: `/uploads` (estáticos, no-cache) y `/swagger`.

## Frontend

Estructura en `web/src/`:

- `features/` — una carpeta por vista: `dashboard`, `registrar`, `ingresos`, `splits`, `configuracion`, `health`.
- `components/ui/` — componentes shadcn/ui.
- `components/layout/` — sidebar y layout general.
- `services/` — cliente HTTP (fetch), hooks de TanStack Query y tipos (sin OCR).
- `store/` — Zustand (sidebar, tema).
- `lib/` — utilidades (formato de montos Bs ↔ centavos, reparto equitativo `distribuir.ts`, fechas, validadores de formulario, mapeo de errores de API y validación de uploads) con tests.
- `components/form/` — `FieldError`, `ErrorSummary` y `ConfirmarDescarteDialog`.
- **Histórico (bloque C):** en `/ingresos` y `/splits` la URL es fuente de verdad del estado aplicado (`rango`/`desde`/`hasta`/`fuente`/`metodo`; `?tab=` en `/configuracion`). El histórico se agrupa por año en secciones colapsables con carga bajo demanda y “Cargar más” (tope efectivo `page_size` 500). En `/splits` los filtros afectan solo la lista; los totales de cabecera y “Pendiente por cuenta” permanecen globales (D8). El `meta theme-color` se sincroniza dinámicamente con el tema leyendo el token de fondo y escribiéndolo en rgb/hex (valor inicial estático en HTML). Limitaciones conocidas: índice de años en `/splits` basado en pagos (D-A, año con pagos sin splits puede mostrarse vacío), tope 500 y harness AA smoke-level.

- **Dashboard v2 (0.3.0):** los charts se calculan desde `dias_trabajados.monto_enteros` agrupados por `dias_trabajados.fecha` y uniendo `pagos` activos con `fuentes` (incluidas las soft-deleted, para conservar alias/color históricos). Semanal apilado por fuente, mensual por bloques del mes, anual por mes, histórico sin tendencia y tortas de distribución mes/año por fuente. Cada gráfico expone figura con nombre/descripción, tabla alternativa `sr-only`, `accessibilityLayer` de Recharts, patrones por fuente y contraste AA (ninguno depende solo del color). `/dashboard` y `/registrar` usan un único scroll del documento.

### Decisiones del bloque `ajustes-registrar-splits` (0.4.0)

- **D4 — Defaults en backend con réplica/fallback en `abys-ui`.** Precedencia: el backend manda si responde; el store persistido de Zustand (`abys-ui`, localStorage) se consulta solo si la petición falla (5xx, red caída o timeout) y sirve además de caché optimista. `GET/PUT /settings/registrar` persisten `registrar_metodo_default` y `registrar_modo_default` en `app_settings` con whitelist (`efectivo|qr|transaccion`, `detallado|distribuido`); la respuesta se normaliza contra esa whitelist antes de replicarla en `abys-ui`. En `/config` (pestaña "Registro") la escritura es optimista en local + PUT al backend; si el PUT falla se revierte al valor previo y se notifica. El modo de redondeo no se replica: se inicializa desde `split_modo_default` (`useSplitSettings`) con fallback local y sigue siendo editable en el formulario.
- **Resolución de la cuenta General (D8 de este bloque; no confundir con el D8 del bloque C).** Se identifica por la columna `es_general`: backend vía `cuenta_repo.GetGeneral` (inyectado en `SplitService`/`SplitHandler`; en el handler se resuelve una vez por request) y frontend a partir de `cuentas[].es_general`. **No se usa el id `3` hardcodeado** para excluirla de `split.total_pendiente` ni del "Pendiente total" / "Pendiente por cuenta". Es un cambio de agregado sin cambio de esquema ni reescritura de datos: las transacciones de General permanecen con `realizado = false` y su fila sigue visible como reserva informativa. Queda pendiente, fuera de este bloque, el fallback con id fijo en `RealizarTxDialog`.

## Formularios

- Los 6 formularios con submit usan `<form noValidate>` con nombre accesible, labels/fieldsets y `*` en obligatorios; la validación corre en `blur`/submit y los errores se muestran inline + resumen (`useFormErrors`). `SplitsTab` sigue siendo un select autoguardado sin `<form>`.
- **Guardia de cambios:** `useBlocker` de React Router v7 para navegación interna y `ConfirmarDescarteDialog` (`AlertDialog`) para cierre de diálogos. No se registra `beforeunload`: recargar o cerrar la pestaña no se intercepta (limitación aceptada).
- **Errores de API:** `lib/api-errors.ts` mapea `ApiRequestError` (`code`/`status`) de forma explícita por formulario a un campo o al resumen; los mensajes del backend se muestran tal cual. Los hooks de mutación usados por formularios no emiten `toast.error` (el error va inline); las acciones fuera de formularios conservan el toast.
- **Uploads:** `lib/uploads.ts` define los tipos permitidos (PNG/JPEG/WEBP/GIF) y `MAX_UPLOAD_MB = 10` (`10 * 1024 * 1024`), alineado con `MaxUploadSize` del backend. El rechazo por tipo/tamaño se valida antes de llamar a la API y se muestra inline en comprobante, logo o QR.

## Base de datos

Tablas principales: `fuentes`, `pagos`, `dias_trabajados`, `cuentas`, `historial_tasas`, `splits`, `transacciones`.

Puntos clave del diseño:

- Montos en **centavos enteros (BIGINT)**; conversión solo al visualizar.
- `dias_trabajados.monto_enteros` (BIGINT, ≥ 0) guarda el monto de **cada día trabajado**; `pagos.monto_enteros` se **deriva** en el backend como Σ de los días de ese pago (el backend ignora el total del cliente y rechaza con `422` si no coincide). La migración de backfill reparte los montos históricos entre los días y crea un día sintético para pagos sin días.
- `transacciones` guarda snapshot de alias y tasa al momento de la creación (los datos históricos no dependen del estado actual de la cuenta).
- Una cuenta `General` permanente absorbe residuos de redondeo y diferencias de recálculo.
- Soft delete con auditoría; los registros ocultos siguen visibles en histórico.

Más detalle de reglas en [`reglas-de-negocio.md`](reglas-de-negocio.md).