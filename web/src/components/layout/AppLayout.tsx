import { Outlet, useLocation } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { TopBarMovil } from "./NavMovil"

export function AppLayout() {
  const location = useLocation()

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBarMovil />
        <main
          key={location.pathname}
          className="flex-1 overflow-y-auto p-4 md:p-6"
          aria-label="Contenido principal"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}