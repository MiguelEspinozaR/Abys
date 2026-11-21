# Abys

Gestor personal de ingresos laborales (bolivianos — BOB). Sucesor de finanzasMikygo.

- **Backend:** Go 1.26 + Gin + PostgreSQL (pgx/v5), API REST con Swagger (`backend/docs`).
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4 (shadcn/ui) + TanStack Query + React Router 7 + Recharts.
- **Despliegue:** scripts propios sobre systemd (`abys-backend` / `abys-frontend`) y túnel Cloudflare.

## Funcionalidades

- **Ingresos:** registro de pagos con un **monto por cada día trabajado** (el total del pago es la suma de sus días), comprobante adjunto y calendario con hasta **3 puntos por fuente** (las de mayor monto en el día; verde = selección, ámbar = fecha de pago, con leyenda textual). El alta puede ser **detallada** (monto por día) o **distribuida** (un total repartido con modos `redondeado`/`enteros`/`preciso`). Tras guardar, la vista **permanece en `/registrar`** con el formulario limpio (también al reintentar el comprobante); no se salta a `/ingresos`. El método, el modo de alta y el redondeo arrancan con los valores configurados, pero siguen siendo editables. No hay OCR.
- **Splits:** generación automática por fuente (logo y modo por defecto), pendiente por cuenta y creación desde Ingresos. "Ver datos" muestra los pendientes de la cuenta con checkboxes y un subtotal en vivo de la selección (no marca transacciones como realizadas) y permite ampliar el QR. La cuenta **General (reserva)** no suma al pendiente, pero su fila sigue visible con valor informativo.
- **Histórico:** agrupación por año con carga bajo demanda y filtros/rango como fuente de verdad en la URL.
- **Dashboard:** gráficos calculados **por día y por fuente**: semanal apilado por fuente, mensual por bloques del mes, anual por mes, histórico sin tendencia y tortas de distribución mes/año por fuente. Cards de "Total últimos 30 días" y "Total histórico". Alternativa accesible (tabla de datos + patrones) y `theme-color` sincronizado con el tema.
- **Accesibilidad AA:** foco visible, contraste, áreas táctiles de 44 px, respeto de movimiento reducido, skip link y un único scroll del documento en `/dashboard` y `/registrar`.
- **Configuración:** en `/configuracion`, pestaña "Registro", se pueden fijar el **método de pago** (`efectivo`/`qr`/`transaccion`) y el **modo de registro** (`detallado`/`distribuido`) por defecto; se guardan en el backend (`GET/PUT /settings/registrar`) y se replican en el navegador (`abys-ui`). Si el backend no responde, `/registrar` usa esos valores locales; el guardado es optimista y se revierte si el PUT falla.
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

0.4.0 — ver [`CHANGELOG.md`](CHANGELOG.md).
Desplegada a `test3` el 2026-11-20; no tag ni release creado.

## Documentación

Toda la documentación del proyecto está en [`backlog/`](backlog/).
