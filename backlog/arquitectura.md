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
- `lib/` — utilidades (formato de montos Bs ↔ centavos, fechas) con tests.

## Base de datos

Tablas principales: `fuentes`, `pagos`, `dias_trabajados`, `cuentas`, `historial_tasas`, `splits`, `transacciones`.

Puntos clave del diseño:

- Montos en **centavos enteros (BIGINT)**; conversión solo al visualizar.
- `transacciones` guarda snapshot de alias y tasa al momento de la creación (los datos históricos no dependen del estado actual de la cuenta).
- Una cuenta `General` permanente absorbe residuos de redondeo y diferencias de recálculo.
- Soft delete con auditoría; los registros ocultos siguen visibles en histórico.

Más detalle de reglas en [`reglas-de-negocio.md`](reglas-de-negocio.md).