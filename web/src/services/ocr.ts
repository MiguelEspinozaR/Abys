export interface OcrResult {
  texto: string
  monto_enteros?: number
  fecha?: string // YYYY-MM-DD si se detecta
  referencia?: string
  descripcion?: string
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

/** Palabras que suelen acompañar a un monto real de pago. */
const CONTEXTO_MONTO = [
  "monto debitado", "monto débito", "monto debito", "debitado", "débito", "debito",
  "importe", "total", "pagado", "transferido", "transferencia", "monto", "pago", "cargo",
]
/** Palabras que indican que el número NO es el monto del pago. */
const CONTEXTO_RUIDO = [
  "saldo", "disponible", "operación", "operacion", "autorización", "autorizacion",
  "referencia", "ref.", "número", "numero", "nro", "n°", "cuenta", "fecha", "hora",
  "celular", "teléfono", "telefono", "nit", "c.i.", "ci ", "periodo", "período",
  "vencimiento", "comisión", "comision", "interés", "interes",
]

const MIN_CENTS = 1000 // 10 Bs
const MAX_CENTS = 10_000_000 // 100.000 Bs

function sinAcentos(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

function normalizarLineas(texto: string): string[] {
  return texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
}

/** Quita fechas y horas del texto para no confundirlas con montos. */
function quitarFechas(texto: string): string {
  return texto
    .replace(/\b(20\d{2})[-\/.](\d{1,2})[-\/.](\d{1,2})\b/g, " ")
    .replace(/\b(\d{1,2})[-\/.](\d{1,2})[-\/.](20\d{2})\b/g, " ")
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, " ")
    .replace(new RegExp(`\\b\\d{1,2}\\s+(?:de\\s+)?(?:${MESES.join("|")})\\s+(?:de\\s+)?(?:20\\d{2})?`, "gi"), " ")
}

/**
 * Convierte un token numérico a centavos infiriendo el separador decimal
 * (más robusto que una heurística de separador único).
 */
function parseMontoToken(token: string): number | undefined {
  const t = token.trim()
  if (!/^\d[\d.,]*\d?$/.test(t)) return undefined
  const hasDot = t.includes(".")
  const hasComma = t.includes(",")
  let normalized = t
  if (hasDot && hasComma) {
    if (t.lastIndexOf(",") > t.lastIndexOf(".")) {
      normalized = t.replace(/\./g, "").replace(",", ".")
    } else {
      normalized = t.replace(/,/g, "")
    }
  } else if (hasComma) {
    normalized = /,\d{1,2}$/.test(t) ? t.replace(",", ".") : t.replace(/,/g, "")
  } else if (hasDot) {
    normalized = /\.\d{1,2}$/.test(t) ? t : t.replace(/\./g, "")
  }
  const val = Number(normalized)
  if (!Number.isFinite(val)) return undefined
  return Math.round(val * 100)
}

interface Candidato {
  cents: number
  score: number
  orden: number
}

/**
 * Detecta el monto del pago priorizando líneas con contexto ("monto debitado",
 * "importe", "total"…) y descartando números de operación, saldo, fechas, etc.
 */
function detectarMonto(texto: string): number | undefined {
  const limpio = quitarFechas(texto)
  const lineas = normalizarLineas(limpio)
  const candidatos: Candidato[] = []
  let orden = 0

  // Token completo: captura la corrida de dígitos entera (no la recorta a 3).
  const reToken = /\d[\d.,]*\d|\d/g

  for (const lineaRaw of lineas) {
    const linea = sinAcentos(lineaRaw.toLowerCase())
    const positivos = CONTEXTO_MONTO.filter((k) => linea.includes(sinAcentos(k))).length
    const ruido = CONTEXTO_RUIDO.filter((k) => linea.includes(sinAcentos(k))).length
    const tieneBs = /(bs\.?|bob|bolivianos)/.test(linea)

    let m: RegExpExecArray | null
    reToken.lastIndex = 0
    while ((m = reToken.exec(lineaRaw)) !== null) {
      const token = m[0]
      const cents = parseMontoToken(token)
      const idx = orden++
      if (cents == null || cents < MIN_CENTS || cents > MAX_CENTS) continue
      // Números largos sin separadores (autorización/operación) quedan fuera de rango,
      // pero descartamos también enteros de 7+ dígitos por seguridad.
      if (!/[.,]/.test(token) && token.length >= 7) continue

      let score = positivos * 3 - ruido * 4
      if (tieneBs) score += 2
      if (/[.,]\d{2}$/.test(token)) score += 1 // parece tener centavos
      if (positivos > 0 && ruido === 0) score += 2
      candidatos.push({ cents, score, orden: idx })
    }
  }

  if (candidatos.length === 0) return undefined
  candidatos.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.orden - b.orden // ante empate, el primero que aparece
  })
  return candidatos[0].cents
}

function detectarFecha(texto: string): string | undefined {
  const reISO = /(20\d{2})[-\/](\d{1,2})[-\/](\d{1,2})/
  const reNum = /(\d{1,2})[-\/](\d{1,2})[-\/](20\d{2})/
  const reTexto = new RegExp(
    `(\\d{1,2})\\s+(?:de\\s+)?(${MESES.join("|")})\\s+(?:de\\s+)?(20\\d{2})`,
    "i",
  )

  const valida = (a: number, m: number, d: number): string | undefined => {
    if (m < 1 || m > 12 || d < 1 || d > 31) return undefined
    return `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
  }

  let m = texto.match(reISO)
  if (m) return valida(+m[1], +m[2], +m[3])

  m = texto.match(reTexto)
  if (m) return valida(+m[3], MES_INDEX[m[2].toLowerCase()], +m[1])

  m = texto.match(reNum)
  if (m) return valida(+m[3], +m[2], +m[1])

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

/** Extrae el comentario/descripción que aparece en el comprobante. */
function detectarDescripcion(texto: string): string | undefined {
  const lineas = normalizarLineas(texto)
  const clave = /(descripci[oó]n|detalle|concepto|glosa|comentario|observaci[oó]n|motivo)/i
  for (const l of lineas) {
    const m = l.match(clave)
    if (!m) continue
    const valor = l
      .slice((m.index ?? 0) + m[0].length)
      .replace(/^[\s:.\-–]+/, "")
      .trim()
    if (valor.length >= 3) return valor.replace(/\s{2,}/g, " ").slice(0, 120)
  }
  return undefined
}

/** Extrae los campos útiles de un texto OCR (función pura y testeable). */
export function extraerDatosComprobante(
  texto: string,
): Pick<OcrResult, "monto_enteros" | "fecha" | "referencia" | "descripcion"> {
  return {
    monto_enteros: detectarMonto(texto),
    fecha: detectarFecha(texto),
    referencia: detectarReferencia(texto),
    descripcion: detectarDescripcion(texto),
  }
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

  return { texto: res.data.text, ...extraerDatosComprobante(res.data.text) }
}
