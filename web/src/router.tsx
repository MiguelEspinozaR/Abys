import { lazy, Suspense } from "react"
import { createBrowserRouter, Navigate } from "react-router-dom"
import { AppLayout } from "@/components/layout/AppLayout"
import { PageLoader } from "@/components/layout/PageLoader"

const Dashboard = lazy(() => import("@/features/dashboard/DashboardPage"))
const Registrar = lazy(() => import("@/features/registrar/RegistrarPage"))
const Ingresos = lazy(() => import("@/features/ingresos/IngresosPage"))
const Splits = lazy(() => import("@/features/splits/SplitsPage"))
const Configuracion = lazy(() => import("@/features/configuracion/ConfiguracionPage"))
const Health = lazy(() => import("@/features/health/HealthPage"))

function conSuspense(Element: React.LazyExoticComponent<() => React.ReactElement>) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Element />
    </Suspense>
  )
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: conSuspense(Dashboard) },
      { path: "registrar", element: conSuspense(Registrar) },
      { path: "ingresos", element: conSuspense(Ingresos) },
      { path: "splits", element: conSuspense(Splits) },
      { path: "configuracion", element: conSuspense(Configuracion) },
      { path: "health", element: conSuspense(Health) },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
])