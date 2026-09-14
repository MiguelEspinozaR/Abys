# Abys · Web (frontend)

Frontend de **Abys**, la app de gestión de ingresos laborales. React 19 + Vite + TypeScript + Tailwind v4 + shadcn/ui + TanStack Query + Zustand + Recharts.

## Requisitos

- Node 22+
- Backend de Abys corriendo en `http://localhost:8080` (API en `/api/v1`).

## Puesta en marcha

```bash
npm install
npm run dev          # dev server en http://localhost:5173
```

### Variables de entorno

| Variable          | Default                          | Descripción                      |
| ----------------- | -------------------------------- | -------------------------------- |
| `VITE_API_URL`    | `http://localhost:8080/api/v1`   | Base URL de la API REST.         |

```bash
cp .env.example .env.local   # si necesitas apuntar a otro backend
```

## Scripts

| Comando            | Descripción                                  |
| ------------------ | -------------------------------------------- |
| `npm run dev`      | Dev server (Vite, HMR).                      |
| `npm run build`    | `tsc -b` + `vite build` (producción en `dist/`). |
| `npm run preview`  | Sirve el build de producción.                |
| `npm test`         | Unit tests (Vitest).                         |

## Estructura

```
src/
  components/layout/   Sidebar colapsable + layout
  components/ui/       Componentes shadcn/ui generados
  features/
    dashboard/         4 visualizaciones + cards resumen
    registrar/         Form de pago con calendario, OCR y comprobante
    ingresos/          Lista de pagos con filtros y CRUD
    splits/            Generación y gestión de splits/transacciones
    configuracion/     CRUD fuentes/cuentas + tasas
    health/            Estado de la base de datos
  lib/                 format.ts (Bs ↔ centavos), chartTheme
  services/            api.ts (fetch wrapper), hooks.ts (TanStack Query), types.ts, ocr.ts
  store/               uiStore.ts (Zustand: sidebar + tema)
```

## Convenciones

- Montos **siempre en centavos** hacia/desde la API; la UI muestra `Bs` con `formatBs()`.
- React Query para server state; Zustand solo UI state (sidebar, tema).
- Errores de la API (`{error:{code,message}}`) se muestran como toasts Sonner.
- Tema light/dark con tokens CSS de shadcn; clase `.dark` en `<html>`, persistido en localStorage.

## Branding

- Nombre visible: **Abys**.
- Logo: ícono `CircleDollarSign` (lucide) sobre un cuadrado `primary`.
- Paleta: índigo/violeta en `--chart-1/-2`, emerald para estados positivos, neutro frío para fondos (preset shadcn `radix-nova` con base neutral).
- Tipografía: Inter Variable (`@fontsource-variable/inter`).