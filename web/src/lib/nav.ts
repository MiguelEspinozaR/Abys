import {
  CalendarPlus,
  HeartPulse,
  LayoutDashboard,
  List,
  PieChart,
  Settings,
  type LucideIcon,
} from "lucide-react"

export interface NavItemDef {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

export const GRUPOS: { titulo: string; items: NavItemDef[] }[] = [
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

const ITEMS: NavItemDef[] = GRUPOS.flatMap((g) => g.items)

/** Devuelve el título de la sección activa para la ruta dada. */
export function tituloDeRuta(pathname: string): string {
  const item = ITEMS.find((i) =>
    i.end ? pathname === i.to : pathname.startsWith(i.to),
  )
  return item?.label ?? "Abys"
}
