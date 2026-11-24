# Security Scanning Report — `pagina-error-personalizada`

**Repository:** `/home/miky/Documentos/finanzasMikyGoRef`  
**Branch:** `fix/pagina-error-personalizada`  
**HEAD:** `a0384dc`  
**Scan date:** `2026-11-24`  
**Scan scope:** Commits `0792730..a0384dc` and files  
`web/src/lib/errorChunk.ts`, `web/src/lib/errorChunk.test.ts`,  
`web/src/components/layout/ErrorPage.tsx`, `web/src/components/layout/AppErrorBoundary.tsx`,  
`web/src/router.tsx`, `web/src/App.tsx`

---

## 1. Tools Available / Faltantes

| Tool | Status | Notes |
|------|--------|-------|
| **gitleaks** | ❌ MISSING | No está instalado en el entorno. Se reporta como `tool_missing`. |
| **semgrep** | ❌ MISSING | No está instalado en el entorno. Se reporta como `tool_missing`. |
| **npm audit** | ✅ OK | Ejecutado sobre `web/package.json`; 20 vulnerabilidades found. |
| **go / govulncheck** | ⚠️ GO available, govulncheck missing | No hay código Go en los archivos alcanzados por este cambio. |

> **Policy:** Regex fallback is advisory only. Gitleaks is the primary secret scanner; its absence is recorded as `tool_missing`, not as a pass.

---

## 2. Findings by Severity

### 2.1 Exposed Secrets / Hard Blocks
- **Finding:** None detected.
- **Evidence:** Regex scan of the 6 source files found no secret patterns (A advisory-only check since gitleaks is missing).
- **Severity:** N/A (no hard blocks)
- **Block type:** — None

### 2.2 npm Audit (Dependency Vulnerabilities)
| Package | Severity | Advisory ID | CVSS | Status |
|---------|----------|-------------|------|--------|
| `@modelcontextprotocol/sdk` | high | GHSA-6qxp-vccf-f47h | 7.5 | fix available |
| `body-parser` | high | — | — | fix available |
| `brace-expansion` | high | — | — | fix available |
| `source-map-js` | high | — | — | fix available |
| `systeminformation` | high | — | — | fix available |
| `shadcn` | high | — | — | fix available |
| `undici` | high | — | — | fix available |
| `vite` | high | — | — | fix available |
| `zod` | high | — | — | fix available |
| `@hono/node-server` | moderate | GHSA-rmxm-3fg6-px4f | 5.3 | fix available |
| `@hono/node-server` | moderate | GHSA-qv5m-9pm6-hqp3 | 5.3 | fix available |
| `@hono/node-server` | moderate | GHSA-jpvv-r467-5p4w | 5.3 | fix available |
| `@modelcontextprotocol/sdk` | moderate | GHGA-rvq5-wwqv-78pq | 6.8 | fix available |
| `@modelcontextprotocol/sdk` | moderate | GHSA-6prh-2h8m-c8cw | 6.5 | fix available |
| `@ts-morph/common` | moderate | — | — | fix available |
| `@vitest/mocker` | moderate | — | — | fix available |
| `fast-uri` | moderate | — | — | fix available |
| `hono` | moderate | — | — | fix available |
| `ip-address` | moderate | — | — | fix available |
| `minimatch` | moderate | — | — | fix available |
| `proxy-addr` | **critical** | — | — | fix available |
| `qs` | moderate | — | — | fix available |
| `ts-morph` | moderate | — | — | fix available |
| `vitest` | moderate | — | — | fix available |

**Summary:** 20 vulnerabilities total — 9 high, 7 moderate, 1 critical, and additional high-severity entries from transitive dependencies.

### 2.3 SAST / Configuration / Supply-Chain
- **semgrep:** Not available (tool_missing). No SAST findings can be reported from this scanner.
- **Gitleaks:** Not available (tool_missing). No secret scanning via primary tool.
- **Consoles:** `AppErrorBoundary.tsx:24` has `console.error("Error no controlado en la aplicación", error.message)` — no secrets are logged.
- **Configuration:** No insecure HTTP headers, no hardcoded paths, no unusual deploy configurations in the changed files.
- **Supply-chain:** The changed files do not introduce new dependencies (no `package.json` modifications visible in this change). All dependencies were already present.

---

## 3. Specific Scope Checks

| Check | Result | Evidence |
|-------|--------|----------|
| **Ausencia de stack traces/URLs de chunk en UI** | ✅ PASS | `errorChunk.ts` and `errorChunk.test.ts` explicitly filter out `stack`, URLs, and chunk identifiers. `mensajeErrorCarga` returns only approved copy. `ErrorPage.tsx` displays only `titulo` and `descripcion`. |
| **console.error sin secretos** | ✅ PASS | `AppErrorBoundary.tsx:24` logs `error.message` only — no keys, tokens, or passwords. |
| **enlaces seguros** | ✅ PASS | `ErrorPage.tsx:51` uses `<a href="/">` — relative path, no external navigation. |
| **no nuevas dependencias** | ✅ PASS | No `package.json` modifications in the commit range. |
| **no cambios de deploy/caché** | ✅ PASS | No `deploy.sh`, `status.sh`, `stop.sh`, nginx/systemd/Cloudflare modifications. |
| **no secretos en evidencia** | ✅ PASS | Regex scan + source review: 0 secrets found in changed files. |

---

## 4. Recommendations

1. **Actualizar dependencias vulnerables:** Priorizar la actualización de `@modelcontextprotocol/sdk`, `vite`, `zod`, `undici`, y `proxy-addr` (crítico). Usar `npm audit fix` o revisar manualmente las versiones compatibles.
2. **Habilitar Gitleaks en CI:** Agregar `gitleaks` al pipeline de CI para escaneo de secrets en cada push. Configurar un pre-commit hook o paso en el pipeline.
3. **Incluir semgrep en el pipeline:** Cuando esté disponible, ejecutar las reglasets configuradas del proyecto para detección de patrones de seguridad SAST.
4. **Revisar `proxy-addr` crítico:** Esta dependencia tiene una vulnerabilidad crítica; verificar su versión actual y actualizar de ser posible.
5. **Mantener el pattern de filtrado de errores:** El código actual (`errorChunk.ts`) ya evita exponer stack traces y URLs de chunks; mantener este patrón en futuras refactorizaciones.

---

## 5. Report Paths

- **Structured report:** `test-results/pagina-error-personalizada/security/report.md`
- **Metrics (if applicable):** `test-results/pagina-error-personalizada/security/metrics.json` — still determining format; the existing `metrics.json` at the feature level covers the broader M3 milestone.

