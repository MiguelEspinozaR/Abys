/**
 * Helpers de formato monetario (BOB) y tasas.
 * Los montos SIEMPRE viajan en centavos hacia/desde la API;
 * solo la UI muestra "Bs" formateado.
 */

const nfBs = new Intl.NumberFormat("es-BO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const nfPct = new Intl.NumberFormat("es-BO", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

/** 26500 → "265,00 Bs" ; 123456 → "1.234,56 Bs" */
export function formatBs(cents: number | string): string {
  const n = typeof cents === "string" ? Number(cents) : cents
  if (!Number.isFinite(n)) return "—"
  const signo = n < 0 ? "−" : ""
  return `${signo}${nfBs.format(Math.abs(n) / 100)} Bs`
}

/** 2000 → "20,00 %" */
export function formatTasaBps(bps: number | string): string {
  const n = typeof bps === "string" ? Number(bps) : bps
  if (!Number.isFinite(n)) return "—"
  return `${nfPct.format(n / 100)} %`
}

/** 2000 → 20 (número de porcentaje, para inputs de edición) */
export function bpsToPercentNum(bps: number): number {
  return bps / 100
}

/** 20.5 (número) → 2050 bps */
export function percentNumToBps(pct: number): number {
  return Math.round(pct * 100)
}

/**
 * Parsea una cadena de monto en Bs a centavos.
 * Acepta "1.234,56", "1234,56", "1234.56", "1,234.56", "265", "265 Bs".
 * Devuelve null si no es parseable o es negativo.
 */
export function bsToCents(input: string): number | null {
  const limpio = input
    .trim()
    .replace(/\s+/g, "")
    .replace(/bs\.?$/i, "")
    .trim()
  if (!limpio) return null

  let s = limpio
  const ultimoPunto = s.lastIndexOf(".")
  const ultimaComa = s.lastIndexOf(",")

  // Si hay ambos separadores, el último es el decimal.
  if (ultimoPunto > -1 && ultimaComa > -1) {
    const sep = ultimoPunto > ultimaComa ? "." : ","
    s = s.replace(/[.,]/g, (m) => (m === sep ? "." : ""))
  } else if (ultimaComa > -1 && ultimoPunto === -1) {
    // Ambiguo: "1.234" (miles) vs "1234,56" (decimal). Más de un separador → miles.
    if ((s.match(/,/g) ?? []).length > 1) {
      s = s.replace(/,/g, "")
    } else {
      s = s.replace(",", ".")
    }
  }

  const n = Number(s)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

const DIAS_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]

/** "2026-08-27" → "mié 27 ago 2026" (fecha local, no UTC-shift). */
export function formatearFechaEs(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number)
  if (!y || !m || !d) return fecha
  const dt = new Date(y, m - 1, d)
  return new Intl.DateTimeFormat("es-BO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(dt)
}

/** "2026-08-27" → "miércoles" */
export function diaSemanaEs(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number)
  if (!y || !m || !d) return fecha
  return DIAS_SEMANA[new Date(y, m - 1, d).getDay()]
}

export const MESES_ABREV = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
]

export const METODOS_PAGO: { value: string; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "qr", label: "QR" },
  { value: "transaccion", label: "Transacción" },
]

export function labelMetodo(metodo: string): string {
  return METODOS_PAGO.find((m) => m.value === metodo)?.label ?? metodo
}

/** Convierte un Date local a "YYYY-MM-DD" sin shifts de zona horaria. */
export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Parsea "YYYY-MM-DD" a Date local (sin UTC-shift). */
export function fromISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}