import { bsToCents } from "@/lib/format"

export interface OcrResult {
  texto: string
  monto_enteros?: number
  fecha?: string // YYYY-MM-DD si se detecta
  referencia?: string
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
]
const MES_INDEX: Record<string, number> = {}
MESES.forEach((m, i) => {
  MES_INDEX[m] = (i % 12) + 1
})

function normalizarLineas(texto: string): string[] {
  return texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
}

/** Detecta montos: prioriza los que tienen sufijo Bs; luego el primer decimal >= 10. */
function detectarMonto(texto: string): number | undefined {
  const conPrefijo: RegExp[] = [
    /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:Bs\.?|BOB|bob|bolivianos)/g,
    /(?:Bs\.?|BOB|bob)\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/g,
  ]
  for (const re of conPrefijo) {
    const candidatos: number[] = []
    let m: RegExpExecArray | null
    while ((m = re.exec(texto)) !== null) {
      const cents = bsToCents(m[1] ?? m[2] ?? "")
      if (cents != null) candidatos.push(cents)
    }
    if (candidatos.length > 0) {
      return Math.max(...candidatos)
    }
  }

  // Decimal suelto que parezca un monto razonable (>= 10 Bs).
  const sueltos: number[] = []
  const reSuelto = /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/g
  let m: RegExpExecArray | null
  while ((m = reSuelto.exec(texto)) !== null) {
    const cents = bsToCents(m[1])
    if (cents != null && cents >= 1000) sueltos.push(cents) // >= 10 Bs
  }
  if (sueltos.length === 0) return undefined
  // El monto de mayor probabilidad suele ser el más alto no anómalo.
  sueltos.sort((a, b) => b - a)
  return sueltos[0]
}

function detectarFecha(texto: string): string | undefined {
  const reISO = /(20\d{2})[-\/](\d{1,2})[-\/](\d{1,2})/
  const reNum = /(\d{1,2})[-\/](\d{1,2})[-\/](20\d{2})/
  const reTexto = new RegExp(
    `(\\d{1,2})\\s+(?:de\\s+)?(${MESES.join("|")})\\s+(?:de\\s+)?(20\\d{2})`,
    "i",
  )

  let m = texto.match(reISO)
  if (m) return `${m[1]}-${String(+m[2]).padStart(2, "0")}-${String(+m[3]).padStart(2, "0")}`

  m = texto.match(reTexto)
  if (m) return `${m[3]}-${String(MES_INDEX[m[2].toLowerCase()]).padStart(2, "0")}-${String(+m[1]).padStart(2, "0")}`

  m = texto.match(reNum)
  if (m) return `${m[3]}-${String(+m[2]).padStart(2, "0")}-${String(+m[1]).padStart(2, "0")}`

  return undefined
}

function detectarReferencia(texto: string): string | undefined {
  const lineas = normalizarLineas(texto)
  const clave = /(referencia|ref\.?|n[°º]\s*)/i
  const conNum = /\d{4,}/
  for (const l of lineas) {
    if (clave.test(l) && conNum.test(l)) {
      return l.replace(/\s{2,}/g, " ").slice(0, 80)
    }
  }
  return undefined
}

/**
 * Ejecuta OCR en español sobre una imagen de comprobante.
 * Carga tesseract.js dinámicamente (mantiene el bundle inicial ligero).
 */
export async function leerComprobante(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<OcrResult> {
  const { recognize } = await import("tesseract.js")
  const res = await recognize(file, "spa", {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text" && typeof m.progress === "number") {
        onProgress?.(m.progress)
      }
    },
  })

  const texto = res.data.text
  return {
    texto,
    monto_enteros: detectarMonto(texto),
    fecha: detectarFecha(texto),
    referencia: detectarReferencia(texto),
  }
}