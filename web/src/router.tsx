import { lazy, Suspense } from "react"
import { createBrowserRouter, Navigate, useRouteError } from "react-router-dom"
import { AppLayout } from "@/components/layout/AppLayout"
import { ErrorPage } from "@/components/layout/ErrorPage"
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

/** Lee el error de la ruta porque React Router no lo pasa como prop al errorElement. */
function RouteErrorPage() {
  const error = useRouteError()
  return <ErrorPage error={error} />
}

/** Envuelve cada ruta lazy con su fallback de carga y su pantalla de error compartida. */
function conError(Element: React.LazyExoticComponent<() => React.ReactElement>) {
  return {
    element: conSuspense(Element),
    errorElement: <RouteErrorPage />,
  }
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, ...conError(Dashboard) },
      { path: "registrar", ...conError(Registrar) },
      { path: "ingresos", ...conError(Ingresos) },
      { path: "splits", ...conError(Splits) },
      { path: "configuracion", ...conError(Configuracion) },
      { path: "health", ...conError(Health) },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
])