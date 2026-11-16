/**
 * Sincroniza `<meta name="theme-color">` con el token `--background` del tema
 * activo. El valor del HTML es solo el inicial (dark) para evitar el flash; este
 * helper lo reemplaza por el color computado real en cuanto el CSS está listo.
 *
 * La normalización a `rgb()`/hex es determinista (conversión oklch pura) para no
 * depender de la serialización del canvas/navegador (R5.2).
 */

const TOKEN = "--background"
const META_SELECTOR = 'meta[name="theme-color"]'

const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const RGB = /^rgba?\(([^)]+)\)$/i
const OKLCH = /^oklch\((.+)\)$/i

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}

function clamp255(v: number): number {
  return Math.min(255, Math.max(0, Math.round(v)))
}

function parseComponent(token: string): number | null {
  const t = token.trim().toLowerCase()
  if (t === "none") return 0
  if (t.endsWith("%")) {
    const n = Number.parseFloat(t.slice(0, -1))
    return Number.isFinite(n) ? n / 100 : null
  }
  const n = Number.parseFloat(t)
  return Number.isFinite(n) ? n : null
}

function parseHue(token: string): number | null {
  const t = token.trim().toLowerCase()
  if (t === "none") return 0
  let value: number
  let unit = "deg"
  const m = /^(-?\d*\.?\d+)(deg|rad|grad|turn)?$/.exec(t)
  if (!m) return null
  value = Number.parseFloat(m[1])
  unit = m[2] ?? "deg"
  if (!Number.isFinite(value)) return null
  switch (unit) {
    case "rad":
      return (value * 180) / Math.PI
    case "grad":
      return value * 0.9
    case "turn":
      return value * 360
    default:
      return value
  }
}

function linearToSrgb(c: number): number {
  const v = clamp01(c)
  if (v <= 0.0031308) return 12.92 * v
  return 1.055 * Math.pow(v, 1 / 2.4) - 0.055
}

/**
 * Convierte OKLCH a `rgb()`/`rgba()` determinísticamente.
 * oklch -> oklab -> LMS (no lineal) -> LMS lineal -> sRGB lineal -> sRGB.
 */
export function oklchToRgb(
  lRaw: number,
  cRaw: number,
  hRaw: number,
  alphaRaw = 1,
): string {
  // L puede venir como 0..1 o 0..100.
  const L = Math.abs(lRaw) > 1 ? lRaw / 100 : lRaw
  const C = Math.abs(cRaw)
  const hRad = (hRaw * Math.PI) / 180
  const alpha = clamp01(alphaRaw)

  const a = C * Math.cos(hRad)
  const b = C * Math.sin(hRad)

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b

  const l3 = l_ * l_ * l_
  const m3 = m_ * m_ * m_
  const s3 = s_ * s_ * s_

  const rLin = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3
  const gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3
  const bLin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3

  const r = clamp255(linearToSrgb(rLin) * 255)
  const g = clamp255(linearToSrgb(gLin) * 255)
  const bl = clamp255(linearToSrgb(bLin) * 255)

  if (alpha >= 1) return `rgb(${r}, ${g}, ${bl})`
  const aStr = Number(alpha.toFixed(3)).toString()
  return `rgba(${r}, ${g}, ${bl}, ${aStr})`
}

function parseAlpha(token: string): number | null {
  const t = token.trim().toLowerCase()
  if (t === "none") return 0
  if (t.endsWith("%")) {
    const n = Number.parseFloat(t.slice(0, -1))
    return Number.isFinite(n) ? n / 100 : null
  }
  const n = Number.parseFloat(t)
  return Number.isFinite(n) ? n : null
}

function parseOklch(valor: string): string | null {
  const m = OKLCH.exec(valor.trim())
  if (!m) return null
  const body = m[1].trim()
  // Soporta "L C H" y "L C H / A"
  let main = body
  let alphaStr = "1"
  const slash = body.indexOf("/")
  if (slash !== -1) {
    main = body.slice(0, slash).trim()
    alphaStr = body.slice(slash + 1).trim()
  }
  const parts = main.trim().split(/\s+/)
  if (parts.length < 3) return null
  const L = parseComponent(parts[0])
  const C = parseComponent(parts[1])
  const H = parseHue(parts[2])
  const A = parseAlpha(alphaStr)
  if (L == null || C == null || H == null || A == null) return null
  return oklchToRgb(L, C, H, A)
}

function normalizeRgb(valor: string): string | null {
  const m = RGB.exec(valor.trim())
  if (!m) return null
  // Re-serializa de forma estable (recorta espacios).
  const parts = m[1].split(/[,\s/]+/).filter(Boolean)
  if (parts.length < 3) return null
  const nums = parts.slice(0, 3).map((p) => Number.parseFloat(p))
  if (nums.some((n) => !Number.isFinite(n))) return null
  const [r, g, b] = nums.map((n) => clamp255(n))
  if (parts.length >= 4) {
    const a = parseAlpha(parts[3])
    if (a == null) return null
    const alpha = clamp01(a)
    if (alpha >= 1) return `rgb(${r}, ${g}, ${b})`
    const aStr = Number(alpha.toFixed(3)).toString()
    return `rgba(${r}, ${g}, ${b}, ${aStr})`
  }
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * Normaliza un color CSS a `rgb()`/`hex` para usarlo como `theme-color`.
 * - `#rgb/#rrggbb/...` y `rgb()/rgba()` se devuelven normalizados.
 * - `oklch(...)` se convierte determinísticamente a `rgb()/rgba()`.
 * - Fallback: devuelve el valor original si no es parseable.
 */
export function normalizarColor(token: string): string | null {
  const valor = token.trim()
  if (!valor) return null
  if (HEX.test(valor)) return valor.toLowerCase()
  const rgb = normalizeRgb(valor)
  if (rgb) return rgb
  const oklch = parseOklch(valor)
  if (oklch) return oklch
  // Fallback seguro: valor tal cual si parece color soportado, si no el propio string.
  return valor
}

function leerTokenBackground(): string | null {
  if (typeof document === "undefined" || typeof getComputedStyle !== "function") {
    return null
  }
  const token = getComputedStyle(document.documentElement)
    .getPropertyValue(TOKEN)
    .trim()
  return token || null
}

function aplicarMeta(): boolean {
  const token = leerTokenBackground()
  if (!token) return false
  const color = normalizarColor(token)
  if (!color) return false

  let meta = document.querySelector<HTMLMetaElement>(META_SELECTOR)
  if (!meta) {
    meta = document.createElement("meta")
    meta.name = "theme-color"
    document.head.appendChild(meta)
  }
  meta.content = color
  return true
}

/**
 * Lee `--background` computed (después de aplicar `.dark`) y actualiza/crea la
 * meta. Si el token todavía no está disponible (CSS sin cargar), reintenta en
 * el siguiente frame.
 */
export function sincronizarThemeColor(): void {
  if (aplicarMeta()) return
  if (typeof requestAnimationFrame !== "function") return
  requestAnimationFrame(() => {
    aplicarMeta()
  })
}

