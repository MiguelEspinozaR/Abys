import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ResultadoRealizacion } from "@/features/splits/realizarSeleccionados"

// El entorno de tests es Node (sin DOM): se aísla el store, que aplica el tema
// en `document.documentElement` al importarse.
const mocks = vi.hoisted(() => ({
  useMutation: vi.fn(),
  invalidateQueries: vi.fn(),
  put: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock("@tanstack/react-query", () => ({
  useMutation: (config: unknown) => {
    mocks.useMutation(config)
    return { ...(config as object), mutateAsync: vi.fn() }
  },
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
  useQuery: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
    warning: vi.fn(),
  },
}))

vi.mock("./api", () => ({ api: { put: mocks.put } }))

vi.mock("@/store/uiStore", () => ({
  useUiStore: { getState: vi.fn(() => ({})), setState: vi.fn() },
}))

import { useMarcarRealizadas } from "./hooks"

interface ConfiguracionBulk {
  mutationFn: (ids: number[]) => Promise<ResultadoRealizacion>
  onSuccess: (resultado: ResultadoRealizacion, ids: number[]) => void
}

/** Captura la configuración registrada por el único `useMutation` del hook. */
function configuracionBulk(): ConfiguracionBulk {
  // Guard estático: el hook bulk no delega en `useMarcarRealizada` (que también
  // registrarían un `useMutation` por id si se llamara en bucle).
  expect(mocks.useMutation).toHaveBeenCalledTimes(1)
  return mocks.useMutation.mock.calls[0][0] as ConfiguracionBulk
}

const CLAVES = [["splits"], ["split"], ["pagos"], ["historial"]]

beforeEach(() => {
  vi.clearAllMocks()
  mocks.put.mockImplementation((url: string) => Promise.resolve({ url }))
})

describe("useMarcarRealizadas", () => {
  it("hace un PUT por id con la URL exacta y agrega el resultado (U3a)", async () => {
    useMarcarRealizadas()
    const config = configuracionBulk()

    const resultado = await config.mutationFn([1, 2, 3])

    expect(mocks.put.mock.calls.map(([url]) => url)).toEqual([
      "/transacciones/1/realizar",
      "/transacciones/2/realizar",
      "/transacciones/3/realizar",
    ])
    expect(resultado).toEqual({ ok: [1, 2, 3], fallidos: [] })
  })

  it("éxito total: una notificación y una ronda de 4 invalidaciones (U3b)", () => {
    useMarcarRealizadas()
    const config = configuracionBulk()

    config.onSuccess({ ok: [1, 2, 3], fallidos: [] }, [1, 2, 3])

    expect(mocks.toastSuccess).toHaveBeenCalledTimes(1)
    expect(mocks.toastSuccess.mock.calls[0][0]).toContain("3 transacciones")
    expect(mocks.toastError).not.toHaveBeenCalled()
    expect(mocks.invalidateQueries.mock.calls.map(([{ queryKey }]) => queryKey)).toEqual(CLAVES)
  })

  it("fallo parcial: un error con los ids fallidos y las mismas invalidaciones (U3c)", () => {
    useMarcarRealizadas()
    const config = configuracionBulk()

    config.onSuccess(
      { ok: [1, 3], fallidos: [{ id: 2, mensaje: "500" }] },
      [1, 2, 3],
    )

    expect(mocks.toastError).toHaveBeenCalledTimes(1)
    const mensaje: string = mocks.toastError.mock.calls[0][0]
    expect(mensaje).toContain("2 de 3")
    expect(mensaje).toContain("#2")
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
    expect(mocks.invalidateQueries.mock.calls.map(([{ queryKey }]) => queryKey)).toEqual(CLAVES)
  })
})
