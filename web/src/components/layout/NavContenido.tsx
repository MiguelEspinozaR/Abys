import { NavLink } from "react-router-dom"
import type { NavItemDef } from "@/lib/nav"
import { GRUPOS } from "@/lib/nav"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

function BotonNav({
  item,
  colapsado,
  onNavegar,
}: {
  item: NavItemDef
  colapsado: boolean
  onNavegar?: () => void
}) {
  const boton = (
    <NavLink
      to={item.to}
      end={item.end}
      aria-label={item.label}
      onClick={onNavegar}
      className={({ isActive }) =>
        cn(
          "group/nav flex h-9 items-center gap-3 rounded-md px-2.5 text-sm font-medium transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          colapsado && "justify-center px-0",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
        )
      }
    >
      <item.icon className="size-[18px] shrink-0" aria-hidden />
      {!colapsado && <span className="truncate">{item.label}</span>}
    </NavLink>
  )

  if (!colapsado) return boton

  return (
    <Tooltip>
      <TooltipTrigger asChild>{boton}</TooltipTrigger>
      <TooltipContent side="right" align="center">
        {item.label}
      </TooltipContent>
    </Tooltip>
  )
}

export function NavContenido({
  colapsado = false,
  onNavegar,
}: {
  colapsado?: boolean
  onNavegar?: () => void
}) {
  return (
    <nav
      className="flex-1 space-y-5 overflow-y-auto px-2 py-4"
      aria-label="Secciones"
    >
      {GRUPOS.map((grupo) => (
        <div key={grupo.titulo}>
          {!colapsado && (
            <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              {grupo.titulo}
            </p>
          )}
          <div className="space-y-0.5">
            {grupo.items.map((item) => (
              <BotonNav
                key={item.to}
                item={item}
                colapsado={colapsado}
                onNavegar={onNavegar}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}
