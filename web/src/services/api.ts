import type { ApiErrorBody } from "./types"

/**
 * Cliente HTTP tipado para la API de Abys.
 * Base URL configurable vía VITE_API_URL (default http://localhost:8080/api/v1).
 * Los errores `{error:{code,message}}` se lanzan como ApiRequestError.
 */

const BASE_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8080/api/v1").replace(
  /\/+$/,
  "",
)

export class ApiRequestError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = "ApiRequestError"
    this.code = code
    this.status = status
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  body?: unknown
  /** para multipart: pasar FormData como body y desactivar el Content-Type JSON */
  formData?: FormData
  signal?: AbortSignal
  headers?: HeadersInit
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, formData, signal, headers } = opts

  const isForm = formData instanceof FormData
  const init: RequestInit = {
    method,
    signal,
    headers: isForm
      ? headers
      : { "Content-Type": "application/json", ...(headers ?? {}) },
    body: isForm ? formData : body !== undefined ? JSON.stringify(body) : undefined,
  }

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, init)
  } catch (e) {
    throw new ApiRequestError(
      "NETWORK_ERROR",
      "No se pudo conectar con el servidor. Verifica que el backend esté activo.",
      0,
    )
  }

  let json: unknown = null
  try {
    json = await res.json()
  } catch {
    /* respuestas sin cuerpo JSON */
  }

  if (!res.ok) {
    const errBody = json as ApiErrorBody | null
    const error = errBody?.error
    throw new ApiRequestError(
      error?.code ?? "ERROR",
      error?.message ?? `Error HTTP ${res.status}`,
      res.status,
    )
  }

  // Desempaqueta { data: T }; si no hay wrapper, devuelve el body tal cual.
  if (json && typeof json === "object" && "data" in json) {
    return (json as { data: T }).data
  }
  return json as T
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  postForm: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: "POST", formData }),
}

export { BASE_URL }

/** URL absoluta para servir recursos estáticos del backend (imagen_ruta, qr_ruta). */
export function assetUrl(ruta: string | null | undefined): string | null {
  if (!ruta) return null
  if (ruta.startsWith("http")) return ruta
  const base = (import.meta.env.VITE_API_URL ?? "http://localhost:8080/api/v1").replace(
    /\/api\/v1\/?$/,
    "",
  )
  return `${base}${ruta.startsWith("/") ? ruta : `/${ruta}`}`
}