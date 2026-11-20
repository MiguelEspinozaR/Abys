# Security Scan Report: `ajustes-registrar-splits` Block

**Branch:** `feat/ajustes-registrar-splits`  
**Commit:** `15771098d467af628b3331faaa0a944ff91adc6c` (HEAD)  
**Baseline:** `main` (`3e64fe6386ed5571b3a31d24ea4f847a3460401a`)  
**Scan Date:** 2026-11-20T18:08:00Z  

## Tools Discovery

| Tool | Available | Status |
|------|-----------|--------|
| `gitleaks` | ✅ Yes (`/home/miky/go/bin/gitleaks`) | Scanned 7 commits, **0 leaks found** |
| `semgrep` | ❌ No | `tool_missing` — required for SAST priority 2 |
| `bandit` | ❌ No | `tool_missing` — Python SAST, not applicable to Go/TS |
| `npm-audit` | ❌ No | `tool_missing` — dependency vulnerability check incomplete |
| `go-audit` | ❌ No | `tool_missing` — Go dependency check incomplete |
| `check-security-tools.sh` | ✅ Yes | Confirmed gitleaks OK; others MISSING |

**Caveat:** Scan is incomplete without semgrep/bandit/npm-audit. Findings below are a combination of automated gitleaks results and manual code review.

## Findings by Severity

### ⚡ Secrets / Gitleaks
- **Total findings:** 0
- **Scanned commits:** 7 (from `main..HEAD`)
- **Details:** No exposed secrets (keys, passwords, tokens) detected in any of the changed files across the 7 commits.

### 🔍 SAST (manual review, no automated tool)
| Area | Assessment | Evidence |
|------|------------|----------|
| **Input validation** (`settings_handler.go`) | ✅ Whitelist enforcement for `metodo_default` and `modo_default`; invalid payloads return 400 `VALIDATION_ERROR`. | `slices.Contains(registrarMetodosValidos, req.MetodoDefault)` and `slices.Contains(registrarModosValidos, req.ModoDefault)` |
| **`totalesSplit` account exclusion** | ✅ General account excluded from pending calculations per R7.1-R7.5. Fail-safe `idGeneral` returns nil if `cuentaRepo` is nil. | `totalesSplit` function; `idGeneral` method; migration `000007_add_registrar_settings.up.sql` |
| **DB color injection prevention** (`fuentesDots.ts` / `CalendarioDias.tsx`) | ✅ `esColorHex()` validates before applying as inline `style`; invalid/absent colors fall back to static `BG_FUENTE_FALLBACK` Tailwind class. Prevents CSS injection from DB values. | `ColorSwatch` component; `esColorHex` regex `^#[0-9a-f]{6}$`; `style={{ backgroundColor: color }}` only for validated hex |
| **`normalizarRegistrarSettings` fallback** (`settingsFallback.ts`) | ✅ Pure function with whitelisted domains; invalid values fall back to local counterpart. Does NOT read localStorage. | `METODOS_PAGO_VALIDOS`, `MODOS_REGISTRO_VALIDOS`, `MODOS_REDONDEO_VALIDOS`; `esMetodoPago`, `esModoRegistro`, `esModoRedondeo` |

### 📦 Dependencies
- **Automated audit:** ❌ unavailable (`tool_missing`).
- **Manual assessment:** New utility modules (`fuentesDots.ts`, `subtotal.ts`, `pagoPayload.ts`, `settingsFallback.ts`) are **pure functions** with no external dependencies beyond existing project packages. No new npm/go packages introduced.

### ⚙️ Configuration / Supply-Chain
| Area | File | Action | Risk |
|------|------|--------|------|
| Migration `000007` | `backend/migrations/000007_add_registrar_settings.up.sql` | INSERT INTO app_settings for registrar defaults (idempotent `ON CONFLICT DO NOTHING`) | Low |
| UI Store persistence | `web/src/store/uiStore.ts` | Added `registrarMetodoDefault`, `registrarModoDefault`, `splitModoDefault` to zustand store with localStorage (`abys-ui`) | Medium — localStorage could be tampered; mitigated by whitelist validation in `normalizarRegistrarSettings` |
| Local-storage replication | — | R3.5/D4/AC8: backend values take precedence; local values used only if backend response invalid/missing | Low — pure normalization, no secret stores accessed |

## Manual Review Highlights

### New Input Whitelists
- `metodo_default` whitelist: `["efectivo", "qr", "transaccion"]`
- `modo_default` whitelist: `["detallado", "distribuido"]`
- `modo_redondeo` whitelist: `["redondeado", "enteros", "preciso"]`

These are enforced in `SetRegistrar` and `normalizarRegistrarSettings`/`normalizarModoRedondeo`, returning 400 `VALIDATION_ERROR` for out-of-domain values.

### `totalesSplit` Aggregate Change
- New `totalesSplit(txs, idGeneral)` function correctly excludes the General account from `pendiente` (pending) calculations.
- The General transaction still appears in the UI with `realizado=false` for informational purposes (no rewriter/rewrite).
- `idGeneral` fail-safe: returns nil if `h == nil || h.cuentaRepo == nil`, preserving legacy behavior.

### Calendar Dots Inline Styles from DB Colors
- `fuentesDots.ts` exports `esColorHex(color)` — accepts only `#RRGGBB` hex; rejects `rgb()`, named colors, arbitrary strings.
- `ColorSwatch` component in `CalendarioDias.tsx`:
  - If valid hex → applies `style={{ backgroundColor: color }}` (inline style, not class)
  - If invalid/absent → applies static Tailwind class `BG_FUENTE_FALLBACK` (`bg-gray-400`)
- **Critical:** Tailwind v4 does not compile runtime-generated class names (`bg-${color}`), so the static fallback is the correct approach.

### splits Checkbox subtotal
- `SplitsPage.tsx` now filters out General account (`c.es_general`) from `pendientePorCuenta` calculations.
- `PendientePorCuentaCard` passes `transacciones` prop to `CuentaDetalleDialog` for informational display only.
- General account appears "a modo informativo" — its monto does not enter the Total pendiente.

### QR lightbox & other UI changes
- No security issues identified; visual/UI changes only.

## Artifact Paths

Per the state-machine contract and `docs/AGENT-CONTRACTS.md`:

1. `test-results/security/ajustes-registrar-splits.json` — structured machine‑readable report (created above)
2. `test-results/security/ajustes-registrar-splits.md` — human‑readable markdown summary (created above)

## Scan Verdict

**Status:** `complete_partial`

- Gitleaks secret scan: **clean** (0 findings across 7 commits).
- SAST: **incomplete** — required tools (semgrep, bandit) missing; manual review performed instead.
- Dependency audit: **incomplete** — npm-audit/go-audit unavailable.
- Configuration/supply-chain: **reviewed** via diff analysis.

**No secret values were printed or committed.** The tree is left dirty only with the two evidence files above (`ajustes-registrar-splits.json` and `ajustes-registrar-splits.md`), as required by the security-scanning skill contract.

---
*Report generated by the `security-scanner` skill. For issues, see the manual review section above.* 
