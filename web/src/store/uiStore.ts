import { create } from "zustand"
import { persist } from "zustand/middleware"
import { sincronizarThemeColor } from "@/lib/themeColor"
import type { MetodoPago, ModoRegistro } from "@/lib/dominio"
import type { SplitSettings } from "@/services/types"

export type Tema = "light" | "dark"

interface UiState {
  /** Sidebar colapsado (solo íconos). */
  sidebarColapsado: boolean
  setSidebarColapsado: (v: boolean) => void
  toggleSidebar: () => void
  /** Tema dark/light sincronizado con localStorage y la clase .dark en <html>. */
  tema: Tema
  setTema: (t: Tema) => void
  toggleTema: () => void
  /** Defaults de /registrar replicados desde el backend (D4); fallback local. */
  registrarMetodoDefault: MetodoPago
  setRegistrarMetodoDefault: (v: MetodoPago) => void
  registrarModoDefault: ModoRegistro
  setRegistrarModoDefault: (v: ModoRegistro) => void
  /** Modo por defecto de splits: inicializa el redondeo en /registrar (D5). */
  splitModoDefault: SplitSettings["modo_default"]
  setSplitModoDefault: (v: SplitSettings["modo_default"]) => void
}

function aplicarTema(tema: Tema) {
  const root = document.documentElement
  if (tema === "dark") root.classList.add("dark")
  else root.classList.remove("dark")
  root.style.colorScheme = tema
  sincronizarThemeColor()
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      sidebarColapsado: false,
      setSidebarColapsado: (v) => set({ sidebarColapsado: v }),
      toggleSidebar: () => set({ sidebarColapsado: !get().sidebarColapsado }),

      tema: "dark",
      setTema: (t) => {
        aplicarTema(t)
        set({ tema: t })
      },
      toggleTema: () => {
        const nuevo = get().tema === "dark" ? "light" : "dark"
        aplicarTema(nuevo)
        set({ tema: nuevo })
      },

      registrarMetodoDefault: "efectivo",
      setRegistrarMetodoDefault: (v) => set({ registrarMetodoDefault: v }),
      registrarModoDefault: "detallado",
      setRegistrarModoDefault: (v) => set({ registrarModoDefault: v }),
      splitModoDefault: "preciso",
      setSplitModoDefault: (v) => set({ splitModoDefault: v }),
    }),
    {
      name: "abys-ui",
      partialize: (s) => ({
        sidebarColapsado: s.sidebarColapsado,
        tema: s.tema,
        registrarMetodoDefault: s.registrarMetodoDefault,
        registrarModoDefault: s.registrarModoDefault,
        splitModoDefault: s.splitModoDefault,
      }),
      onRehydrateStorage: () => (state) => {
        aplicarTema(state?.tema ?? "dark")
      },
    },
  ),
)

// Aplica el tema inicial antes del primer render (evita flash).
aplicarTema(useUiStore.getState().tema)