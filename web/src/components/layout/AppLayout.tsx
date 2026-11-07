import { Outlet, useLocation } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { TopBarMovil } from "./NavMovil"

export function AppLayout() {
  const location = useLocation()

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg focus:outline-2 focus:outline-offset-2 focus:outline-ring"
      >
        Saltar al contenido
      </a>
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBarMovil />
        <main
          key={location.pathname}
          id="contenido"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-4 outline-none md:p-6"
          aria-label="Contenido principal"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}