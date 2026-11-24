# Verificación release 1.0.0

- **Fecha**: 2026-11-24
- **Repo**: `/home/miky/Documentos/finanzasMikyGoRef`
- **Rama**: `fix/pagina-error-personalizada`
- **Commit base**: `004c588e04be5dc8ea7055fe06a79d72ea9c61d9` (`004c588 chore: actualiza grafo tras guard de API`)
- **Cambios de versión/doc sin commitear**: `CHANGELOG.md`, `README.md`, `web/package-lock.json`, `web/package.json` (4 archivos, +21/-5). También existe `?? .gitattributes` sin seguimiento; no modificado por esta verificación.
- **Restricciones respetadas**: sin operaciones Git de escritura, sin deploy, sin reinicios, sin BD, sin modificar `.ai/`, `.gitattributes` ni `graphify-out/`, sin modificar código ni documentación.

## Comandos canónicos ejecutados

| Comando | Resultado | Detalle |
|---|---|---:|
| `cd web && npx tsc -b` | PASS | Sin salida de error (exit 0). |
| `cd web && npm test` | PASS | 19 archivos de prueba, 197 pruebas aprobadas. Duración 26.97s. |
| `cd web && npm run build` | PASS | `tsc -b && vite build` completado en 21.48s. Advertencia no bloqueante: chunks > 500 kB. |

## Comprobaciones de release

| Comprobación | Esperado | Observado | Estado |
|---|---|---|---|
| `web/package.json` version | `1.0.0` | `1.0.0` (`abys-web@1.0.0`) | PASS |
| `web/package-lock.json` línea 3 `version` | `1.0.0` | `"version": "1.0.0"` (línea 3) | PASS |
| `web/package-lock.json` línea 9 `packages[""].version` | `1.0.0` | `"version": "1.0.0"` (línea 9) | PASS |
| `web/package-lock.json` dependencias intactas | Sin cambios de dependencias | Diff solo muestra cambios de versión en líneas 3 y 9; `lockfileVersion: 3`, dependencias presentes | PASS |
| `README.md` sección Versión coherente | Coherente con 1.0.0 | `1.0.0 — ver [CHANGELOG.md](CHANGELOG.md).` + `Tag 1.0.0 creado el 2026-11-24 tras el merge a main, sin deploy.sh en este ciclo.` | PASS |
| `CHANGELOG.md` entrada `[1.0.0]` | Presente, es-BO correcto, nota de release como cita | `## [1.0.0] - 2026-11-24` con secciones Añadido/Cambiado/Corregido/Seguridad; texto en es-BO; cita `> Merge a \`main\` y tag \`1.0.0\`; no se ejecutó \`deploy.sh\` en este ciclo; BD verificada sana (\`health/db\` 200).` | PASS |

## Verificación de base URL en `web/dist/assets`

- Búsqueda `localhost:8080/api/v1` en `web/dist/assets`: **0 coincidencias**.
- Búsqueda `/api/v1` en `web/dist/assets`: coincidencia en `web/dist/assets/hooks-DaBvzlIc.js` con `const Re="/api/v1".replace(/\/+$/,"")` (base API configurada como `/api/v1`).
- Búsqueda `localhost:8080` en `web/dist/assets`: **1 coincidencia** en `web/dist/assets/HealthPage-CGmnf6hL.js` (texto UI informativo: "Verifica que el backend esté corriendo en http://localhost:8080."). No es configuración de base URL de API; la base efectiva compilada sigue siendo `/api/v1`.

## Conclusión

- **release_ready: false** — hasta que Git Manager haga merge/tag. La verificación técnica local (versionado, docs, tsc, tests, build, base URL `/api/v1`) pasó. No se realizaron operaciones Git de escritura, deploy, reinicios ni cambios de BD.
