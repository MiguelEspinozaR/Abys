# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.
El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/)
y este proyecto sigue [SemVer](https://semver.org/lang/es/).

## [No publicado]

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
