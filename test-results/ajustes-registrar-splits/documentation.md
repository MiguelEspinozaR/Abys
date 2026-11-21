# Documentation Audit — ajustes-registrar-splits

**Verdict:** `documentation_complete`

All shipped behavior is accurately reflected in the documentation. No code changes are required to align docs with implementation.

---

## Doc / Behavior Mapping Table

| Documentation Artifact | Verified Behavior | Status |
|---|---|---|
| `CHANGELOG.md:9` — `## [0.4.0] - 2026-11-20` | Version `0.4.0` declared | ✅ |
| `CHANGELOG.md:11-16` | Añadido: defaults de registro configurables, puntos por fuente, pendientes en Ver datos, QR ampliable | ✅ |
| `CHANGELOG.md:18-21` | Cambiado: permanencia en `/registrar`, formulario limpio, inicialización desde defaults | ✅ |
| `CHANGELOG.md:24-26` | Corregido: General excluida de pendientes, resolucion por `es_general`/`GetGeneral` sin id fijo | ✅ |
| `web/package.json:4` | `"version": "0.4.0"` | ✅ |
| `web/package-lock.json:3,9` | `"version": "0.4.0"` (root + packages[""]) | ✅ |
| `README.md:11-16` | Defaults configurables, permanencia en `/registrar`, replicacion en `abys-ui` | ✅ |
| `backlog/api.md:112-120` | `GET/PUT /settings/registrar` contract, whitelists, `{data:...}` response | ✅ |
| `backlog/api.md:81` | `split.total_pendiente` excluye General, aggregate-only, no schema change | ✅ |
| `backlog/arquitectura.md:53-54` | D4 precedencia backend/local + réplica `abys-ui`; General por `es_general`/`GetGeneral` sin id hardcodeado | ✅ |
| `backlog/backlog.md:51-54` | New tech-debt/advisory items added per Reviewer recommendations | ✅ |
| `backlog/backlog.md:47` | Existing "hardcoded General id" item kept consistent; not duplicated | ✅ |

---

## Backlog Items Added (non-blocking tech-debt/advisory)

The following items were added to `backlog/backlog.md` "Pendiente (orden propuesto)" section (lines 51-54), all unchecked (`[ ]`):

1. **guardadoRef stays `true` after save** — suprime el bloqueador de cambios sin guardar para ediciones posteriores en la misma sesión; comportamiento prescrito por D1/R1.2, no afecta AC.
2. **preexisting `RealizarTxDialog.tsx:31` fallback `cuenta_id === 3`** — identificado en revisión; las nuevas rutas usan `es_general`/`GetGeneral`; no bloqueante.
3. **UI boundary contrast advisory** — elevar a ≥3:1 como endurecimiento design system; no gate actual §5; verificado en 16 combinaciones AA.
4. **optional follow-up: semgrep/npm-audit** — cuando estén disponibles como endurecimiento de seguimiento (_backlog_), sin condicionar este release.

The existing "hardcoded General id" item at `backlog/backlog.md:47` (`- [ ] Quitar el id de cuenta fijo como fallback (General) en el diálogo de transacción.`) remains unchanged and consistent; no duplicate was introduced.

---

## Gaps Found

No documentation-driven code gaps detected. All verified behaviors match shipped implementation:

- `CHANGELOG.md` version `0.4.0` present in all required fields (root, `web/package.json`, both `web/package-lock.json` fields)
- `GET/PUT /settings/registrar` contract with whitelists (`efectivo|qr|transaccion`, `detallado|distribuido`) and `{data:...}` response documented in `backlog/api.md:112-120`
- `split.total_pendiente` excluding General resolved via `es_general`/`GetGeneral` (no hardcoded id `3`), aggregate-only change with no schema migration — documented in `backlog/api.md:81` and `backlog/arquitectura.md:54`
- D4 precedence backend/local + `abys-ui` replication documented in `backlog/arquitectura.md:53`
- General via `es_general`/`GetGeneral` (no hardcoded id) documented in `backlog/arquitectura.md:54`
- Stay-in-registrar + cleared form after save documented in `CHANGELOG.md:20-21`
- Source dots (calendar points by source) documented in `CHANGELOG.md:14`
- Non-persisting splits subtotal documented in `CHANGELOG.md:15`
- QR lightbox documented in `CHANGELOG.md:16`
- No tag, release, or merge to `main` — confirmed via `git show-ref --tags` vacío y HEAD en `feat/ajustes-registrar-splits` únicamente

---

## Confirmation of No Tag/Release/Merge

- `git show-ref --tags` → empty (no annotated or lightweight tags)
- No `v0.4.0` or `0.4.0` tags present in the repository
- No merge commit from `feat/ajustes-registrar-splits` into `main`
- Release `0.4.0` prepared without tag nor release in GitHub, per AC17 and project policy

---

**Evidence file:** `test-results/ajustes-registrar-splits/documentation.md`
**Files modified:** `backlog/backlog.md` (added 4 new items), `test-results/ajustes-registrar-splits/documentation.md` (new audit artifact)
**Tree state:** dirty — only the documented edits + new evidence file are present; no product code (.go, .ts, .tsx) was changed.