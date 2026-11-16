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
| OCR | Tesseract.js (solo cliente) |

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
- `services/` — cliente HTTP (fetch), hooks de TanStack Query, OCR, tipos.
- `store/` — Zustand (sidebar, tema).
- `lib/` — utilidades (formato de montos Bs ↔ centavos, fechas, validadores de formulario, mapeo de errores de API y validación de uploads) con tests.
- `components/form/` — `FieldError`, `ErrorSummary` y `ConfirmarDescarteDialog`.
- **Histórico (bloque C):** en `/ingresos` y `/splits` la URL es fuente de verdad del estado aplicado (`rango`/`desde`/`hasta`/`fuente`/`metodo`; `?tab=` en `/configuracion`). El histórico se agrupa por año en secciones colapsables con carga bajo demanda y “Cargar más” (tope efectivo `page_size` 500). En `/splits` los filtros afectan solo la lista; los totales de cabecera y “Pendiente por cuenta” permanecen globales (D8). El `meta theme-color` se sincroniza dinámicamente con el tema leyendo el token de fondo y escribiéndolo en rgb/hex (valor inicial estático en HTML). Los 4 gráficos del dashboard exponen figura con nombre/descripción, tabla alternativa `sr-only`, `accessibilityLayer` de Recharts, patrones/markers y contraste AA en escala de grises. Limitaciones conocidas: índice de años en `/splits` basado en pagos (D-A, año con pagos sin splits puede mostrarse vacío), tope 500 y harness AA smoke-level.

## Formularios

- Los 6 formularios con submit usan `<form noValidate>` con nombre accesible, labels/fieldsets y `*` en obligatorios; la validación corre en `blur`/submit y los errores se muestran inline + resumen (`useFormErrors`). `SplitsTab` sigue siendo un select autoguardado sin `<form>`.
- **Guardia de cambios:** `useBlocker` de React Router v7 para navegación interna y `ConfirmarDescarteDialog` (`AlertDialog`) para cierre de diálogos. No se registra `beforeunload`: recargar o cerrar la pestaña no se intercepta (limitación aceptada).
- **Errores de API:** `lib/api-errors.ts` mapea `ApiRequestError` (`code`/`status`) de forma explícita por formulario a un campo o al resumen; los mensajes del backend se muestran tal cual. Los hooks de mutación usados por formularios no emiten `toast.error` (el error va inline); las acciones fuera de formularios conservan el toast.
- **Uploads:** `lib/uploads.ts` define los tipos permitidos (PNG/JPEG/WEBP/GIF) y `MAX_UPLOAD_MB = 10` (`10 * 1024 * 1024`), alineado con `MaxUploadSize` del backend. El rechazo por tipo/tamaño se valida antes de llamar a la API y se muestra inline en comprobante, logo o QR.

## Base de datos

Tablas principales: `fuentes`, `pagos`, `dias_trabajados`, `cuentas`, `historial_tasas`, `splits`, `transacciones`.

Puntos clave del diseño:

- Montos en **centavos enteros (BIGINT)**; conversión solo al visualizar.
- `transacciones` guarda snapshot de alias y tasa al momento de la creación (los datos históricos no dependen del estado actual de la cuenta).
- Una cuenta `General` permanente absorbe residuos de redondeo y diferencias de recálculo.
- Soft delete con auditoría; los registros ocultos siguen visibles en histórico.

Más detalle de reglas en [`reglas-de-negocio.md`](reglas-de-negocio.md).