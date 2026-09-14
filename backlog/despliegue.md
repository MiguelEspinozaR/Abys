# Despliegue

Abys se despliega de forma persistente (nohup) con scripts propios en la raíz del repo. No se usa Docker ni nginx modificado.

## Servicios y puertos

| Servicio | Puerto | Comando |
|---|---|---|
| Backend (API) | 8081 | `backend/server` (binario compilado) |
| Frontend (SPA) | 5178 | `vite preview` (build de producción) |

> El proyecto anterior (`finanzasMikyGo`) sigue usando 8080/5173 — los scripts de Abys nunca tocan esos puertos.

## Scripts

- `./deploy.sh` — detiene instancias previas de Abys, compila backend (`go build -o server ./cmd/server`) y frontend (`VITE_API_URL=/api/v1 npm run build`), arranca ambos con nohup, guarda PIDs en `/tmp/abys_pids.txt` y verifica la salud local. Idempotente (se puede re-ejecutar).
- `./status.sh` — estado de backend, frontend, túnel y URL pública.
- `./stop.sh` — detiene solo los procesos de Abys (PIDs + puertos 8081/5178) y limpia el archivo de PIDs.

Logs: `/tmp/abys_backend.log`, `/tmp/abys_frontend.log`.

## Acceso público

La app es pública en **https://test3.mikylab.com** a través del túnel Cloudflare `mikylab` (configuración en `~/.cloudflared/config.yml`):

- `/api/*` → `localhost:8081`
- `/uploads/*` → `localhost:8081`
- `/swagger/*` → `localhost:8081`
- resto → `localhost:5178` (SPA con fallback de rutas)

El túnel lo gestiona systemd (`cloudflared-mikylab.service`) y se comparte con otros subdominios (`test.mikylab.com`, etc.). Al añadir un subdominio nuevo:

```bash
cloudflared tunnel route dns mikylab <subdominio>.mikylab.com
```

(solo si el registro DNS todavía no existe).

## Variables de entorno relevantes

- `PORT` — puerto del backend (8081 en despliegue).
- `CORS_ORIGIN` — orígenes permitidos separados por coma (`http://localhost:5173,https://test3.mikylab.com`).
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` — conexión (se leen desde `backend/.env`, no versionado).
- `VITE_API_URL` — base de la API en el build frontend (`/api/v1` en producción, mismo origen).

## Notas de seguridad

- Sin login en v1 (riesgo conocido del despliegue público); pendiente de implementar.
- Recomendado añadir `robots.txt` / `X-Robots-Tag: noindex` para evitar indexación en la fase de prueba.