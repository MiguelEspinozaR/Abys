# Backlog del proyecto

Lista de funcionalidades, su estado actual y el plan a futuro.

## Features

| Feature | Descripción | Estado |
|---|---|---|
| Dashboard | 4 vistas: semanal, mensual, anual e histórico con tendencia (Recharts) | Completado |
| Registrar pago | Calendario de días trabajados, fecha, monto, fuente, método (efectivo/QR/transacción), notas y comprobante con drag & drop + OCR opcional (Tesseract.js) que detecta monto debitado, fecha y descripción (no marca días automáticamente) y muestra un resumen de lo detectado | Completado |
| Ingresos | Listado de pagos agrupado por año, filtros (fecha, fuente, método), miniatura de comprobante con visor (lightbox), generar split desde cada fila (ícono con tooltip), editar y eliminar (restringido si hay transacciones realizadas) | Completado |
| Splits | Distribución de un pago entre cuentas: 3 modos de cálculo (redondeado, entero, preciso), snapshot de tasas, recalcular pendientes y marcar transacciones realizadas (modal con QR). Lista únicamente los pagos con split; se generan desde la pestaña Ingresos. Muestra el pendiente total por cuenta con acceso a sus datos (QR, banco y número) | Completado |
| Configuración | CRUD de fuentes (alias, color, logo con subida de archivo), modo de split por defecto y split automático por fuente; CRUD de cuentas (alias, número, banco, QR), tasas con historial y opción "aplicar a pendientes" | Completado |
| Health checker | Estado de la conexión a la base de datos, latencia, versión de PostgreSQL, tamaño y conteo por tabla. Reemplaza al antiguo "SQL tab" (sin ejecución arbitraria de SQL) | Completado |
| Sidebar colapsable | Estilo IDE: 3 zonas (logo, secciones Finanzas/Sistema, tema + colapso), dark/light mode. "Configuración" aparece una sola vez, en el grupo Sistema | Completado |

## Datos

- Base de datos: `Abys` (PostgreSQL local).
- Datos históricos migrados desde el proyecto anterior: **188 pagos, 359 días trabajados, 3 fuentes, 3 cuentas, 9 splits, 27 transacciones** (línea base validada).
- Moneda: BOB; los montos se almacenan como centavos enteros (BIGINT).

## Roadmap

### Hecho
- [x] Backend completo: modelo de datos, migraciones, API REST + Swagger, validaciones y reglas de negocio.
- [x] Frontend completo: 6 vistas conectadas a la API, sidebar colapsable, dark/light.
- [x] Despliegue: scripts `deploy.sh` / `status.sh` / `stop.sh`, túnel Cloudflare hacia `test3.mikylab.com`.

### Pendiente (orden propuesto)
- [ ] Seguridad del despliegue: login/autenticación (la app está pública sin login en v1, riesgo conocido).
- [ ] Evitar indexación: `robots.txt` o `X-Robots-Tag: noindex` en `test3.mikylab.com`.
- [ ] Validación de tamaño máximo de imagen en el comprobante (frontend).
- [x] Liberar el objeto `URL.createObjectURL` tras usarlo en el dropzone (memoria).
- [ ] Quitar el id de cuenta fijo como fallback (General) en el diálogo de transacción.
- [ ] App móvil (Flutter) — fuera de alcance por ahora.
- [ ] Multi-idioma — fuera de alcance por ahora (UI en español).

## Notas operativas

- El proyecto anterior (`finanzasMikyGo`) sigue desplegado en `test.mikylab.com` con los puertos 8080/5173; los scripts de Abys usan **8081** (backend) y **5178** (frontend) para no interferir.
- El túnel Cloudflare (`mikylab`) y nginx son compartidos entre proyectos; no se deben reiniciar a la ligera.