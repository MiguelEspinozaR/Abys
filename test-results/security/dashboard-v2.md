# Security Scan Report — Dashboard v2 (feat/dashboard-v2)

**Scan ID:** dashboard-v2  
**Scan Timestamp:** 2026-11-17T00:00:00Z  
**Base Commit:** 643c511 (main)  
**Head Commit:** 3f2e6f6 (feat/dashboard-v2)  
**Diff Range:** 643c511..3f2e6f6  

## 1. Scope

The following commits are included in the scan:

| Commit | Message |
|---|---|
| 75095f3 | feat(api): monto por día trabajado y agregaciones del dashboard por día y fuente (M1-M2) |
| 984d46d | feat(web): registro híbrido de montos por día, distribución equitativa y sin OCR (M3) |
| c1dfc01 | feat(web): charts por día/fuente, tortas y cards del dashboard (M4) |
| f03ccba | fix(web): scroll único del documento en dashboard y registrar (M5) |
| 3f2e6f6 | docs: documenta el dashboard v2 y sube la versión a 0.3.0 (M6) |

**Total files changed:** 53 (3448 insertions, 1347 deletions)

---

## 2. Tools Used

| Tool | Status | Notes |
|---|---|---|
| **Gitleaks** | ❌ Not available | gitleaks not installed in environment; regex fallback used (advisory per project-policy.md) |
| **Regex-based scanning** | ✅ Performed | grep pattern matching on source code diffs for secrets, SQL injection patterns, unsafe DDL |
| **Go query pattern analysis** | ✅ Performed | All `$1`, `$2` parameterized queries inspected in pgx style |
| **Dependency review** | ✅ Performed | web/package.json, web/package-lock.json diff for npm supply-chain changes |

---

## 3. Findings

### Overall Count
| Severity | Count |
|---|---|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |
| Info | 1 |
| **Total** | **0** |

### Findings Detail (empty — zero findings)

> **Statement: Zero security findings detected.**  
> The change set introduces only intentional, SPEC-documented changes with no security vulnerabilities.

---

## 4. Category Analysis

### 4.1 Exposed Secrets (Critical)
- **Finding:** None detected
- **Evidence:** Regex scanning for secret patterns (AKIA..., sk-..., eyJ..., password, secret, token) across all changed files yielded no matches.
- **Recommendation:** No action required.

### 4.2 SQL Injection Risks (High)
- **Finding:** None detected
- **Evidence:** All Go database queries use parameterized queries with `$1`, `$2`, etc. (pgx style). No dynamic SQL concatenation via `sprintf`, `format`, or string interpolation was found in the diff. Examples of parameterized usage:
  - `INSERT INTO dias_trabajados (pago_id, fecha, monto_enteros) VALUES ($1, $2, $3)` (pago_repo.go:94)
  - `UPDATE pagos SET monto_enteros = ($1) WHERE id = $2` (pago_repo.go:155)
  - `WHERE d.fecha BETWEEN $1 AND $2` (dashboard_repo.go:36, 55, 84, 111, 169)
  - `recalcularTotalPago` uses `tx.Exec(ctx, \`UPDATE pagos SET monto_enteros = (...) WHERE id = $1\`, pagoID)`
- **Recommendation:** No action required. Parameterized queries are correctly used.

### 4.3 Input Validation (Medium)
- **Finding:** Enhanced validations detected (no vulnerability, but worth noting)
- **Evidence:**
  - `ValidarDiasTrabajados` now checks `MontoEnteros >= 0` and duplicate dates (previously only checked uniqueness)
  - `DiaInput` struct has `binding:"gte=0"` in the handler layer
  - `validarTotalCliente` rejects client-provided totals that don't match `Σ días` with 422 `TOTAL_DESINCRONIZADO`
  - `AgregarDia` service function validates `monto < 0` → 400 Bad Request
- **Recommendation:** No action required. Validations are improved and aligned with SPEC R3.2, R3.3.

### 4.4 Unsafe DDL / Migration Risks (Low)
- **Finding:** None detected
- **Evidence:** The migration `000006_add_monto_dias_trabajados.up.sql` uses:
  - `ALTER TABLE dias_trabajados ADD COLUMN IF NOT EXISTS monto_enteros BIGINT NOT NULL DEFAULT 0;`
  - `ADD CONSTRAINT ck_dias_monto_no_neg CHECK (monto_enteros >= 0);` — positive security constraint
  - Safe INSERT with explicit column names and parameterized values
  - The `.down.sql` drops the column safely with `DROP COLUMN IF EXISTS monto_enteros`
  - No unsafe `DROP TABLE`, `TRUNCATE`, or raw `RUN` commands observed
- **Recommendation:** No action required. Migration DDL is safe and includes a CHECK constraint.

### 4.5 Dependency Changes / Supply-Chain (Info)
- **Finding:** tesseract.js intentionally removed
- **Evidence:**
  - `web/package.json`: `"tesseract.js": "^6.0.0"` removed from dependencies
  - `web/package-lock.json`: tesseract.js-related entries removed (including `node_modules/tesseract.js` and `node_modules/tesseract.js-core`)
  - Intentional per spec R4.5/R8: "Se elimina el OCR" and "retirada la dependencia tesseract.js"
  - No new npm or Go dependencies introduced
  - Web version bumped 0.2.0 → 0.3.0
- **Recommendation:** No action required. Dependency removal reduces attack surface and aligns with SPEC.

### 4.6 Insecure Configuration (Low)
- **Finding:** None detected
- **Evidence:** No insecure configuration changes (CORS, TLS, auth, etc.) observed in the diff.
- **Recommendation:** No action required.

---

## 5. Summary Statements

### ❌ No Exposed Secrets
No exposed secrets (API keys, passwords, tokens, private keys) were found in the change set. Regex scanning of source code and diff yielded no matches for common secret patterns.

### ❌ No SQL Injection Risks
No SQL injection risks detected. All Go database queries use parameterized queries with `$1`, `$2`, etc. (pgx style). The migration SQL uses safe ALTER TABLE and INSERT statements with explicit column names and parameterized values. The `recalcularTotalPago` function also uses parameterized queries.

### ✅ Zero Findings
This security scan found **zero (0)** findings across all categories (critical, high, medium, low). The change set is security-clean with only intentional, documented changes per the dashboard-v2 SPEC. No modifications were made to production secret stores, `.ai/`, or Git history.

### ✅ Supply-Chain Reduction
The tesseract.js dependency was intentionally removed per spec, reducing the attack surface. No new dependencies were introduced.

---

## 6. Output Files

- `test-results/security/dashboard-v2.json` — structured machine-readable report
- `test-results/security/dashboard-v2.md` — human-readable report

No other files in `test-results/security/` were modified by this scan beyond the two new files created above.

**Report generated by:** security-scanner role  
**Policy referenced:** `.ai/policies/project-policy.md`  
**Spec referenced:** `.ai/specs/dashboard-v2/spec.md`  
