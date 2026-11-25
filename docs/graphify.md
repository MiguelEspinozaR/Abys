# Graphify — guía de uso

Knowledge graph del proyecto, consultable por los agentes sin releer el código.

## Qué quedó instalado

| Pieza | Ruta | Alcance |
|---|---|---|
| Skill `graphify` (compat) | `~/.agents/skills/graphify` | global (todos los proyectos) |
| Skill `graphify` (nativo OpenCode) | `~/.config/opencode/skills/graphify` | global, **tiene prioridad** sobre el anterior |
| Agente `graphify` (subagent) | `~/.config/opencode/agents/graphify.md` | global, **hereda el modelo** de la sesión |
| Plugin de aviso | `~/.config/opencode/plugins/graphify.js` | global, 1 recordatorio por sesión |
| Servidor MCP `graphify` | `abys-gestion/opencode.json` → `mcp.servers.graphify` | solo este proyecto |
| Grafo | `abys-gestion/graphify-out/graph.json` | 2.937 nodos · 9.155 aristas · 202 comunidades |

El grafo se construyó con `--code-only` (AST local, sin LLM). `graphify-out/` **se versiona**
a propósito (solo se ignora `graphify-out/cache/`), para consultar el grafo en cualquier máquina
y en revisiones de PR.

### Regla de extracción

El subagente usa **siempre `--code-only`** por defecto. Solo ejecuta la extracción
completa (semántica, con LLM) si se lo pides explícitamente con frases como
"pipeline completo", "modo semántico" o "incluye docs/PDFs/imágenes".
Una petición genérica como "indexa el proyecto" **no** es autorización.

### Plugin

`~/.config/opencode/plugins/graphify.js` inyecta **un** recordatorio (~50 tokens)
en el primer comando de shell de cada sesión, solo si el proyecto tiene
`graphify-out/graph.json`. Avisa de que conviene usar `graphify query` antes de
`grep`. No se ejecuta en proyectos sin grafo.

---

## Cómo se usa

### 1. Desde cualquier agente (`android`, `android-deep`, `build`, …)

Pídeselo en lenguaje natural; el agente delega en el subagente `graphify`:

```
Usa el subagente graphify: ¿qué se rompe si cambio SyncScheduler?
```

```
Usa el subagente graphify para actualizar el grafo de abys-gestion y dime los god nodes.
```

El subagente arranca con contexto limpio, ejecuta `graphify` y devuelve un informe corto.
No puede editar código (permisos: `edit: deny`).

### 2. MCP directo (más barato para consultas)

En una sesión de este proyecto, los agentes tienen las herramientas `graphify_*`
(visibles como `tools.graphify.*`). No hace falta cargar el skill ni gastar contexto:

```
graphify_query_graph({ question: "flujo de sincronización offline", mode: "bfs" })
graphify_god_nodes({ top_n: 10 })
graphify_shortest_path({ source: "SyncWorker", target: "AbysApi" })
graphify_get_node({ label: "SyncScheduler" })
graphify_graph_stats({})
```

Herramientas MCP disponibles: `query_graph`, `get_node`, `get_section`, `get_neighbors`,
`get_community`, `god_nodes`, `graph_stats`, `shortest_path`, `list_prs`, `get_pr_impact`, `triage_prs`.

> El MCP es **solo lectura**. Para construir/actualizar/exportar hay que usar el subagente o el CLI.

### 3. CLI a mano (PowerShell, en `abys-gestion`)

```powershell
graphify query "sincronización Room WorkManager" --budget 1500
graphify query "..." --dfs --depth 4
graphify explain "SyncScheduler"
graphify path "SyncWorker" "AbysApi"
graphify affected "SyncScheduler" --depth 2
graphify god-nodes --top 15
graphify section "docs/api-contract.md#Endpoints"
```

---

## Mantener el grafo al día

```powershell
cd C:\Users\Miky\Documents\abys-gestion
graphify update .              # incremental: solo archivos nuevos/cambiados (gratis, sin LLM)
graphify cluster-only . --no-label   # re-clusterizar tras un refactor grande
```

- `graphify update .` es lo normal tras un cambio de código.
- Si borras muchos archivos, añade `--force`.
- **No** uses `graphify extract .` sin `--code-only` salvo que configures una API key:
  la extracción semántica de docs/PDFs/imágenes llama a un LLM externo y en esta máquina
  no hay ninguna key (`graphify provider list` está vacío).

## Exportar

```powershell
graphify export html      # graphify-out/graph.html  (interactivo, ya generado)
graphify export svg       # graphify-out/graph.svg
graphify export graphml   # Gephi / yEd
graphify export wiki      # un artículo Markdown por comunidad
```

---

## Coste en tokens

| Operación | Coste |
|---|---|
| `query` / `path` / `explain` / `affected` / `god-nodes` | **0** (solo lee `graph.json`) |
| `update` (AST) | **0** de LLM |
| MCP `query_graph` | salida acotada por `token_budget` (2000 por defecto) |
| Cargar el skill `graphify` en la sesión principal | ~13k tokens → **evítalo**, usa el subagente |
| `extract` semántico (docs/PDF/imágenes) | tokens del proveedor LLM (no configurado) |

---

## Añadir el MCP a otro proyecto

1. Construye el grafo:
   ```powershell
   cd <proyecto>
   graphify extract . --code-only
   ```
2. Añade a su `opencode.json`:
   ```json
   "mcp": {
     "servers": {
       "graphify": {
         "type": "local",
         "command": ["python", "-m", "graphify.serve", "--graph", "graphify-out/graph.json"],
         "cwd": "."
       }
     }
   }
   ```
3. Reinicia OpenCode y comprueba con `/mcps`.

No lo pongas en la config **global**: el servidor falla al arrancar si el proyecto
no tiene `graphify-out/graph.json`.

---

## Problemas típicos

| Síntoma | Causa / solución |
|---|---|
| `/mcps` muestra `graphify` en error | falta `graphify-out/graph.json` → construye el grafo |
| `ModuleNotFoundError: No module named 'mcp'` | `python -m pip install --user "graphifyy[mcp]"` |
| El agente no ve `graphify_*` | reinicia OpenCode tras cambiar `opencode.json` |
| Respuesta truncada | sube `--budget` o `token_budget`; el aviso indica el valor necesario |
| Comunidades sin nombre (`Community 9`) | normal: sin API key no hay labeling LLM |
