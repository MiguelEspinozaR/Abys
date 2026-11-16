# M4 — A11y de gráficos Recharts (R6)

- Entrega: nombre/descripción, tabla alternativa sr-only, `accessibilityLayer`, patrones/markers y contraste AA en 4 gráficos.
- Archivos producto (working tree): `web/src/features/dashboard/ChartFigure.tsx`, `TablaDatos.tsx`, `ChartPatterns.tsx`, `ChartCard.tsx`, `DashboardPage.tsx`, `WeeklyChart.tsx`, `MonthlyYearlyCharts.tsx`, `HistoryChart.tsx`, `ChartTooltip.tsx`, `web/src/lib/chartTheme.ts`, `web/src/index.css`.
- Verificación: `accessibilityLayer` presente en los 4 charts (`LineChart`/3x`BarChart`); tablas sr-only y descripción asociada por figura.
- Resultado: paleta grayscale con luminancias ajustadas por tema para AA, patrones SVG estáticos por gráfico, nombres de serie en tooltip ("Total"/"Tendencia") y sin dependencia exclusiva del color.
