import { NavLink } from "react-router-dom"
import {
  CalendarPlus,
  CircleDollarSign,
  HeartPulse,
  LayoutDashboard,
  List,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  Settings,
  Sun,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUiStore } from "@/store/uiStore"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface NavItemDef {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const GRUPOS: { titulo: string; items: NavItemDef[] }[] = [
  {
    titulo: "Finanzas",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/registrar", label: "Registrar", icon: CalendarPlus },
      { to: "/ingresos", label: "Ingresos", icon: List },
      { to: "/splits", label: "Splits", icon: PieChart },
    ],
  },
  {
    titulo: "Sistema",
    items: [
      { to: "/configuracion", label: "Configuración", icon: Settings },
      { to: "/health", label: "Health", icon: HeartPulse },
    ],
  },
]

const ACCESOS_INFERIORES: NavItemDef[] = [
  { to: "/configuracion", label: "Configuración", icon: Settings },
]

function BotonNav({ item, colapsado }: { item: NavItemDef; colapsado: boolean }) {
  const boton = (
    <NavLink
      to={item.to}
      end={item.end}
      aria-label={item.label}
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

export function Sidebar() {
  const { sidebarColapsado, toggleSidebar, tema, toggleTema } = useUiStore()

  return (
    <aside
      aria-label="Navegación principal"
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        "transition-[width] duration-300 ease-in-out",
        sidebarColapsado ? "w-14" : "w-60",
      )}
    >
      {/* ===== Zona superior: logo + nombre ===== */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-3",
          sidebarColapsado && "justify-center px-0",
        )}
      >
        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
          <CircleDollarSign className="size-5" aria-hidden />
        </div>
        {!sidebarColapsado && (
          <div className="flex flex-col leading-tight">
            <span className="text-base font-semibold tracking-tight">Abys</span>
            <span className="text-[11px] text-muted-foreground">ingresos</span>
          </div>
        )}
      </div>

      {/* ===== Zona media: navegación ===== */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4" aria-label="Secciones">
        {GRUPOS.map((grupo) => (
          <div key={grupo.titulo}>
            {!sidebarColapsado && (
              <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                {grupo.titulo}
              </p>
            )}
            <div className="space-y-0.5">
              {grupo.items.map((item) => (
                <BotonNav key={item.to} item={item} colapsado={sidebarColapsado} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ===== Zona inferior: tema + colapso + configuración ===== */}
      <div className="shrink-0 space-y-0.5 border-t border-sidebar-border px-2 py-2.5">
        <BotonNav item={ACCESOS_INFERIORES[0]} colapsado={sidebarColapsado} />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleTema}
              aria-label={tema === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              className={cn(
                "flex h-9 w-full items-center gap-3 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors",
                "hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                sidebarColapsado && "justify-center px-0",
              )}
            >
              {tema === "dark" ? (
                <Sun className="size-[18px] shrink-0" aria-hidden />
              ) : (
                <Moon className="size-[18px] shrink-0" aria-hidden />
              )}
              {!sidebarColapsado && <span>{tema === "dark" ? "Modo claro" : "Modo oscuro"}</span>}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" align="center">
            {tema === "dark" ? "Modo claro" : "Modo oscuro"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={sidebarColapsado ? "Expandir sidebar" : "Colapsar sidebar"}
              className={cn(
                "flex h-9 w-full items-center gap-3 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors",
                "hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                sidebarColapsado && "justify-center px-0",
              )}
            >
              {sidebarColapsado ? (
                <PanelLeftOpen className="size-[18px] shrink-0" aria-hidden />
              ) : (
                <PanelLeftClose className="size-[18px] shrink-0" aria-hidden />
              )}
              {!sidebarColapsado && <span>Colapsar</span>}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" align="center">
            {sidebarColapsado ? "Expandir sidebar" : "Colapsar sidebar"}
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  )
}