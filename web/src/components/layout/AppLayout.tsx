import { Outlet, useLocation } from "react-router-dom"
import { Sidebar } from "./Sidebar"

export function AppLayout() {
  const location = useLocation()

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main
        key={location.pathname}
        className="flex-1 overflow-y-auto p-4 md:p-6"
        aria-label="Contenido principal"
      >
        <Outlet />
      </main>
    </div>
  )
}