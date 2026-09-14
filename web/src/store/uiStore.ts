import { create } from "zustand"
import { persist } from "zustand/middleware"

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
}

function aplicarTema(tema: Tema) {
  const root = document.documentElement
  if (tema === "dark") root.classList.add("dark")
  else root.classList.remove("dark")
  root.style.colorScheme = tema
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
    }),
    {
      name: "abys-ui",
      partialize: (s) => ({ sidebarColapsado: s.sidebarColapsado, tema: s.tema }),
      onRehydrateStorage: () => (state) => {
        aplicarTema(state?.tema ?? "dark")
      },
    },
  ),
)

// Aplica el tema inicial antes del primer render (evita flash).
aplicarTema(useUiStore.getState().tema)