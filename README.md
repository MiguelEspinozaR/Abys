# Abys

Gestor personal de ingresos laborales (bolivianos — BOB). Sucesor de finanzasMikygo.

- **Backend:** Go 1.26 + Gin + PostgreSQL (pgx/v5), API REST con Swagger (`backend/docs`).
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4 (shadcn/ui) + TanStack Query + React Router 7 + Recharts.
- **Despliegue:** scripts propios sobre systemd (`abys-backend` / `abys-frontend`) y túnel Cloudflare.

## Funcionalidades

- **Ingresos:** registro con OCR de monto/descripción, comprobante adjunto y marca de días de pago ya registrados en el calendario.
- **Splits:** generación automática por fuente (logo y modo por defecto), pendiente por cuenta y creación desde Ingresos.
- **Histórico:** agrupación por año con carga bajo demanda y filtros/rango como fuente de verdad en la URL.
- **Dashboard:** gráficos con alternativa accesible (tabla de datos + patrones) y `theme-color` sincronizado con el tema.
- **Accesibilidad AA:** foco visible, contraste, áreas táctiles de 44 px, respeto de movimiento reducido y skip link.
- Tema claro/oscuro y navegación móvil con panel desplegable.

## Requisitos

- Go 1.26+, Node 22+ y PostgreSQL.
- Detalles de arquitectura y modelo de datos en [`backlog/arquitectura.md`](backlog/arquitectura.md).

## Desarrollo

Backend:

```bash
cd backend
go run ./cmd/server
```

La configuración se lee de `backend/.env` (no versionado; no subir secretos).

Frontend:

```bash
cd web
npm install
npm run dev
```

`VITE_API_URL` define la base de la API (por ejemplo `http://localhost:8081/api/v1`).

## Pruebas

```bash
cd backend && go test ./...
cd web && npm test && npm run build
```

## Despliegue

Scripts sobre systemd; ver [`backlog/despliegue.md`](backlog/despliegue.md).

```bash
./deploy.sh   # compila y reinicia las units + healthchecks
./status.sh   # estado de los servicios
./stop.sh     # detiene los servicios
```

## Versión

0.2.0 — ver [`CHANGELOG.md`](CHANGELOG.md).

## Documentación

Toda la documentación del proyecto está en [`backlog/`](backlog/).
