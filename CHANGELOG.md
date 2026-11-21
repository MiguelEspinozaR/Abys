# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.
El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/)
y este proyecto sigue [SemVer](https://semver.org/lang/es/).

## [No publicado]

## [0.4.0] - 2026-11-20

### Añadido

- **Defaults de registro configurables:** nueva pestaña "Registro" en `/configuracion` con selects de método de pago (`efectivo`/`qr`/`transaccion`) y modo de registro (`detallado`/`distribuido`), autoguardado optimista con reversión en error; respaldados por `GET/PUT /settings/registrar` y replicados en el store local `abys-ui` con fallback cuando el backend no responde.
- **Puntos por fuente en el calendario:** los días trabajados de `/registrar` muestran hasta 3 puntos del color de sus fuentes (las de mayor monto en el día, desempate por `fuente_id`), conservando verde (selección) y ámbar (fecha de pago) y con leyenda textual accesible.
- **Pendientes en "Ver datos" (`/splits`):** lista de transacciones pendientes de la cuenta con checkboxes etiquetados y subtotal en vivo de las filas marcadas, separado del "Pendiente" de la cuenta; estado vacío explícito. Marcar no persiste: no se llama a `PUT /transacciones/:id/realizar`.
- **QR ampliable en `/splits`:** la imagen del QR de "Ver datos" abre un lightbox (`fixed inset-0 z-50`) con cierre por Escape, clic fuera y botón accesible. No se añaden comprobantes a `/splits`.

### Cambiado

- **Permanencia en `/registrar`:** tras guardar un pago (incluida la ruta de reintento de comprobante) ya no se navega a `/ingresos`; la vista se queda en `/registrar` con el formulario limpio, el guard de cambios re-baselineado y el toast de éxito intacto.
- `/registrar` inicializa método y modo desde los defaults configurables (backend con precedencia, `abys-ui` como fallback) y el modo de redondeo desde `split_modo_default` (`preciso` por defecto), manteniendo el selector editable y el payload de pago sin el modo.
- Versión del frontend a `0.4.0` (`web/package.json` y ambos campos `version` de `web/package-lock.json`).

### Corregido

- **General excluida de los pendientes:** `SplitsPage` y `splitJSON().total_pendiente` ya no suman las transacciones de la cuenta General (reserva); se resuelve por `es_general` / `cuenta_repo.GetGeneral`, sin id fijo, sin cambio de esquema y sin reescribir transacciones históricas. La fila de General sigue visible con valor informativo.

> La versión `0.4.0` fue desplegada a `test3` el 2026-11-20 y verificada health-check (migración `000007`, defaults `/settings/registrar`, exclusión General verificada en 21 splits) **sin tag ni release en GitHub**.

## [0.3.0] - 2026-11-17

### Añadido

- **Monto por día trabajado:** cada `dias_trabajados` registra su propio `monto_enteros` (centavos); el total del pago se deriva en el backend como la suma de sus días.
- **Registro híbrido:** modos "Detallado" (un monto por día, total calculado) y "Distribuido" (un total a repartir) con modos de redondeo `redondeado` / `enteros` / `preciso` y residuo al último día (`lib/distribuir.ts`, espejo de `splitcalc`). El modo es solo estado de UI.
- **Backfill histórico:** la migración reparte equitativamente el monto de cada pago entre sus días (base = total / n, sobrante al último día por `fecha`, luego `id`) y crea un día sintético en `fecha_pago` para los pagos sin días, de modo que Σ días = total del pago.
- **Gráficos por día y por fuente (calculados desde `dias_trabajados.fecha`):** semanal con barras apiladas por fuente (color + patrón, leyenda y tooltip desglosado), mensual por bloques del mes (1–7, 8–14, 15–21, 22–28, 29–fin de mes) y anual por mes, ambos de barras simples.
- **Tortas de distribución por fuente** del mes y del año, con porcentajes visibles, leyenda, patrones y navegación ‹ ›; estado vacío cuando el período no tiene datos.
- **Cards de resumen:** "Total últimos 30 días" (Σ de días en los últimos 30 días calendario, `America/La_Paz`) y "Total histórico".
- **API del dashboard:** 7 endpoints de agregación (`summary`, `weekly`, `monthly`, `yearly`, `history`, `distribution/monthly`, `distribution/yearly`), en centavos e incluyendo fuentes soft-deleted para preservar alias y colores históricos.
- **Accesibilidad:** leyenda y patrones por fuente, tooltips textuales y tablas `sr-only` para que ningún gráfico dependa solo del color.

### Cambiado

- `pago.monto_enteros` pasa a ser un valor derivado: el backend ignora el total enviado por el cliente y responde `422` (`TOTAL_DESINCRONIZADO`) si no coincide con la suma de los días.
- Contrato de días (breaking): `dias_trabajados` viaja como objetos `{ fecha, monto_enteros }` en requests y respuestas (las respuestas añaden `id` y `pago_id`).
- `GET /dashboard/summary` ya no toma `mes`/`anio` y reporta totales de 30 días e histórico; el histórico deja de incluir la serie de tendencia.
- Montos por día y distribución equitativa reutilizan la semántica de redondeo de Splits, sin añadir dependencias.
- Versión del frontend a `0.3.0` (`web/package.json` y `web/package-lock.json`).

### Eliminado

- El **OCR** del registro (servicio, botón, resumen y test) y la dependencia **`tesseract.js`**; se conserva el comprobante adjunto y su reintento.
- La línea de tendencia (media móvil) del gráfico histórico.
- Las cards "Días trabajados" y "Pagos" del dashboard.

### Corregido

- Doble scroll anidado en `/dashboard` y `/registrar`: ambos usan un único scroll del documento.

> La versión `0.3.0` fue desplegada a `test3` por reinicio manual de `abys-backend`/`abys-frontend` y verificada **sin tag ni release en GitHub**.

## [0.2.0] - 2026-11-17

### Añadido

- Accesibilidad AA (bloque A): foco visible en paneles de tabs, contraste reforzado en ambos temas, áreas táctiles de 44 px en móvil, respeto de movimiento reducido y skip link.
- Formularios accesibles (bloque B): labels, fieldsets y errores inline semánticos; guardia de cambios sin guardar; validación de uploads, reintento de comprobante y reversión de splits; bloqueo de edición posterior al pago.
- Histórico accesible (bloque C): filtros y rango como fuente de verdad en la URL, agrupación por año con carga bajo demanda, `SplitFila` y componentes de histórico.
- Dashboard accesible: `ChartFigure`, `TablaDatos` y `ChartPatterns` como alternativa textual/patrón a los gráficos, y `theme-color` dinámico sincronizado con el tema.
- Navegación móvil con panel desplegable desde el logo y tarjetas apiladas en las listas de Ingresos y Splits.

### Cambiado

- Sustitución de `transition-all` por transiciones específicas.
- Migración de los scripts de despliegue a systemd (`abys-backend` / `abys-frontend`).

### Corregido

- `theme-color` calculado en oklch: conversión a rgb/hex.
- Doble push de historial al alternar `?tab=`.
- Medición de contraste sobre colores oklch.
- Pérdida de foco al usar el backdrop y al "seguir editando".
- Contraste del resumen OCR y áreas táctiles.

## [0.1.0] - 2026-09-14

### Añadido

- Versión inicial: backlog del proyecto, Ingresos (OCR de monto/descripción y comprobante), splits automáticos por fuente con logo y modo por defecto, pendiente por cuenta, configuración de splits y calendario de días de pago.
