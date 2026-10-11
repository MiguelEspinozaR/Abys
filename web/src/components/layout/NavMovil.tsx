import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import { CircleDollarSign, Moon, Sun, X } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"
import { tituloDeRuta } from "@/lib/nav"
import { useUiStore } from "@/store/uiStore"
import { NavContenido } from "./NavContenido"

export function TopBarMovil() {
  const [abierto, setAbierto] = useState(false)
  const location = useLocation()
  const { tema, toggleTema } = useUiStore()

  useEffect(() => {
    setAbierto(false)
  }, [location.pathname])

  return (
    <header
      className="flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border bg-sidebar px-3 text-sidebar-foreground md:hidden"
      aria-label="Barra superior"
    >
      <DialogPrimitive.Root open={abierto} onOpenChange={setAbierto}>
        <DialogPrimitive.Trigger asChild>
          <button
            type="button"
            aria-label="Abrir navegación"
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground transition-transform",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95",
            )}
          >
            <CircleDollarSign className="size-5" aria-hidden />
          </button>
        </DialogPrimitive.Trigger>

        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            data-slot="dialog-overlay"
            className="fixed inset-0 z-50 bg-black/40 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
          />
          <DialogPrimitive.Content
            data-slot="dialog-content"
            className={cn(
              "fixed top-3 left-3 z-50 flex max-h-[calc(100dvh-1.5rem)] w-[min(20rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl border border-sidebar-border bg-sidebar text-sidebar-foreground ring-1 ring-foreground/10 duration-150 outline-none",
              "origin-top-left data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-open:slide-in-from-top-2 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            )}
          >
            <DialogPrimitive.Title className="sr-only">Navegación</DialogPrimitive.Title>

            <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                <CircleDollarSign className="size-5" aria-hidden />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-base font-semibold tracking-tight">Abys</span>
                <span className="text-[11px] text-muted-foreground">ingresos</span>
              </div>
              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  aria-label="Cerrar navegación"
                  className="ml-auto grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <X className="size-[18px]" aria-hidden />
                </button>
              </DialogPrimitive.Close>
            </div>

            <NavContenido onNavegar={() => setAbierto(false)} />

            <div className="shrink-0 border-t border-sidebar-border px-2 py-2.5">
              <button
                type="button"
                onClick={toggleTema}
                aria-label={tema === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                className="flex h-9 w-full items-center gap-3 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {tema === "dark" ? (
                  <Sun className="size-[18px] shrink-0" aria-hidden />
                ) : (
                  <Moon className="size-[18px] shrink-0" aria-hidden />
                )}
                <span>{tema === "dark" ? "Modo claro" : "Modo oscuro"}</span>
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-semibold tracking-tight">
          {tituloDeRuta(location.pathname)}
        </span>
        <span className="text-[11px] text-muted-foreground">Abys</span>
      </div>

      <button
        type="button"
        onClick={toggleTema}
        aria-label={tema === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        className="ml-auto grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {tema === "dark" ? (
          <Sun className="size-[18px]" aria-hidden />
        ) : (
          <Moon className="size-[18px]" aria-hidden />
        )}
      </button>
    </header>
  )
}
