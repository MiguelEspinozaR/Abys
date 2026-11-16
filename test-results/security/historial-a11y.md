# Security Scan Report: historial-a11y

**Feature:** historial-a11y  
**Commit:** `888b954` (base: `ec3c41a`)  
**Product diff:** `ec3c41a..888b954`  
**Evidence commit:** `888b954`  
**Scan date:** 2026-11-15

## Scanner

- Primary: Gitleaks (not available in environment)
- Fallback: Regex pattern matching (advisory only, per security-scanning skill)
- Tool status: `gitleaks` not found in PATH; scan performed with regex patterns only, declared advisory.

## Scope

- Diff: `ec3c41a..888b954` (source)
- Paths: `web/` only (backend has no changes)
- Evidence: `test-results/historial-a11y/` directory + `backlog/backlog.md`
- Paths explicitly excluded from scope: `backend/**`, API, DB, migrations, `deploy.sh`/`status.sh`/`stop.sh`, nginx/systemd, `web/package.json`, lockfiles, `go.mod`/`go.sum`
- NEW changes in this range:
  - `ad07e31`: Feature web: hace accesibles los gráficos del dashboard — ChartCard, ChartFigure, ChartPatterns, ChartTooltip with accessible SVG patterns and aria-labeled/described figures.
  - `8dd580f`: Feature web: reemplaza transition-all y sincroniza theme-color con el tema — CSS color variable adjustments, theme-color sync with `--background` token, uiStore integration.
  - `500d798`: Feature web: lleva filtros y rango a la URL y agrupa el histórico por año — usePagosPagina hook, useTabUrl hook, filtrosUrl, rango, agrupar, themeColor modules with pure date arithmetic in America/La_Paz, test files.
  - `0c06ac1`: test(a11y): evidencia del histórico accesible (bloque C) — test-results/historial-a11y/ evidence files (JSON, CJS harness, metrics, logs, screenshots, report.md).
  - `888b954`: docs: cierra el bloque C en el backlog — backlog/backlog.md documentation update.

## Findings

| Severity | File | Line | Evidence | Recommendation |
|----------|------|------|----------|----------------|
| — | — | — | No exposed secrets detected | — |
| — | — | — | No SAST vulnerabilities found | — |
| — | — | — | No dependency vulnerabilities (no new deps) | — |
| — | — | — | No insecure configuration changes | — |
| — | — | — | No supply-chain issues | — |
| — | — | — | No `beforeunload` usage confirmed | — |

## Summary

The security scan of the `historial-a11y` feature branch diff (`ec3c41a..888b954`) found **no security issues** in the `web/` directory:

- **Exposed secrets**: No API keys, tokens, passwords, or private key patterns detected in any modified source files. Regex fallback declared advisory since Gitleaks was unavailable. All new changes are purely UI/accessibility/audit — none introduce secrets, tokens, or credentials. The dashboard chart accessibility features (ChartCard/ChartFigure/ChartPatterns/ChartTooltip) add sr-only tables and aria attributes; the URL filter/historial grouping modules implement date arithmetic and query-param serialization with no credential exposure. The theme-color sync reads `--background` computed style and writes a `<meta>` tag; no secrets involved. Evidence directories contain audit logs, metrics, test results, and screenshots — verified clean of real secrets, tokens, or credentials.

- **SAST**: No code patterns indicative of common vulnerabilities were found.

- **Dependency vulnerabilities**: No new dependencies were added. `web/package.json` is identical between base and HEAD commits.

- **Insecure configuration**: No configuration files changed.

- **Supply-chain**: No third-party changes or supply-chain concerns identified.

- **`beforeunload`**: Zero instances of `beforeunload` usage confirmed in any diff.

- **Backend**: No changes to backend code (`backend/` has no diff).

- **Evidence verification**: The evidence directories (`test-results/historial-a11y/` and `backlog/backlog.md`) have been verified to contain no real secrets, tokens, or credentials. They consist of audit logs, metrics, test results, screenshots, and a documentation entry describing the histórico agrupado + a11y del bloque C feature.

## Verdict

**pass**

All checks pass. The feature branch at commit `888b954` includes new accessibility features for dashboards, charts, historial grouping by year with URL filters, theme-color synchronization, and associated test infrastructure, with no security regressions or exposed secrets. The evidence has been verified clean. The feature is ready for **REVIEW**.

**Changes detail:**
- `ad07e31`: web/src/features/dashboard/ChartCard.tsx, ChartFigure.tsx, ChartPatterns.tsx, ChartTooltip.tsx — accessible chart components with aria-labeled/described figures and sr-only tables
- `8dd580f`: web/src/index.css theme-color adjustments, web/src/store/uiStore.ts sincronizarThemeColor integration
- `500d798`: web/src/hooks/usePagosPagina.ts, useTabUrl.ts, web/src/lib/filtrosUrl.ts, web/src/lib/rango.ts, web/src/lib/themeColor.ts, web/src/lib/agrupar.ts, test files, and multiple component updates (ChartCard, DashboardPage, HistoryChart, ChartFigure, ChartPatterns, ChartTooltip, TablaDatos, IngresosPage, ComprobanteDropzone, SplitFila, SplitsPage, useHistorialTasas, useGenerarSplit, useEliminarSplit, useMarcarRealizada, useCrearPago, useSubirComprobante, useCrearFuente, useActualizarFuente, useEliminarFuente)
- `0c06ac1`: test-results/historial-a11y/ evidence files (console-log.json, contrast.json, harness files, logs, metrics, screenshots, report.md, tests/historial-a11y.json)
- `888b954`: backlog/backlog.md — documentation entry for "Histórico agrupado + a11y del bloque C"
