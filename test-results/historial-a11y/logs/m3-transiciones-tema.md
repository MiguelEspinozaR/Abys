# M3 — `transition-all` y `theme-color` (R4, R5)

- Entrega: reemplazo de `transition-all` en 6 puntos y sincronización de `meta[name=theme-color]` con `--background`.
- Archivos producto (working tree): `web/src/components/ui/badge.tsx`, `button.tsx`, `progress.tsx`, `switch.tsx`, `tabs.tsx`, `web/src/features/registrar/ComprobanteDropzone.tsx`, `web/index.html`, `web/src/lib/themeColor.ts`, `web/src/store/uiStore.ts`.
- Verificación: `grep -rn "transition-all" web/src` → 0 ocurrencias.
- Resultado: meta inicial `#0a0a0a` en HTML; store normaliza `--background` (rgb/hex, canvas para oklch) y actualiza meta en arranque/toggle/rehidratación; `prefers-reduced-motion` global sigue cubriendo transiciones.
