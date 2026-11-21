import { describe, expect, it, vi } from "vitest"
import { realizarSeleccionados } from "./realizarSeleccionados"

describe("realizarSeleccionados", () => {
  it("llama a marcar una vez por id y devuelve todos como ok (U1a)", async () => {
    const marcar = vi.fn(async (id: number) => ({ id }))
    const resultado = await realizarSeleccionados([1, 2, 3], marcar)

    expect(marcar).toHaveBeenCalledTimes(3)
    expect(marcar.mock.calls.map(([id]) => id)).toEqual([1, 2, 3])
    expect(resultado).toEqual({ ok: [1, 2, 3], fallidos: [] })
  })

  it("separa los fallidos del resultado parcial (U1b)", async () => {
    const marcar = vi.fn(async (id: number) => {
      if (id === 2) throw new Error("falló el banco")
      return { id }
    })
    const resultado = await realizarSeleccionados([1, 2, 3], marcar)

    expect(resultado.ok).toEqual([1, 3])
    expect(resultado.fallidos).toEqual([{ id: 2, mensaje: "falló el banco" }])
  })

  it("no lanza cuando fallan todos (U1c)", async () => {
    const marcar = vi.fn(async () => {
      throw new Error("sin conexión")
    })
    await expect(realizarSeleccionados([7, 8], marcar)).resolves.toEqual({
      ok: [],
      fallidos: [
        { id: 7, mensaje: "sin conexión" },
        { id: 8, mensaje: "sin conexión" },
      ],
    })
  })

  it("no llama a marcar con la lista vacía (U1d)", async () => {
    const marcar = vi.fn(async () => undefined)
    await expect(realizarSeleccionados([], marcar)).resolves.toEqual({
      ok: [],
      fallidos: [],
    })
    expect(marcar).not.toHaveBeenCalled()
  })

  it("normaliza Error/string y conserva el orden de entrada (U1e)", async () => {
    const marcar = vi.fn(async (id: number) => {
      if (id === 1) throw "error como texto"
      if (id === 4) throw new Error("error tipado")
      return id
    })
    const resultado = await realizarSeleccionados([4, 2, 1], marcar)

    expect(resultado).toEqual({
      ok: [2],
      fallidos: [
        { id: 4, mensaje: "error tipado" },
        { id: 1, mensaje: "error como texto" },
      ],
    })
  })
})
