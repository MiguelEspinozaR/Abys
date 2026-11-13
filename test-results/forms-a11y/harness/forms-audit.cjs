#!/usr/bin/env node
/* ============================================================================
 * Harness de evidencia M4 — feature forms-a11y (SPEC §8, PLAN §7–§9/§14).
 *
 * Alcance y seguridad:
 *  - Todas las escrituras de API (POST/PUT/DELETE) se interceptan con
 *    page.route() y se responden con mocks (200/400/409/422/500). Una red de
 *    seguridad registrada con la MENOR precedencia aborta con 599 cualquier
 *    escritura no mockeada, por lo que es imposible persistir datos.
 *  - El backend de auditoría (:18082) solo recibe GETs reales.
 *  - Solo escribe bajo test-results/forms-a11y/ (más el build/tsc/go test de
 *    AC8, artefactos derivados exigidos por el propio AC).
 *  - Reutiliza PAGE_LIB del harness del bloque A (test-results/a11y-gate) para
 *    las mediciones de foco/táctil/contraste/overflow (misma matemática).
 *
 * Uso: node test-results/forms-a11y/harness/forms-audit.cjs
 * Requiere: preview :5178 sirviendo web/dist con VITE_API_URL=:18082/api/v1,
 *           backend de auditoría en :18082, Playwright 1.65 (npx cache).
 * ========================================================================== */
const { chromium } = require('/home/miky/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const ROOT = '/home/miky/Documentos/finanzasMikyGoRef'
const OUT = path.join(ROOT, 'test-results/forms-a11y')
const SHOTS = path.join(OUT, 'screenshots')
const LOGS = path.join(OUT, 'logs')
const GATE = path.join(ROOT, 'test-results/a11y-gate/harness/audit.cjs')
const WEB = path.join(ROOT, 'web')
const BACKEND = path.join(ROOT, 'backend')
const BASE = process.env.BASE_URL || 'http://localhost:5178'
const API_ORIGIN = 'http://localhost:18082'
const API = API_ORIGIN + '/api/v1'
const THEME_KEY = 'abys-ui'
const COMMIT = (() => {
  const r = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT })
  return r.status === 0 ? r.stdout.toString().trim() : 'unknown'
})()
const BASE_COMMIT = '490de51'

/* ------------------------------------------------------------------ */
/* PAGE_LIB + helpers de color del harness del bloque A                */
/* ------------------------------------------------------------------ */
const gateSrc = fs.readFileSync(GATE, 'utf8')
const PAGE_LIB = gateSrc.match(new RegExp('const PAGE_LIB = String\\.raw`([\\s\\S]*?)`\\n'))[1]
// Los helpers de color del lado nodo viven en su propia sección (después de
// PAGE_LIB, que también define un clamp01): se ancla la búsqueda al marcador.
const SEC = gateSrc.indexOf('Node color helpers')
const HELPERS_START = gateSrc.indexOf('function clamp01', SEC)
const HELPERS_END = gateSrc.indexOf('\n/* ----', gateSrc.indexOf('function rgbStr', SEC))
const NODE_HELPERS = gateSrc.slice(HELPERS_START, HELPERS_END)
const H = new Function(NODE_HELPERS + '\nreturn { computeIndicator };')()

/* ------------------------------------------------------------------ */
/* Stub de OCR (chunk tesseract de web/dist) — mismo truco del bloque A */
/* ------------------------------------------------------------------ */
function findTesseractChunk() {
  const dir = path.join(WEB, 'dist/assets')
  const js = fs.readdirSync(dir).filter(f => f.endsWith('.js'))
  const read = f => fs.readFileSync(path.join(dir, f), 'utf8')
  for (const f of js) {
    const s = read(f)
    if (!s.includes('recognizing text')) continue
    const m = s.match(/import\("(\.\/[^"]+\.js)"\)/)
    if (m && js.includes(m[1].replace('./', ''))) return '/assets/' + m[1].replace('./', '')
  }
  for (const f of js) {
    const s = read(f)
    if (s.includes('createWorker') && /export\{[^}]*as i\}/.test(s)) return '/assets/' + f
  }
  throw new Error('tesseract chunk not found in web/dist/assets')
}
const TESSERACT_CHUNK = findTesseractChunk()

/** Stub del módulo OCR: devuelve `text` con delays opcionales (progreso). */
function ocrStub(text, delayMs = 0) {
  const stepDelay = Math.round(delayMs / 4)
  return `
const recognize = async (file, lang, opts) => {
  const steps = [0.25, 0.5, 0.75, 1];
  for (const p of steps) {
    try { if (opts && opts.logger) opts.logger({ status: 'recognizing text', progress: p }); } catch (e) {}
    ${delayMs ? `await new Promise(r => setTimeout(r, ${stepDelay}));` : ''}
  }
  return { data: { text: ${JSON.stringify(text)} } };
};
const i = { recognize };
export { i };
`
}

const PNG_BUFFER = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
const MB11 = Buffer.alloc(11 * 1024 * 1024, 1)

/** Texto OCR con monto+fecha+referencia+descripcion (~146 chars de notas). */
const OCR_TEXTO = 'Monto debitado: 265,00\nFecha: 05/11/2026\nReferencia: 1234567890\nDescripción: pago mensual de servicios del mes de octubre'
/** Texto OCR largo: descripcion se trunca a 120 en el parser (services.ts). */
/** Texto OCR alternativo: si se aplicara tras guardar, cambiaría el monto (999,00). */
const OCR_TEXTO_ALT = 'Monto debitado: 999,00\nFecha: 10/11/2026\nReferencia: 9999999999\nDescripción: otro comprobante distinto'
const OCR_TEXTO_LARGO = 'Monto debitado: 265,00\nFecha: 05/11/2026\nReferencia: 1234567890\nDescripción: ' + 'pago mensual servicios varios con detalle extendido '.repeat(10)

/* ------------------------------------------------------------------ */
/* Viewports / utilidades                                             */
/* ------------------------------------------------------------------ */
const VIEWPORTS = {
  m390: { label: 'mobile', width: 390, height: 844 },
  desktop: { label: 'desktop', width: 1440, height: 900 },
}
const ROUTES = ['/', '/ingresos', '/splits', '/registrar', '/configuracion']

const now = () => new Date().toISOString()
const startedAt = now()
const results = [] // todos los casos {ac, id, checks, pass, console, failedRequests, unhandled}
const CHECK = (name, pass, detail) => ({ name, pass: !!pass, detail: detail === undefined ? (pass ? 'ok' : 'FALLO') : String(detail) })

for (const d of [SHOTS, LOGS]) fs.mkdirSync(d, { recursive: true })

/* ------------------------------------------------------------------ */
/* Entorno de página: contexto + escucha de consola + red de seguridad */
/* ------------------------------------------------------------------ */
async function newPage(browser, { theme = 'light', vp = VIEWPORTS.m390, ocrText = null, ocrDelay = 0 } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    reducedMotion: 'no-preference',
    deviceScaleFactor: 1,
  })
  await ctx.addInitScript(({ key, theme }) => {
    localStorage.setItem(key, JSON.stringify({ state: { sidebarColapsado: false, tema: theme }, version: 0 }))
  }, { key: THEME_KEY, theme })
  await ctx.addInitScript(PAGE_LIB)
  await ctx.addInitScript(() => {
    window.__unhandled = []
    window.addEventListener('unhandledrejection', (e) => {
      window.__unhandled.push(String((e.reason && e.reason.message) || e.reason))
    })
    window.__submits = 0
    document.addEventListener('submit', () => { window.__submits++ }, true)
  })
  const page = await ctx.newPage()
  const st = { requests: [], unexpected: [], mockedFail: [], mockedFailStatuses: new Set(), consoleMocked: [] }
  const consoleMsgs = []
  const pageErrors = []
  const failed = []
  page.on('console', m => {
    if (m.type() !== 'error' && m.type() !== 'warning') return
    const loc = (m.location && m.location() && m.location().url) || ''
    // Chrome registra "Failed to load resource" para las respuestas 4xx/5xx que
    // el harness simula a propósito (mockWrite): no son errores de consola de la
    // app. Se separan (quedan visibles en console-log.json como mockedNetwork).
    if (m.type() === 'error' && /^Failed to load resource/i.test(m.text())) {
      const statusTxt = (m.text().match(/status of (\d+)/) || [])[1]
      const esMock = (loc && st.mockedFail.includes(loc)) || (!loc && statusTxt && st.mockedFailStatuses.has(statusTxt))
      if (esMock) {
        st.consoleMocked.push({ text: m.text(), url: loc })
        return
      }
    }
    consoleMsgs.push({ type: m.type(), text: m.text(), url: loc })
  })
  page.on('pageerror', e => pageErrors.push(e.message))
  page.on('requestfailed', r => failed.push({ url: r.url(), error: r.failure() ? r.failure().errorText : '' }))
  page.on('response', r => {
    if (r.status() >= 400 && !r.headers()['x-harness-mock']) failed.push({ url: r.url(), status: r.status() })
  })
  // OCR stub (patrón del bloque A, probado en gate A).
  if (ocrText != null) {
    await page.route('**' + TESSERACT_CHUNK, route => route.fulfill({ status: 200, contentType: 'application/javascript', body: ocrStub(ocrText, ocrDelay) }))
  }
  // Red de seguridad (primera registrada = menor precedencia): GETs reales
  // pasan; cualquier escritura no mockeada se aborta con 599.
  await page.route(API + '/**', route => {
    const method = route.request().method()
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return route.continue()
    const url = route.request().url()
    st.unexpected.push({ method, url })
    return route.fulfill({
      status: 599,
      contentType: 'application/json',
      headers: { 'x-harness-mock': '1' },
      body: JSON.stringify({ error: { code: 'HARNESS_BLOCKED_WRITE', message: 'escritura no mockeada: bloqueada por el harness' } }),
    })
  })
  return { ctx, page, st, consoleMsgs, pageErrors, failed, vp, theme }
}

/** Mock de una escritura puntual (registrada después de la red de seguridad). */
async function mockWrite(env, spec) {
  await env.page.route(spec.glob, async route => {
    const method = route.request().method()
    if (method !== spec.method) return route.fallback()
    const u = new URL(route.request().url())
    env.st.requests.push({ method, path: u.pathname })
    if (spec.status >= 400) {
      env.st.mockedFail.push(u.href)
      env.st.mockedFailStatuses.add(String(spec.status))
    }
    if (spec.delay) await new Promise(r => setTimeout(r, spec.delay))
    return route.fulfill({
      status: spec.status,
      contentType: 'application/json',
      headers: { 'x-harness-mock': '1' },
      body: JSON.stringify(spec.body ?? { data: {} }),
    })
  })
}

const writeCount = (env, method, pathRe) =>
  env.st.requests.filter(r => r.method === method && pathRe.test(r.path)).length

async function goto(page, route, wait = 900) {
  await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(wait)
}

async function shot(page, name) {
  const file = path.join(SHOTS, name + '.png')
  await page.screenshot({ path: file, animations: 'disabled' })
  return 'screenshots/' + name + '.png'
}

async function tabTo(page, matcher, max = 320) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab')
    const info = await page.evaluate(() => {
      const el = document.activeElement
      if (!el) return null
      return {
        id: el.id || '', tag: el.tagName, role: el.getAttribute('role'),
        slot: el.getAttribute('data-slot'), variant: el.getAttribute('data-variant'),
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
        aria: el.getAttribute('aria-label') || '',
      }
    })
    if (info && matcher(info)) return info
  }
  return null
}

async function pickSelect(page, triggerSel, optionName) {
  await page.locator(triggerSel).click()
  await page.locator('[data-slot=select-content]').first().waitFor({ state: 'visible', timeout: 5000 })
  await page.getByRole('option', { name: optionName }).first().click()
  await page.waitForTimeout(200)
}

/** Nombres accesibles de los controles de un formulario. */
async function auditFormNames(page, scopeSel) {
  return page.evaluate((scopeSel) => {
    const A = window.__a11y
    const root = document.querySelector(scopeSel)
    if (!root) return { error: 'scope not found: ' + scopeSel, total: 0, unnamed: ['<scope not found>'] }
    const controls = Array.from(root.querySelectorAll('input, select, textarea, button')).filter(el => {
      if (el.type === 'hidden' || el.disabled === false && el.type === 'hidden') return false
      if (el.getAttribute('type') === 'hidden') return false
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false
      if (el.closest('[aria-hidden="true"]')) return false
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) return false
      return true
    })
    const nameOf = (el) => {
      const lb = el.getAttribute('aria-labelledby')
      if (lb) {
        const t = lb.split(/\s+/).map(id => document.getElementById(id)).filter(Boolean)
          .map(e => (e.textContent || '').replace(/\s+/g, ' ').trim()).join(' ').trim()
        if (t) return t
      }
      return A.labelOf(el)
    }
    const controlsInfo = controls.map(el => ({ sel: A.selectorOf(el), name: nameOf(el) }))
    const unnamed = controlsInfo.filter(c => !c.name || !c.name.trim()).map(c => c.sel)
    return { total: controls.length, unnamed, controls: controlsInfo }
  }, scopeSel)
}

async function focusInfo(page) {
  // El anillo de foco anima con transition-all (~150-300ms): se espera a que
  // se asiente para medir el indicador estable y no una lectura intermedia.
  await page.waitForTimeout(280)
  const data = await page.evaluate(() => window.__a11y.focusData())
  if (!data) return null
  const indicator = H.computeIndicator(data)
  return { ...data, indicator }
}

async function activeDesc(page) {
  return page.evaluate(() => {
    const el = document.activeElement
    if (!el) return null
    const dlg = el.closest('[data-slot=dialog-content], [data-slot=alert-dialog-content]')
    return { id: el.id || '', tag: el.tagName, text: (el.textContent || '').trim().slice(0, 60), inDialog: dlg ? (dlg.getAttribute('data-slot')) : null }
  })
}

async function noErrorToasts(page) {
  await page.waitForTimeout(600)
  return (await page.locator('[data-sonner-toast][data-type="error"]').count()) === 0
}

async function errorToastTexts(page) {
  const els = await page.locator('[data-sonner-toast][data-type="error"]').all()
  const out = []
  for (const el of els) out.push((await el.textContent() || '').trim().slice(0, 120))
  return out
}

/* ------------------------------------------------------------------ */
/* Aperturas de diálogos / flujos comunes                              */
/* ------------------------------------------------------------------ */
async function openEditarPago(env, withSplit = false) {
  const { page } = env
  await goto(page, '/ingresos', 1200)
  const rowSel = withSplit
    ? 'div.rounded-lg.border:not(:has(button[aria-label="Generar split"])) button[aria-label="Editar pago"]'
    : 'div.rounded-lg.border:has(button[aria-label="Generar split"]) button[aria-label="Editar pago"]'
  await page.locator(rowSel).first().click()
  await page.locator('[data-slot=dialog-content]').first().waitFor({ state: 'visible', timeout: 5000 })
  await page.waitForTimeout(400)
}

async function openDialogFromButton(env, buttonName) {
  const { page } = env
  await page.getByRole('button', { name: buttonName }).first().click()
  await page.locator('[data-slot=dialog-content]').first().waitFor({ state: 'visible', timeout: 5000 })
  await page.waitForTimeout(300)
}

/** Marca un día del mes en curso dentro de un scope (o página). */
async function clickDia(page, scopeSel) {
  const tileSel = (scopeSel ? scopeSel + ' ' : '') + '.react-calendar__month-view__days__day:not(.react-calendar__month-view__days__day--neighboringMonth)'
  await page.locator(tileSel).first().click()
  await page.waitForTimeout(150)
}

async function fillRegistrarValido(env, { monto = '265,00', fuente = 'Essencia' } = {}) {
  const { page } = env
  await pickSelect(page, '#fuente', fuente)
  await page.fill('#monto', monto)
  await clickDia(page, '')
  await page.waitForTimeout(150)
}

const MOCK_PAGO_200 = { data: { id: 99999, fuente_id: 2, fecha_pago: '2026-11-10', monto_enteros: 26500, metodo_pago: 'efectivo', notas: null, dias_trabajados: [1], split_id: null } }
/** Pago con un método fuera de METODOS_PAGO: estado de error alcanzable (solo GET mockeado). */
const MOCK_PAGO_METODO_INVALIDO = {
  id: 235, fuente_id: 2, fecha_pago: '2026-10-29', monto_enteros: 20000, metodo_pago: 'cheque', notas: 'Parlana en malnova',
  imagen_ruta: null, created_at: '2026-10-30T00:32:06.658339-04:00', updated_at: '2026-10-30T00:32:06.658339-04:00',
  fuente_alias: 'Essencia', fuente_color: '#023749',
  dias_trabajados: [
    { id: 443, pago_id: 235, fecha: '2026-10-26' },
    { id: 444, pago_id: 235, fecha: '2026-10-28' },
    { id: 445, pago_id: 235, fecha: '2026-10-29' },
  ],
}
const MOCK_COMPROBANTE_200 = { data: { id: 99999, imagen_ruta: '/uploads/harness.png' } }
const ERR_400_CAMPO = (campo, mensaje) => ({ error: { code: 'VALIDATION_ERROR', message: mensaje, campo } })
const ERR_409 = (mensaje, campo) => ({ error: { code: 'BUSINESS_RULE_CONFLICT', message: mensaje, ...(campo ? { campo } : {}) } })
const ERR_422 = (campo, mensaje) => ({ error: { code: 'IMMUTABLE_DATA', message: mensaje, campo } })
const ERR_500 = { error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor (mock harness)' } }

/* ------------------------------------------------------------------ */
/* Ejecutor de casos                                                  */
/* ------------------------------------------------------------------ */
async function runCase(browser, def) {
  const c = { ac: def.ac, id: def.id, theme: def.theme || 'light', viewport: (def.vp || VIEWPORTS.m390).label, checks: [], error: null }
  const env = await newPage(browser, { theme: c.theme, vp: def.vp, ocrText: def.ocrText, ocrDelay: def.ocrDelay })
  const t0 = Date.now()
  try {
    c.checks = (await def.run(env, c)) || []
  } catch (e) {
    c.error = e.message
    c.checks = c.checks || []
  }
  c.durationMs = Date.now() - t0
  await env.page.waitForTimeout(250)
  c.console = env.consoleMsgs.filter(m => !/favicon/i.test(m.text) && !/favicon/i.test(m.url || ''))
  c.mockedNetwork = env.st.consoleMocked
  c.pageErrors = env.pageErrors
  c.unhandled = [...(await env.page.evaluate(() => window.__unhandled).catch(() => [])), ...env.pageErrors]
  c.failedRequests = env.failed.filter(f => !/favicon/i.test(f.url))
  c.writes = env.st.requests
  c.unexpectedWrites = env.st.unexpected
  c.pass = !c.error && c.checks.length > 0 && c.checks.every(k => k.pass) && !c.unexpectedWrites.length
  if (def.shot) { try { c.screenshot = await shot(env.page, def.shot) } catch (e) { c.screenshot = 'error: ' + e.message } }
  results.push(c)
  const ok = c.pass ? 'PASS' : (c.error ? 'ERROR' : 'FAIL')
  const failed = c.checks.filter(k => !k.pass).map(k => k.name)
  console.log(`  [${ok}] ${def.ac}/${def.id} (${c.durationMs}ms)${failed.length ? ' — fallos: ' + failed.join('; ') : ''}${c.error ? ' — ' + c.error : ''}${!failed.length && !c.error && c.unexpectedWrites && c.unexpectedWrites.length ? ' — writes inesperados: ' + c.unexpectedWrites.join('; ') : ''}`)
  await env.ctx.close()
  return c
}

/* ==========================================================================
 * AC1 — Semántica de formularios y envío
 * ========================================================================== */
async function ac1(browser) {
  // 1. Registrar: nombre accesible de cada control + Enter envía / Select abre.
  await runCase(browser, {
    ac: 'ac1', id: 'registrar', theme: 'light',
    run: async (env) => {
      const { page } = env
      await goto(page, '/registrar')
      const checks = []
      const form = page.locator('form[aria-labelledby="registrar-pago-titulo"]')
      checks.push(CHECK('form con aria-labelledby=registrar-pago-titulo', await form.count() === 1))
      const names = await auditFormNames(page, 'form[aria-labelledby="registrar-pago-titulo"]')
      checks.push(CHECK(`todos los controles del form tienen nombre accesible (${names.total})`, names.unnamed.length === 0, names.unnamed.length ? 'sin nombre: ' + names.unnamed.join(' | ') : names.total + ' controles'))
      checks.push(CHECK('fieldset #metodo con legend', await page.locator('#metodo legend').count() === 1))
      checks.push(CHECK('fieldset #registrar-dias con legend', await page.locator('#registrar-dias legend').count() === 1))
      // Enter en input dispara submit (form noValidate, submit handler).
      await page.focus('#monto')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(400)
      const submits = await page.evaluate(() => window.__submits)
      checks.push(CHECK('Enter en #monto envía el formulario', submits === 1, 'submits=' + submits))
      // Enter en el trigger del Select abre el listbox, no envía.
      await page.focus('#fuente')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(400)
      const listbox = await page.locator('[data-slot=select-content]').count()
      const submits2 = await page.evaluate(() => window.__submits)
      checks.push(CHECK('Enter en #fuente abre el listbox', listbox >= 1, 'select-content=' + listbox))
      checks.push(CHECK('Enter en #fuente NO envía el form', submits2 === submits, 'submits=' + submits2))
      await page.keyboard.press('Escape')
      // Enter en textarea inserta salto de línea, no envía.
      const before = await page.evaluate(() => window.__submits)
      await page.fill('#notas', 'abc')
      await page.focus('#notas')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(200)
      const val = await page.inputValue('#notas')
      const after = await page.evaluate(() => window.__submits)
      checks.push(CHECK('Enter en #notas inserta salto de línea', val.includes('\n'), JSON.stringify(val)))
      checks.push(CHECK('Enter en #notas NO envía el form', after === before, 'submits=' + after))
      return checks
    },
  })

  // 2. Editar pago: nombre accesible, Enter envía, Enter en Select abre, Cancelar/X type=button.
  await runCase(browser, {
    ac: 'ac1', id: 'editar', theme: 'light',
    run: async (env) => {
      const { page } = env
      await openEditarPago(env, false)
      const checks = []
      checks.push(CHECK('dialog aria-labelledby=edit-pago-titulo', await page.locator('[data-slot=dialog-content] form[aria-labelledby="edit-pago-titulo"]').count() === 1))
      const names = await auditFormNames(page, '[data-slot=dialog-content]')
      checks.push(CHECK(`todos los controles del diálogo tienen nombre accesible (${names.total})`, names.unnamed.length === 0, names.unnamed.length ? 'sin nombre: ' + names.unnamed.join(' | ') : names.total + ' controles'))
      // Monto vacío: el submit es inválido (no dispara PUT real) pero sigue verificando
      // que Enter envía el formulario.
      await page.fill('#edit-monto', '')
      await page.focus('#edit-monto')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(400)
      const submits = await page.evaluate(() => window.__submits)
      checks.push(CHECK('Enter en #edit-monto envía el formulario', submits === 1, 'submits=' + submits))
      await page.focus('#edit-fuente')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(400)
      const listbox = await page.locator('[data-slot=select-content]').count()
      checks.push(CHECK('Enter en #edit-fuente abre el listbox', listbox >= 1, 'select-content=' + listbox))
      checks.push(CHECK('Enter en #edit-fuente NO envía el form', (await page.evaluate(() => window.__submits)) === submits))
      await page.keyboard.press('Escape')
      const cancelType = await page.evaluate(() => {
        const b = Array.from(document.querySelectorAll('[data-slot=dialog-content] button')).find(x => (x.textContent || '').trim() === 'Cancelar')
        return b ? b.getAttribute('type') : null
      })
      checks.push(CHECK('botón Cancelar es type=button', cancelType === 'button', 'type=' + cancelType))
      const xType = await page.evaluate(() => {
        const b = document.querySelector('[data-slot=dialog-content] [data-slot=dialog-close]')
        return b ? b.getAttribute('type') : null
      })
      checks.push(CHECK('botón X de cierre es type=button', xType === 'button', 'type=' + xType))
      return checks
    },
  })

  // 3-6. Diálogos Fuente / Cuenta / Tasa / Generar split.
  const dialogCases = [
    { id: 'fuente', tab: null, button: 'Nueva fuente', scope: '[data-slot=dialog-content]', enterField: '#fuente-alias' },
    { id: 'cuenta', tab: 'Cuentas', button: 'Nueva cuenta', scope: '[data-slot=dialog-content]', enterField: '#cuenta-alias' },
    { id: 'tasa', tab: 'Cuentas', button: null, scope: '[data-slot=dialog-content]', enterField: null },
    { id: 'generar-split', tab: null, button: null, scope: '[data-slot=dialog-content]', enterField: '#modo' },
  ]
  for (const dc of dialogCases) {
    await runCase(browser, {
      ac: 'ac1', id: dc.id, theme: 'light',
      run: async (env) => {
        const { page } = env
        const checks = []
        if (dc.id === 'fuente') {
          await goto(page, '/configuracion', 1200)
          await page.getByRole('tab', { name: 'Fuentes' }).click()
          await page.waitForTimeout(400)
          await openDialogFromButton(env, 'Nueva fuente')
        } else if (dc.id === 'cuenta') {
          await goto(page, '/configuracion', 1200)
          await openDialogFromButton(env, 'Nueva cuenta')
        } else if (dc.id === 'tasa') {
          await goto(page, '/configuracion', 1200)
          await page.locator('button[aria-label^="Editar tasa de"]').first().click()
          await page.locator('[data-slot=dialog-content]').first().waitFor({ state: 'visible', timeout: 5000 })
          await page.waitForTimeout(300)
        } else {
          await goto(page, '/ingresos', 1200)
          await page.locator('button[aria-label="Generar split"]').first().click()
          await page.locator('[data-slot=dialog-content]').first().waitFor({ state: 'visible', timeout: 5000 })
          await page.waitForTimeout(300)
        }
        const names = await auditFormNames(page, '[data-slot=dialog-content]')
        checks.push(CHECK(`todos los controles del diálogo ${dc.id} tienen nombre accesible (${names.total})`, names.unnamed.length === 0, names.unnamed.length ? 'sin nombre: ' + names.unnamed.join(' | ') : names.total + ' controles'))
        if (dc.id === 'generar-split') {
          await page.focus('#modo')
          await page.keyboard.press('Enter')
          await page.waitForTimeout(400)
          const listbox = await page.locator('[data-slot=select-content]').count()
          checks.push(CHECK('Enter en #modo abre el listbox', listbox >= 1, 'select-content=' + listbox))
          const before = await page.evaluate(() => window.__submits)
          checks.push(CHECK('Enter en #modo NO envía el form', (await page.evaluate(() => window.__submits)) === before))
          await page.keyboard.press('Escape')
        } else if (dc.enterField) {
          await page.focus(dc.enterField)
          await page.keyboard.press('Enter')
          await page.waitForTimeout(400)
          const submits = await page.evaluate(() => window.__submits)
          checks.push(CHECK(`Enter en ${dc.enterField} envía el formulario`, submits === 1, 'submits=' + submits))
          const dlgOpen = await page.locator('[data-slot=dialog-content]').count()
          checks.push(CHECK('el diálogo permanece abierto tras submit inválido', dlgOpen >= 1))
        }
        if (dc.id === 'tasa') {
          const general = await page.evaluate(() => document.querySelector('button[aria-label^="Editar tasa de General"]') != null)
          checks.push(CHECK('cuenta General no tiene botón Editar tasa (histórica)', !general))
        }
        return checks
      },
    })
  }

  // 7. SplitsTab: 0 <form>, autoguardado con cambio mockeado.
  await runCase(browser, {
    ac: 'ac1', id: 'splits-tab', theme: 'light',
    run: async (env) => {
      const { page } = env
      await goto(page, '/configuracion', 1200)
      await page.getByRole('tab', { name: 'Splits' }).click()
      await page.waitForTimeout(600)
      const checks = []
      const formsInTab = await page.evaluate(() => document.querySelectorAll('[data-slot=tabs-content][data-state=active] form').length)
      const formsPage = await page.evaluate(() => document.querySelectorAll('form').length)
      checks.push(CHECK('SplitsTab no renderiza <form> (autoguardado)', formsInTab === 0 && formsPage === 0, `tabs-content=${formsInTab}, page=${formsPage}`))
      const names = await auditFormNames(page, '[data-slot=tabs-content][data-state=active]')
      checks.push(CHECK('todos los controles de SplitsTab tienen nombre accesible', names.unnamed.length === 0, names.unnamed.length ? 'sin nombre: ' + names.unnamed.join(' | ') : names.total + ' controles'))
      const errLive = await page.getAttribute('#split-modo-default-error', 'aria-live')
      checks.push(CHECK('#split-modo-default-error es región aria-live=polite', errLive === 'polite', 'aria-live=' + errLive))
      // PUT 200 y GET posterior (invalidateQueries) devolviendo lo guardado.
      let putCount = 0
      let guardado = null
      await page.route(API + '/settings/split', async route => {
        const m = route.request().method()
        if (m === 'PUT') {
          putCount++
          guardado = JSON.parse(route.request().postData() || '{}')
          return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'x-harness-mock': '1' }, body: JSON.stringify({ data: guardado }) })
        }
        if (m === 'GET' && guardado) {
          return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'x-harness-mock': '1' }, body: JSON.stringify({ data: guardado }) })
        }
        return route.fallback()
      })
      await pickSelect(page, '#split-modo-default', 'preciso (truncado al centavo)')
      await page.waitForTimeout(700)
      checks.push(CHECK('cambiar el modo dispara PUT /settings/split (autoguardado)', putCount === 1, 'PUTs=' + putCount))
      const value = await page.evaluate(() => document.querySelector('#split-modo-default')?.textContent?.trim())
      checks.push(CHECK('el select refleja el nuevo modo', /preciso/.test(value || ''), 'valor=' + value))
      return checks
    },
  })
}

/* ==========================================================================
 * AC2 — Validación de campos y estado de error
 * ========================================================================== */
async function ac2(browser) {
  await runCase(browser, {
    ac: 'ac2', id: 'registrar-invalido', theme: 'light', shot: 'ac2-registrar-invalido-m390-light',
    run: async (env) => {
      const { page } = env
      await goto(page, '/registrar')
      const checks = []
      await page.getByRole('button', { name: 'Guardar pago' }).click()
      await page.waitForTimeout(500)
      const diasErr = await page.locator('#registrar-dias-error').isVisible()
      const diasErrText = (await page.textContent('#registrar-dias-error') || '').trim()
      checks.push(CHECK('error inline de días visible tras submit vacío', diasErr && /día/i.test(diasErrText), diasErrText))
      const fset = await page.evaluate(() => {
        const f = document.getElementById('registrar-dias')
        return { invalid: f.getAttribute('aria-invalid'), desc: f.getAttribute('aria-describedby') || '' }
      })
      // M1: el fieldset del calendario lleva aria-invalid además de aria-describedby.
      checks.push(CHECK('#registrar-dias aria-invalid=true + aria-describedby → error', fset.invalid === 'true' && fset.desc.includes('registrar-dias-error'), JSON.stringify(fset)))
      const monto = await page.evaluate(() => {
        const el = document.getElementById('monto')
        return { invalid: el.getAttribute('aria-invalid'), desc: el.getAttribute('aria-describedby') || '' }
      })
      checks.push(CHECK('#monto aria-invalid + aria-describedby incluye monto-error', monto.invalid === 'true' && /monto-error/.test(monto.desc), JSON.stringify(monto)))
      const fuente = await page.evaluate(() => {
        const el = document.getElementById('fuente')
        return { invalid: el.getAttribute('aria-invalid'), desc: el.getAttribute('aria-describedby') || '' }
      })
      checks.push(CHECK('#fuente aria-invalid + aria-describedby incluye fuente-error', fuente.invalid === 'true' && /fuente-error/.test(fuente.desc), JSON.stringify(fuente)))
      // M1: el grupo #metodo tiene aria-invalid cableado a validacion.errores.metodo, pero
      // en /registrar un método siempre está seleccionado (Efectivo por defecto), así que
      // el estado de error NO es alcanzable por UI. Se comprueba que no marca falso
      // positivo; el estado alcanzable de la misma regla se cubre en «editar-metodo-invalido».
      const metodo = await page.evaluate(() => {
        const el = document.getElementById('metodo')
        return { invalid: el.getAttribute('aria-invalid'), desc: el.getAttribute('aria-describedby') }
      })
      checks.push(CHECK('#metodo sin aria-invalid con método seleccionado (estado inválido no alcanzable: Efectivo por defecto)', metodo.invalid !== 'true' && metodo.desc === null, JSON.stringify(metodo)))
      const summary = await page.evaluate(() => {
        const s = document.querySelector('form div[role=alert]')
        if (!s) return null
        return { title: (s.textContent || '').slice(0, 60), items: Array.from(s.querySelectorAll('button')).map(b => (b.textContent || '').trim()) }
      })
      checks.push(CHECK('ErrorSummary role=alert con ítems por campo inválido', !!summary && summary.items.length === 3, JSON.stringify(summary && summary.items)))
      checks.push(CHECK('título del resumen', !!summary && /Revisa los siguientes campos/i.test(summary.title), summary && summary.title))
      const focus = await activeDesc(page)
      checks.push(CHECK('el foco va al primer campo inválido (#registrar-dias)', focus && focus.id === 'registrar-dias', JSON.stringify(focus)))
      // Corrección en vivo: al escribir el monto el error desaparece.
      await page.fill('#monto', '265,00')
      await page.waitForTimeout(300)
      const monto2 = await page.evaluate(() => document.getElementById('monto').getAttribute('aria-invalid'))
      const summary2 = await page.evaluate(() => Array.from(document.querySelectorAll('form div[role=alert] button')).length)
      checks.push(CHECK('corregir el monto limpia su error en vivo', monto2 !== 'true' && summary2 === 2, 'aria-invalid=' + monto2 + ', ítems=' + summary2))
      // Revalidación en blur.
      await page.fill('#monto', 'abc')
      await page.locator('#notas').click()
      await page.waitForTimeout(300)
      const montoErrBlur = (await page.textContent('#monto-error') || '').trim()
      checks.push(CHECK('blur con monto inválido muestra el error', /monto/i.test(montoErrBlur), montoErrBlur))
      return checks
    },
  })
  // Variante dark para la captura.
  await runCase(browser, {
    ac: 'ac2', id: 'registrar-invalido-dark', theme: 'dark', shot: 'ac2-registrar-invalido-m390-dark',
    run: async (env) => {
      const { page } = env
      await goto(page, '/registrar')
      await page.getByRole('button', { name: 'Guardar pago' }).click()
      await page.waitForTimeout(500)
      return [CHECK('errores visibles en tema oscuro', await page.locator('#registrar-dias-error').isVisible() && await page.locator('form div[role=alert]').isVisible())]
    },
  })

  await runCase(browser, {
    ac: 'ac2', id: 'editar-invalido', theme: 'light', shot: 'ac2-editar-invalido-m390-light',
    run: async (env) => {
      const { page } = env
      await openEditarPago(env, false)
      const checks = []
      await page.fill('#edit-monto', '')
      // El blur que provoca el mousedown re-renderiza el footer (error inline) y el
      // primer click se pierde; desenfocar primero garantiza que el click envíe.
      await page.evaluate(() => document.getElementById('edit-monto').blur())
      await page.waitForTimeout(150)
      await page.getByRole('button', { name: 'Guardar cambios' }).click()
      await page.waitForTimeout(500)
      const montoErr = (await page.textContent('#edit-monto-error') || '').trim()
      checks.push(CHECK('error inline de monto visible en editar', /monto/i.test(montoErr), montoErr))
      const monto = await page.evaluate(() => {
        const el = document.getElementById('edit-monto')
        return { invalid: el.getAttribute('aria-invalid'), desc: el.getAttribute('aria-describedby') || '' }
      })
      checks.push(CHECK('#edit-monto aria-invalid + aria-describedby', monto.invalid === 'true' && /edit-monto-error/.test(monto.desc), JSON.stringify(monto)))
      const summaryItems = await page.evaluate(() => Array.from(document.querySelectorAll('[data-slot=dialog-content] div[role=alert] button')).map(b => (b.textContent || '').trim()))
      checks.push(CHECK('ErrorSummary en el diálogo con ítems', summaryItems.length >= 1, JSON.stringify(summaryItems)))
      const focus = await activeDesc(page)
      checks.push(CHECK('foco en el primer campo inválido (#edit-monto)', focus && focus.id === 'edit-monto', JSON.stringify(focus)))
      const dlgOpen = await page.locator('[data-slot=dialog-content]').count()
      checks.push(CHECK('el diálogo permanece abierto', dlgOpen >= 1))
      return checks
    },
  })

  // M1: estado de error de método alcanzable (el grupo #metodo de /registrar nunca
  // queda sin valor: Efectivo por defecto). Se usa un pago con método fuera del
  // catálogo vía GET mockeado; el PUT nunca se ejecuta (validación previa).
  await runCase(browser, {
    ac: 'ac2', id: 'editar-metodo-invalido', theme: 'light', shot: 'ac2-editar-metodo-invalido-m390-light',
    run: async (env) => {
      const { page } = env
      await page.route(API + '/pagos?*', route => {
        if (route.request().method() !== 'GET') return route.fallback()
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'x-harness-mock': '1' },
          body: JSON.stringify({ data: [MOCK_PAGO_METODO_INVALIDO], meta: { page: 1, page_size: 20, total: 1, total_pages: 1 } }),
        })
      })
      await openEditarPago(env, false)
      const checks = []
      // La validación no corre mientras fuentesLoading (fix de EditarPagoDialog).
      await page.waitForFunction(() => {
        const b = Array.from(document.querySelectorAll('[data-slot=dialog-content] button')).find(x => (x.textContent || '').trim() === 'Guardar cambios')
        return b && !b.disabled
      }, null, { timeout: 10000 })
      await page.waitForTimeout(300)
      await page.getByRole('button', { name: 'Guardar cambios' }).click()
      await page.waitForTimeout(500)
      const metodo = await page.evaluate(() => {
        const el = document.getElementById('edit-metodo')
        const err = document.getElementById('edit-metodo-error')
        return { invalid: el && el.getAttribute('aria-invalid'), desc: el && el.getAttribute('aria-describedby'), err: err ? (err.textContent || '').trim() : '' }
      })
      checks.push(CHECK('#edit-metodo aria-invalid=true + aria-describedby → edit-metodo-error', metodo.invalid === 'true' && /edit-metodo-error/.test(metodo.desc || ''), JSON.stringify(metodo)))
      checks.push(CHECK('error inline de método (Selecciona un método de pago)', /método de pago/i.test(metodo.err), metodo.err))
      const items = await page.evaluate(() => Array.from(document.querySelectorAll('[data-slot=dialog-content] div[role=alert] button')).map(b => (b.textContent || '').trim()))
      checks.push(CHECK('ErrorSummary incluye el error de método', items.some(t => /método de pago/i.test(t)), JSON.stringify(items)))
      checks.push(CHECK('el diálogo permanece abierto (sin PUT)', (await page.locator('[data-slot=dialog-content]').count()) >= 1))
      checks.push(CHECK('0 escrituras (PUT /pagos nunca se ejecuta)', env.st.unexpected.length === 0 && env.st.requests.length === 0, 'writes=' + env.st.requests.length + ', unexpected=' + env.st.unexpected.length))
      return checks
    },
  })

  await runCase(browser, {
    ac: 'ac2', id: 'editar-monto-split', theme: 'light',
    run: async (env) => {
      const { page } = env
      await openEditarPago(env, true)
      const checks = []
      const disabled = await page.evaluate(() => document.getElementById('edit-monto').disabled)
      checks.push(CHECK('#edit-monto deshabilitado cuando el pago tiene split', disabled === true))
      const alerta = await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll('[data-slot=dialog-content] [role=alert], [data-slot=dialog-content] [data-slot=alert]'))
        return el.map(e => (e.textContent || '').trim()).join(' ')
      })
      checks.push(CHECK('aviso visible: monto no editable con split', /split/i.test(alerta), alerta.slice(0, 120)))
      return checks
    },
  })

  await runCase(browser, {
    ac: 'ac2', id: 'fuente-invalido', theme: 'light', shot: 'ac2-fuente-invalido-m390-light',
    run: async (env) => {
      const { page } = env
      await goto(page, '/configuracion', 1200)
      await page.getByRole('tab', { name: 'Fuentes' }).click()
      await page.waitForTimeout(400)
      await openDialogFromButton(env, 'Nueva fuente')
      const checks = []
      await page.getByRole('button', { name: 'Crear fuente' }).click()
      await page.waitForTimeout(400)
      const aliasErr = (await page.textContent('#fuente-alias-error') || '').trim()
      checks.push(CHECK('error inline de alias visible', /alias/i.test(aliasErr), aliasErr))
      const alias = await page.evaluate(() => {
        const el = document.getElementById('fuente-alias')
        return { invalid: el.getAttribute('aria-invalid'), desc: el.getAttribute('aria-describedby') || '' }
      })
      checks.push(CHECK('#fuente-alias aria-invalid + aria-describedby', alias.invalid === 'true' && /fuente-alias-error/.test(alias.desc), JSON.stringify(alias)))
      const focus = await activeDesc(page)
      checks.push(CHECK('foco en #fuente-alias', focus && focus.id === 'fuente-alias', JSON.stringify(focus)))
      // Color inválido por hex.
      await page.fill('#fuente-alias', 'QA Fuente')
      await page.fill('#fuente-color-hex', 'zzz')
      await page.locator('#fuente-color').click()
      await page.waitForTimeout(300)
      const colorErr = (await page.textContent('#fuente-color-error') || '').trim()
      checks.push(CHECK('hex inválido muestra error de color', /color/i.test(colorErr), colorErr))
      // split_modo solo aparece con split_auto.
      const modoHiddenOff = await page.locator('#fuente-split-modo').count()
      await page.locator('#fuente-split-auto').click()
      await page.waitForTimeout(300)
      const modoVisible = await page.locator('#fuente-split-modo').isVisible()
      checks.push(CHECK('modo de split aparece al activar split automático', modoHiddenOff === 0 && modoVisible, `inicial=${modoHiddenOff}, tras toggle visible=${modoVisible}`))
      return checks
    },
  })

  await runCase(browser, {
    ac: 'ac2', id: 'cuenta-invalido', theme: 'light',
    run: async (env) => {
      const { page } = env
      await goto(page, '/configuracion', 1200)
      await openDialogFromButton(env, 'Nueva cuenta')
      const checks = []
      await page.getByRole('button', { name: 'Crear cuenta' }).click()
      await page.waitForTimeout(400)
      const aliasErr = (await page.textContent('#cuenta-alias-error') || '').trim()
      checks.push(CHECK('error inline de alias visible en cuenta', /alias/i.test(aliasErr), aliasErr))
      const focus = await activeDesc(page)
      checks.push(CHECK('foco en #cuenta-alias', focus && focus.id === 'cuenta-alias', JSON.stringify(focus)))
      return checks
    },
  })

  await runCase(browser, {
    ac: 'ac2', id: 'tasa-invalido', theme: 'light',
    run: async (env) => {
      const { page } = env
      await goto(page, '/configuracion', 1200)
      await page.locator('button[aria-label^="Editar tasa de"]').first().click()
      await page.locator('[data-slot=dialog-content]').first().waitFor({ state: 'visible', timeout: 5000 })
      const id = await page.evaluate(() => (document.querySelector('[data-slot=dialog-content] input[id^=tasa-]') || {}).id)
      const checks = []
      await page.locator('#' + id).fill('')
      await page.getByRole('button', { name: 'Guardar tasa' }).click()
      await page.waitForTimeout(400)
      const err = (await page.textContent('#' + id + '-error') || '').trim()
      checks.push(CHECK('error inline de tasa visible', /tasa/i.test(err), err))
      const aria = await page.evaluate((id) => {
        const el = document.getElementById(id)
        return { invalid: el.getAttribute('aria-invalid'), desc: el.getAttribute('aria-describedby') || '' }
      }, id)
      checks.push(CHECK('input tasa aria-invalid + aria-describedby', aria.invalid === 'true' && aria.desc.includes(id + '-error'), JSON.stringify(aria)))
      const focus = await activeDesc(page)
      checks.push(CHECK('foco en el input de tasa', focus && focus.id === id, JSON.stringify(focus)))
      return checks
    },
  })

  // Notas: límite 500 por teclado y >500 vía OCR (R2.8).
  await runCase(browser, {
    ac: 'ac2', id: 'notas-maxlength', theme: 'light',
    run: async (env) => {
      const { page } = env
      await goto(page, '/registrar')
      const checks = []
      await page.fill('#notas', 'x'.repeat(500))
      await page.waitForTimeout(200)
      const len = await page.evaluate(() => document.getElementById('notas').value.length)
      const counter = (await page.textContent('#notas-contador') || '').trim()
      checks.push(CHECK('maxLength=500 en #notas', len === 500, `len=${len}, contador=${counter}`))
      checks.push(CHECK('contador muestra 500/500', /500\s*\/\s*500/.test(counter), counter))
      await page.focus('#notas')
      await page.keyboard.press('End')
      await page.keyboard.type('y', { delay: 0 })
      await page.waitForTimeout(200)
      const len2 = await page.evaluate(() => document.getElementById('notas').value.length)
      checks.push(CHECK('teclado no supera 500 caracteres', len2 === 500, 'len=' + len2))
      const invalid = await page.evaluate(() => document.getElementById('notas').getAttribute('aria-invalid'))
      checks.push(CHECK('500 exactos no es error', invalid !== 'true', 'aria-invalid=' + invalid))
      return checks
    },
  })

  await runCase(browser, {
    ac: 'ac2', id: 'notas-ocr-mayor-500', theme: 'light', ocrText: OCR_TEXTO_LARGO, shot: 'ac2-registrar-notas-ocr-m390-light',
    run: async (env) => {
      const { page } = env
      await goto(page, '/registrar')
      const checks = []
      await page.fill('#notas', 'n'.repeat(450))
      await page.setInputFiles('form input[type=file]', { name: 'comprobante.png', mimeType: 'image/png', buffer: PNG_BUFFER })
      await page.getByRole('button', { name: 'Leer comprobante' }).click()
      await page.getByRole('button', { name: 'Ver fecha en el calendario' }).waitFor({ state: 'visible', timeout: 10000 })
      await page.waitForTimeout(500)
      const len = await page.evaluate(() => document.getElementById('notas').value.length)
      checks.push(CHECK('OCR deja notas >500 (sin pasar por maxLength)', len > 500, 'len=' + len))
      const counter = (await page.textContent('#notas-contador') || '').trim()
      checks.push(CHECK('contador refleja >500', /^\d{3,}\/500$/.test(counter) && parseInt(counter) > 500, counter))
      const aria = await page.evaluate(() => {
        const el = document.getElementById('notas')
        return { invalid: el.getAttribute('aria-invalid'), desc: el.getAttribute('aria-describedby') || '' }
      })
      checks.push(CHECK('#notas aria-invalid + aria-describedby incluye notas-error', aria.invalid === 'true' && /notas-error/.test(aria.desc), JSON.stringify(aria)))
      const notasErr = (await page.textContent('#notas-error') || '').trim()
      checks.push(CHECK('error inline de notas visible', /500|caracteres/i.test(notasErr), notasErr))
      // El envío queda bloqueado por el error.
      await mockWrite(env, { glob: API + '/pagos', method: 'POST', status: 200, body: MOCK_PAGO_200 })
      await mockWrite(env, { glob: API + '/pagos/*/comprobante', method: 'POST', status: 200, body: MOCK_COMPROBANTE_200 })
      await fillRegistrarValido(env)
      await page.getByRole('button', { name: 'Guardar pago' }).click()
      await page.waitForTimeout(700)
      const posts = writeCount(env, 'POST', /\/pagos$/)
      checks.push(CHECK('guardado bloqueado mientras notas >500', posts === 0, 'POSTs=' + posts))
      // Corregir y guardar: el error se limpia y el pago se crea.
      await page.fill('#notas', 'notas corregidas')
      await page.waitForTimeout(300)
      const invalid2 = await page.evaluate(() => document.getElementById('notas').getAttribute('aria-invalid'))
      checks.push(CHECK('corregir notas limpia el error', invalid2 !== 'true', 'aria-invalid=' + invalid2))
      await page.getByRole('button', { name: 'Guardar pago' }).click()
      await page.waitForTimeout(1200)
      const posts2 = writeCount(env, 'POST', /\/pagos$/)
      checks.push(CHECK('tras corregir, el pago se guarda', posts2 === 1, 'POSTs=' + posts2))
      checks.push(CHECK('navegación a /ingresos tras guardar', page.url().includes('/ingresos'), page.url()))
      return checks
    },
  })
}

/* ==========================================================================
 * AC3 — Errores de API sin toasts ni pérdida de datos
 * ========================================================================== */
async function ac3(browser) {
  const sinToast = async (env, checks) => {
    checks.push(CHECK('0 toasts de error (sonner)', await noErrorToasts(env.page)))
    checks.push(CHECK('0 unhandledrejection', env.page.evaluate(() => window.__unhandled).then(u => u.length === 0)))
    checks.push(CHECK('0 errores de consola', env.consoleMsgs.filter(m => !/favicon/i.test(m.text)).length === 0, JSON.stringify(env.consoleMsgs.slice(0, 3))))
    checks.push(CHECK('0 escrituras no mockeadas', env.st.unexpected.length === 0, JSON.stringify(env.st.unexpected)))
    return checks
  }

  // ---- Registrar: 400 campo / 409 global / 422 campo / 500 global ----
  const registrarErr = (id, status, body, campo) => ({
    ac: 'ac3', id: 'registrar-' + id, theme: 'light',
    run: async (env) => {
      const { page } = env
      await goto(page, '/registrar')
      await mockWrite(env, { glob: API + '/pagos', method: 'POST', status, body, delay: id === '400' ? 700 : 0 })
      const checks = []
      await fillRegistrarValido(env)
      const montoAntes = '265,00'
      await page.getByRole('button', { name: 'Guardar pago' }).click()
      if (id === '400') {
        // Durante el envío: aria-busy + submit deshabilitado + doble click = 1 POST.
        await page.waitForTimeout(300)
        const busy = await page.evaluate(() => document.querySelector('form[aria-labelledby=registrar-pago-titulo]').getAttribute('aria-busy'))
        const disabled = await page.getByRole('button', { name: 'Guardar pago' }).isDisabled()
        checks.push(CHECK('form aria-busy=true durante el envío', busy === 'true', 'aria-busy=' + busy))
        checks.push(CHECK('submit deshabilitado durante el envío', disabled))
        await page.getByRole('button', { name: 'Guardar pago' }).click({ force: true }).catch(() => {})
      }
      await page.waitForTimeout(1300)
      const posts = writeCount(env, 'POST', /\/pagos$/)
      checks.push(CHECK('exactamente 1 POST /pagos (sin doble envío)', posts === 1, 'POSTs=' + posts))
      if (campo === 'monto') {
        const err = (await page.textContent('#monto-error') || '').trim()
        checks.push(CHECK(`error ${status} mapeado al campo monto (inline)`, env.page.locator('#monto-error').isVisible() && err.length > 0, err))
        const invalid = await page.evaluate(() => document.getElementById('monto').getAttribute('aria-invalid'))
        checks.push(CHECK('#monto aria-invalid tras error de API', invalid === 'true'))
      } else {
        const global = (await page.evaluate(() => {
          const p = document.querySelector('form p[role=alert]')
          return p ? (p.textContent || '').trim() : null
        }))
        checks.push(CHECK(`error ${status} global en el resumen (p[role=alert])`, !!global && global.length > 0, String(global)))
      }
      const dlg = await page.locator('[data-slot=dialog-content], [data-slot=alert-dialog-content]').count()
      checks.push(CHECK('sin diálogos de confirmación espurios', dlg === 0, 'dialogs=' + dlg))
      const montoAhora = await page.inputValue('#monto')
      const fuenteAhora = await page.evaluate(() => (document.getElementById('fuente').textContent || '').trim())
      checks.push(CHECK('los datos del formulario persisten', montoAhora === montoAntes && fuenteAhora.length > 0, `monto=${montoAhora}, fuente=${fuenteAhora}`))
      checks.push(CHECK('no se navegó fuera de /registrar', page.url().includes('/registrar'), page.url()))
      return await sinToast(env, checks)
    },
  })
  // Mapeo real (web/src/lib/api-errors.ts): ERRORES_API_REGISTRAR no define
  // campos => 400/409/422/500 se muestran en el resumen del formulario.
  await runCase(browser, registrarErr('400', 400, ERR_400_CAMPO('monto', 'El monto debe ser mayor a cero (mock harness)'), null))
  await runCase(browser, registrarErr('409', 409, ERR_409('La fuente ya tiene un pago registrado hoy (mock harness)'), null))
  await runCase(browser, registrarErr('422', 422, ERR_422('monto', 'El monto no puede modificarse: el pago tiene split (mock harness)'), null))
  await runCase(browser, registrarErr('500', 500, ERR_500, null))

  // ---- Editar pago: 400/409/422/500 ----
  const editarErr = (id, status, body, campo) => ({
    ac: 'ac3', id: 'editar-' + id, theme: 'light', shot: id === '422' ? 'ac3-editar-422-m390-light' : undefined,
    run: async (env) => {
      const { page } = env
      await openEditarPago(env, false)
      await mockWrite(env, { glob: API + '/pagos/*', method: 'PUT', status, body })
      const checks = []
      await page.fill('#edit-monto', '300,00')
      await page.getByRole('button', { name: 'Guardar cambios' }).click()
      await page.waitForTimeout(900)
      const puts = writeCount(env, 'PUT', /\/pagos\/\d+$/)
      checks.push(CHECK('1 PUT /pagos/:id', puts === 1, 'PUTs=' + puts))
      if (campo === 'monto') {
        const err = (await page.textContent('#edit-monto-error') || '').trim()
        checks.push(CHECK(`error ${status} mapeado al campo monto (inline)`, await page.locator('#edit-monto-error').isVisible() && err.length > 0, err))
      } else {
        const global = await page.evaluate(() => {
          const p = document.querySelector('[data-slot=dialog-content] p[role=alert]')
          return p ? (p.textContent || '').trim() : null
        })
        checks.push(CHECK(`error ${status} global en el resumen del diálogo`, !!global && global.length > 0, String(global)))
      }
      const dlgOpen = await page.locator('[data-slot=dialog-content]').count()
      checks.push(CHECK('el diálogo permanece abierto tras el error', dlgOpen >= 1))
      const val = await page.inputValue('#edit-monto')
      checks.push(CHECK('los datos editados persisten', val === '300,00', 'monto=' + val))
      return await sinToast(env, checks)
    },
  })
  // ERRORES_API_EDITAR_PAGO solo mapea campoInmutable (422 → monto);
  // 400/409/500 se muestran en el resumen del diálogo.
  await runCase(browser, editarErr('400', 400, ERR_400_CAMPO('monto', 'Monto fuera de rango (mock harness)'), null))
  await runCase(browser, editarErr('409', 409, ERR_409('Conflicto de negocio al editar (mock harness)'), null))
  await runCase(browser, editarErr('422', 422, ERR_422('monto', 'El monto no puede modificarse: el pago tiene split (mock harness)'), 'monto'))
  await runCase(browser, editarErr('500', 500, ERR_500, null))

  // ---- Fuente: 400/409/500 (422 no aplica: sin campos inmutables) ----
  const fuenteErr = (id, status, body, campo) => ({
    ac: 'ac3', id: 'fuente-' + id, theme: 'light',
    run: async (env) => {
      const { page } = env
      await goto(page, '/configuracion', 1200)
      await page.getByRole('tab', { name: 'Fuentes' }).click()
      await page.waitForTimeout(400)
      await openDialogFromButton(env, 'Nueva fuente')
      await mockWrite(env, { glob: API + '/fuentes', method: 'POST', status, body })
      const checks = []
      await page.fill('#fuente-alias', 'QA Fuente')
      await page.getByRole('button', { name: 'Crear fuente' }).click()
      await page.waitForTimeout(900)
      const posts = writeCount(env, 'POST', /\/fuentes$/)
      checks.push(CHECK('1 POST /fuentes', posts === 1, 'POSTs=' + posts))
      if (campo === 'alias') {
        const err = (await page.textContent('#fuente-alias-error') || '').trim()
        checks.push(CHECK(`error ${status} mapeado al campo alias (inline)`, await page.locator('#fuente-alias-error').isVisible() && err.length > 0, err))
      } else {
        const global = await page.evaluate(() => {
          const p = document.querySelector('[data-slot=dialog-content] p[role=alert]')
          return p ? (p.textContent || '').trim() : null
        })
        checks.push(CHECK(`error ${status} global en el resumen del diálogo`, !!global && global.length > 0, String(global)))
      }
      const dlgOpen = await page.locator('[data-slot=dialog-content]').count()
      checks.push(CHECK('el diálogo permanece abierto', dlgOpen >= 1))
      const alias = await page.inputValue('#fuente-alias')
      checks.push(CHECK('el alias persiste', alias === 'QA Fuente', 'alias=' + alias))
      return await sinToast(env, checks)
    },
  })
  // ERRORES_API_FUENTE no define campos: 400/409/500 van al resumen del diálogo.
  await runCase(browser, fuenteErr('400', 400, ERR_400_CAMPO('alias', 'El alias ya existe (mock harness)'), null))
  await runCase(browser, fuenteErr('409', 409, ERR_409('Conflicto al crear la fuente (mock harness)'), null))
  await runCase(browser, fuenteErr('500', 500, ERR_500, null))

  // ---- Cuenta: 400/409/500 ----
  const cuentaErr = (id, status, body, campo) => ({
    ac: 'ac3', id: 'cuenta-' + id, theme: 'light',
    run: async (env) => {
      const { page } = env
      await goto(page, '/configuracion', 1200)
      await openDialogFromButton(env, 'Nueva cuenta')
      await mockWrite(env, { glob: API + '/cuentas', method: 'POST', status, body })
      const checks = []
      await page.fill('#cuenta-alias', 'QA Cuenta')
      await page.getByRole('button', { name: 'Crear cuenta' }).click()
      await page.waitForTimeout(900)
      const posts = writeCount(env, 'POST', /\/cuentas$/)
      checks.push(CHECK('1 POST /cuentas', posts === 1, 'POSTs=' + posts))
      if (campo === 'alias') {
        const err = (await page.textContent('#cuenta-alias-error') || '').trim()
        checks.push(CHECK(`error ${status} mapeado al campo alias (inline)`, await page.locator('#cuenta-alias-error').isVisible() && err.length > 0, err))
      } else {
        const global = await page.evaluate(() => {
          const p = document.querySelector('[data-slot=dialog-content] p[role=alert]')
          return p ? (p.textContent || '').trim() : null
        })
        checks.push(CHECK(`error ${status} global en el resumen del diálogo`, !!global && global.length > 0, String(global)))
      }
      const dlgOpen = await page.locator('[data-slot=dialog-content]').count()
      checks.push(CHECK('el diálogo permanece abierto', dlgOpen >= 1))
      const alias = await page.inputValue('#cuenta-alias')
      checks.push(CHECK('el alias persiste', alias === 'QA Cuenta', 'alias=' + alias))
      return await sinToast(env, checks)
    },
  })
  await runCase(browser, cuentaErr('400', 400, ERR_400_CAMPO('alias', 'El alias ya existe (mock harness)'), 'alias'))
  await runCase(browser, cuentaErr('409', 409, ERR_409('Conflicto al crear la cuenta (mock harness)'), null))
  await runCase(browser, cuentaErr('500', 500, ERR_500, null))

  // ---- Tasa: 400/409/500 ----
  const tasaErr = (id, status, body) => ({
    ac: 'ac3', id: 'tasa-' + id, theme: 'light', shot: id === '409' ? 'ac3-tasa-409-m390-light' : undefined,
    run: async (env) => {
      const { page } = env
      await goto(page, '/configuracion', 1200)
      await page.locator('button[aria-label^="Editar tasa de"]').first().click()
      await page.locator('[data-slot=dialog-content]').first().waitFor({ state: 'visible', timeout: 5000 })
      await page.waitForTimeout(300)
      const inputId = await page.evaluate(() => (document.querySelector('[data-slot=dialog-content] input[id^=tasa-]') || {}).id)
      await mockWrite(env, { glob: API + '/cuentas/*/tasa', method: 'PUT', status, body })
      const checks = []
      await page.locator('#' + inputId).fill('25')
      await page.getByRole('button', { name: 'Guardar tasa' }).click()
      await page.waitForTimeout(900)
      const puts = writeCount(env, 'PUT', /\/cuentas\/\d+\/tasa$/)
      checks.push(CHECK('1 PUT /cuentas/:id/tasa', puts === 1, 'PUTs=' + puts))
      const err = await page.evaluate((id) => {
        const el = document.getElementById(id + '-error')
        return el ? (el.textContent || '').trim() : ''
      }, inputId)
      const global = await page.evaluate(() => {
        const p = document.querySelector('[data-slot=dialog-content] p[role=alert]')
        return p ? (p.textContent || '').trim() : null
      })
      const hasError = (err && err.length > 0) || (global && global.length > 0)
      checks.push(CHECK(`error ${status} visible (campo o resumen)`, hasError, `inline=${err} | global=${global}`))
      const dlgOpen = await page.locator('[data-slot=dialog-content]').count()
      checks.push(CHECK('el diálogo permanece abierto', dlgOpen >= 1))
      const val = await page.inputValue('#' + inputId)
      checks.push(CHECK('la tasa editada persiste', val === '25', 'tasa=' + val))
      return await sinToast(env, checks)
    },
  })
  await runCase(browser, tasaErr('400', 400, ERR_400_CAMPO('tasa', 'Tasa fuera de rango (mock harness)')))
  await runCase(browser, tasaErr('409', 409, ERR_409('La suma de tasas supera 100% (mock harness)', 'tasa')))
  await runCase(browser, tasaErr('500', 500, ERR_500))

  // ---- Generar split: 400/409/500 ----
  const splitErr = (id, status, body) => ({
    ac: 'ac3', id: 'generar-split-' + id, theme: 'light', shot: id === '500' ? 'ac3-split-500-m390-light' : undefined,
    run: async (env) => {
      const { page } = env
      await goto(page, '/ingresos', 1200)
      await page.locator('button[aria-label="Generar split"]').first().click()
      await page.locator('[data-slot=dialog-content]').first().waitFor({ state: 'visible', timeout: 5000 })
      await page.waitForTimeout(300)
      await mockWrite(env, { glob: API + '/splits', method: 'POST', status, body })
      const checks = []
      await page.locator('[data-slot=dialog-content]').getByRole('button', { name: 'Generar split' }).click()
      await page.waitForTimeout(900)
      const posts = writeCount(env, 'POST', /\/splits$/)
      checks.push(CHECK('1 POST /splits', posts === 1, 'POSTs=' + posts))
      const global = await page.evaluate(() => {
        const p = document.querySelector('[data-slot=dialog-content] p[role=alert]')
        return p ? (p.textContent || '').trim() : null
      })
      const err = await page.evaluate(() => {
        const el = document.getElementById('modo-error')
        return el ? (el.textContent || '').trim() : ''
      })
      checks.push(CHECK(`error ${status} visible (campo o resumen)`, (global && global.length > 0) || (err && err.length > 0), `inline=${err} | global=${global}`))
      const dlgOpen = await page.locator('[data-slot=dialog-content]').count()
      checks.push(CHECK('el diálogo permanece abierto', dlgOpen >= 1))
      return await sinToast(env, checks)
    },
  })
  await runCase(browser, splitErr('400', 400, ERR_400_CAMPO('modo', 'Modo inválido (mock harness)')))
  await runCase(browser, splitErr('409', 409, ERR_409('El pago ya tiene un split (mock harness)')))
  await runCase(browser, splitErr('500', 500, ERR_500))

  // ---- SplitsTab autoguardado: 400/409/500 → revert + error live ----
  const settingsErr = (id, status, body) => ({
    ac: 'ac3', id: 'splits-tab-' + id, theme: 'light', shot: id === '409' ? 'ac3-splits-tab-409-m390-light' : undefined,
    run: async (env) => {
      const { page } = env
      await goto(page, '/configuracion', 1200)
      await page.getByRole('tab', { name: 'Splits' }).click()
      await page.waitForTimeout(600)
      await mockWrite(env, { glob: API + '/settings/split', method: 'PUT', status, body, delay: 500 })
      const checks = []
      const antes = await page.evaluate(() => (document.getElementById('split-modo-default').textContent || '').trim())
      await pickSelect(page, '#split-modo-default', 'preciso (truncado al centavo)')
      // Durante el envío el select queda deshabilitado.
      await page.waitForTimeout(250)
      const disabledDuring = await page.evaluate(() => {
        const el = document.getElementById('split-modo-default')
        return el.disabled || el.getAttribute('data-disabled') === 'true' || el.getAttribute('aria-disabled') === 'true'
      })
      checks.push(CHECK('select deshabilitado mientras guarda', disabledDuring === true))
      await page.waitForTimeout(900)
      const puts = writeCount(env, 'PUT', /settings\/split$/)
      checks.push(CHECK('1 PUT /settings/split', puts === 1, 'PUTs=' + puts))
      const despues = await page.evaluate(() => (document.getElementById('split-modo-default').textContent || '').trim())
      checks.push(CHECK('el valor revierte al valor válido tras el error', despues === antes, `antes=${antes} | después=${despues}`))
      const errEl = await page.evaluate(() => {
        const el = document.getElementById('split-modo-default-error')
        const cs = getComputedStyle(el)
        return { text: (el.textContent || '').trim(), srOnly: cs.display === 'none' || /sr-only/.test(el.className) }
      })
      checks.push(CHECK('error inline visible con aria-live=polite', errEl.text.length > 0 && !errEl.srOnly, JSON.stringify(errEl)))
      return await sinToast(env, checks)
    },
  })
  await runCase(browser, settingsErr('400', 400, ERR_400_CAMPO('modo_default', 'Modo inválido (mock harness)')))
  await runCase(browser, settingsErr('409', 409, ERR_409('Conflicto al guardar el modo (mock harness)')))
  await runCase(browser, settingsErr('500', 500, ERR_500))
}

/* ==========================================================================
 * AC4 — Guardia de descarte
 * ========================================================================== */
async function ac4(browser) {
  // Navegación SPA con formulario sucio (Registrar).
  await runCase(browser, {
    ac: 'ac4', id: 'registrar-nav', theme: 'light', shot: 'ac4-confirm-registrar-m390-light',
    run: async (env) => {
      const { page } = env
      await goto(page, '/registrar')
      const checks = []
      await page.fill('#monto', '100,00')
      await page.waitForTimeout(300)
      await page.evaluate(() => document.querySelector('a[href="/ingresos"]').click())
      await page.locator('[data-slot=alert-dialog-content]').waitFor({ state: 'visible', timeout: 5000 })
      checks.push(CHECK('navegación con cambios muestra ConfirmarDescarte', true))
      const title = (await page.textContent('[data-slot=alert-dialog-title]') || '').trim()
      checks.push(CHECK('título ¿Descartar cambios?', /Descartar cambios/i.test(title), title))
      const focus = await activeDesc(page)
      checks.push(CHECK('foco inicial en "Seguir editando"', focus && focus.text === 'Seguir editando', JSON.stringify(focus)))
      const urlStill = page.url()
      checks.push(CHECK('no se navegó (bloqueado)', urlStill.includes('/registrar'), urlStill))
      await page.getByRole('button', { name: 'Seguir editando' }).click()
      await page.waitForTimeout(500)
      const dlgClosed = (await page.locator('[data-slot=alert-dialog-content]').count()) === 0
      const monto = await page.inputValue('#monto')
      checks.push(CHECK('"Seguir editando" conserva los cambios', dlgClosed && monto === '100,00' && page.url().includes('/registrar'), `dialog closed=${dlgClosed}, monto=${monto}`))
      // Segundo intento: descartar.
      await page.evaluate(() => document.querySelector('a[href="/ingresos"]').click())
      await page.locator('[data-slot=alert-dialog-content]').waitFor({ state: 'visible', timeout: 5000 })
      await mockWrite(env, { glob: API + '/pagos', method: 'POST', status: 200, body: MOCK_PAGO_200 })
      await page.getByRole('button', { name: 'Descartar cambios' }).click()
      await page.waitForTimeout(900)
      checks.push(CHECK('"Descartar cambios" navega a /ingresos', page.url().includes('/ingresos'), page.url()))
      const posts = writeCount(env, 'POST', /\/pagos$/)
      checks.push(CHECK('descartar NO guarda el pago', posts === 0, 'POSTs=' + posts))
      return checks
    },
  })

  // Formulario limpio: la navegación no se bloquea.
  await runCase(browser, {
    ac: 'ac4', id: 'registrar-limpio', theme: 'light',
    run: async (env) => {
      const { page } = env
      await goto(page, '/registrar')
      const checks = []
      await page.evaluate(() => document.querySelector('a[href="/ingresos"]').click())
      await page.waitForTimeout(700)
      const dlg = await page.locator('[data-slot=alert-dialog-content]').count()
      checks.push(CHECK('sin cambios no aparece ConfirmarDescarte', dlg === 0, 'dialogs=' + dlg))
      checks.push(CHECK('navegación inmediata', page.url().includes('/ingresos'), page.url()))
      return checks
    },
  })

  // Tras guardar, la navegación no se bloquea (puedeGuardar).
  await runCase(browser, {
    ac: 'ac4', id: 'registrar-tras-guardar', theme: 'light',
    run: async (env) => {
      const { page } = env
      await goto(page, '/registrar')
      await mockWrite(env, { glob: API + '/pagos', method: 'POST', status: 200, body: MOCK_PAGO_200 })
      const checks = []
      await fillRegistrarValido(env)
      await page.getByRole('button', { name: 'Guardar pago' }).click()
      await page.waitForTimeout(1300)
      checks.push(CHECK('guardado exitoso navega a /ingresos', page.url().includes('/ingresos'), page.url()))
      const posts = writeCount(env, 'POST', /\/pagos$/)
      checks.push(CHECK('1 POST /pagos', posts === 1, 'POSTs=' + posts))
      const dlg = await page.locator('[data-slot=alert-dialog-content]').count()
      checks.push(CHECK('sin confirmación de descarte tras guardar', dlg === 0))
      return checks
    },
  })

  // Cierre del diálogo Editar con cambios (X y Cancelar).
  await runCase(browser, {
    ac: 'ac4', id: 'editar-close', theme: 'dark', shot: 'ac4-confirm-editar-m390-dark',
    run: async (env) => {
      const { page } = env
      await openEditarPago(env, false)
      const checks = []
      await page.fill('#edit-monto', '300,00')
      await page.waitForTimeout(300)
      await page.locator('[data-slot=dialog-close]').first().click()
      await page.locator('[data-slot=alert-dialog-content]').waitFor({ state: 'visible', timeout: 5000 })
      checks.push(CHECK('cerrar con X y cambios muestra ConfirmarDescarte', true))
      const editStill = await page.locator('[data-slot=dialog-content]').count()
      checks.push(CHECK('el diálogo de edición sigue abierto', editStill >= 1))
      await page.getByRole('button', { name: 'Seguir editando' }).click()
      await page.waitForTimeout(400)
      const monto = await page.inputValue('#edit-monto')
      checks.push(CHECK('"Seguir editando" conserva los cambios', monto === '300,00' && (await page.locator('[data-slot=dialog-content]').count()) >= 1, 'monto=' + monto))
      // Cancelar también confirma.
      await page.getByRole('button', { name: 'Cancelar' }).click()
      await page.locator('[data-slot=alert-dialog-content]').waitFor({ state: 'visible', timeout: 5000 })
      await page.getByRole('button', { name: 'Descartar cambios' }).click()
      await page.waitForTimeout(700)
      const editClosed = (await page.locator('[data-slot=dialog-content]').count()) === 0
      const confirmClosed = (await page.locator('[data-slot=alert-dialog-content]').count()) === 0
      checks.push(CHECK('"Descartar cambios" cierra el diálogo', editClosed && confirmClosed))
      const puts = writeCount(env, 'PUT', /\/pagos\/\d+$/)
      checks.push(CHECK('descartar NO guarda (0 PUT)', puts === 0, 'PUTs=' + puts))
      return checks
    },
  })

  // Escape en el diálogo Editar con cambios.
  await runCase(browser, {
    ac: 'ac4', id: 'editar-escape', theme: 'light',
    run: async (env) => {
      const { page } = env
      await openEditarPago(env, false)
      const checks = []
      await page.fill('#edit-monto', '300,00')
      await page.waitForTimeout(200)
      await page.keyboard.press('Escape')
      await page.locator('[data-slot=alert-dialog-content]').waitFor({ state: 'visible', timeout: 5000 })
      checks.push(CHECK('Escape con cambios muestra ConfirmarDescarte', true))
      // Escape sobre la confirmación = acción segura (seguir editando).
      await page.waitForTimeout(300)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
      const confirmClosed = (await page.locator('[data-slot=alert-dialog-content]').count()) === 0
      const editStill = await page.locator('[data-slot=dialog-content]').count()
      const monto = await page.inputValue('#edit-monto')
      checks.push(CHECK('Escape en la confirmación = seguir editando', confirmClosed && editStill >= 1 && monto === '300,00', `confirm closed=${confirmClosed}, edit open=${editStill >= 1}, monto=${monto}`))
      return checks
    },
  })

  // Navegación SPA con el diálogo Editar abierto y sucio (clic programático).
  await runCase(browser, {
    ac: 'ac4', id: 'editar-nav', theme: 'light',
    run: async (env) => {
      const { page } = env
      await openEditarPago(env, false)
      const checks = []
      await page.fill('#edit-monto', '300,00')
      await page.waitForTimeout(200)
      await page.evaluate(() => document.querySelector('a[href="/splits"]').click())
      await page.locator('[data-slot=alert-dialog-content]').waitFor({ state: 'visible', timeout: 5000 })
      checks.push(CHECK('navegación SPA con diálogo abierto y sucio muestra confirmación', true))
      await page.getByRole('button', { name: 'Descartar cambios' }).click()
      await page.waitForTimeout(900)
      checks.push(CHECK('descartar navega a /splits', page.url().includes('/splits'), page.url()))
      return checks
    },
  })

  // OCR deja el formulario sucio → la guardia también aplica (R4.7).
  await runCase(browser, {
    ac: 'ac4', id: 'registrar-ocr-sucio', theme: 'light', ocrText: OCR_TEXTO,
    run: async (env) => {
      const { page } = env
      await goto(page, '/registrar')
      const checks = []
      await page.setInputFiles('form input[type=file]', { name: 'comprobante.png', mimeType: 'image/png', buffer: PNG_BUFFER })
      await page.getByRole('button', { name: 'Leer comprobante' }).click()
      await page.getByRole('button', { name: 'Ver fecha en el calendario' }).waitFor({ state: 'visible', timeout: 10000 })
      await page.waitForTimeout(300)
      const monto = await page.inputValue('#monto')
      checks.push(CHECK('OCR autocompleta el monto', monto === '265,00', 'monto=' + monto))
      await page.evaluate(() => document.querySelector('a[href="/ingresos"]').click())
      await page.locator('[data-slot=alert-dialog-content]').waitFor({ state: 'visible', timeout: 5000 })
      checks.push(CHECK('datos autocompletados por OCR también disparan la guardia', true))
      await page.getByRole('button', { name: 'Seguir editando' }).click()
      await page.waitForTimeout(400)
      checks.push(CHECK('seguir editando conserva el formulario', page.url().includes('/registrar') && (await page.inputValue('#monto')) === '265,00'))
      return checks
    },
  })
}

/* ==========================================================================
 * AC5 — Reglas de subida de archivos
 * ========================================================================== */
async function ac5(browser) {
  // PDF (tipo no permitido) en comprobante.
  await runCase(browser, {
    ac: 'ac5', id: 'comprobante-pdf', theme: 'light',
    run: async (env) => {
      const { page } = env
      await goto(page, '/registrar')
      const checks = []
      await page.setInputFiles('form input[type=file]', { name: 'doc.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fake') })
      await page.waitForTimeout(400)
      const err = (await page.textContent('#comprobante-error') || '').trim()
      checks.push(CHECK('PDF rechazado con error inline', await page.locator('#comprobante-error').isVisible() && /imagen|PNG|JPG|WEBP/i.test(err), err))
      const writes = env.st.requests.length + env.st.unexpected.length
      checks.push(CHECK('0 requests de subida', writes === 0, 'writes=' + writes))
      const progress = await page.locator('[role=progressbar]').count()
      checks.push(CHECK('sin barra de progreso', progress === 0))
      return checks
    },
  })

  // 11MB (peso excedido) en comprobante.
  await runCase(browser, {
    ac: 'ac5', id: 'comprobante-11mb', theme: 'light', shot: 'ac5-comprobante-11mb-m390-light',
    run: async (env) => {
      const { page } = env
      await goto(page, '/registrar')
      const checks = []
      await page.setInputFiles('form input[type=file]', { name: 'grande.png', mimeType: 'image/png', buffer: MB11 })
      await page.waitForTimeout(400)
      const err = (await page.textContent('#comprobante-error') || '').trim()
      checks.push(CHECK('11MB rechazado con error inline', await page.locator('#comprobante-error').isVisible() && /MB|peso|tama/i.test(err), err))
      const writes = env.st.requests.length + env.st.unexpected.length
      checks.push(CHECK('0 requests de subida', writes === 0, 'writes=' + writes))
      return checks
    },
  })

  // Drag & drop aplica las mismas reglas (R5.3).
  await runCase(browser, {
    ac: 'ac5', id: 'comprobante-drop-11mb', theme: 'light',
    run: async (env) => {
      const { page } = env
      await goto(page, '/registrar')
      const checks = []
      const dropRes = await page.evaluate(() => {
        const dropzone = document.querySelector('form button[class*="border-dashed"]')
        if (!dropzone) return { error: 'dropzone no encontrado' }
        const file = new File([new Uint8Array(11 * 1024 * 1024).fill(1)], 'grande.png', { type: 'image/png' })
        const dt = new DataTransfer()
        dt.items.add(file)
        dropzone.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }))
        return { ok: true }
      })
      await page.waitForTimeout(500)
      const err = (await page.textContent('#comprobante-error') || '').trim()
      checks.push(CHECK('drop de 11MB rechazado con error inline', dropRes.ok && await page.locator('#comprobante-error').isVisible() && err.length > 0, `drop=${JSON.stringify(dropRes)} err=${err}`))
      const writes = env.st.requests.length + env.st.unexpected.length
      checks.push(CHECK('0 requests de subida por drop', writes === 0, 'writes=' + writes))
      return checks
    },
  })

  // Archivo válido: nombre+tamaño visibles solo en comprobante; OCR con progreso anunciado.
  await runCase(browser, {
    ac: 'ac5', id: 'comprobante-valido-ocr', theme: 'light', ocrText: OCR_TEXTO, ocrDelay: 1400,
    run: async (env) => {
      const { page } = env
      await goto(page, '/registrar')
      const checks = []
      await page.setInputFiles('form input[type=file]', { name: 'comprobante.png', mimeType: 'image/png', buffer: PNG_BUFFER })
      await page.waitForTimeout(400)
      const body = await page.evaluate(() => (document.querySelector('form').textContent || ''))
      checks.push(CHECK('nombre del archivo visible (comprobante)', /comprobante\.png/.test(body)))
      checks.push(CHECK('tamaño visible en KB (comprobante)', /\d+\s*KB/.test(body)))
      const errVisible = await page.locator('#comprobante-error').isVisible()
      checks.push(CHECK('sin error con archivo válido', !errVisible))
      await page.getByRole('button', { name: 'Leer comprobante' }).click()
      const progress = await page.locator('[role=progressbar][aria-label*="comprobante"]').first()
      let progressSeen = false
      let progressLabel = null
      for (let i = 0; i < 20; i++) {
        if (await progress.isVisible().catch(() => false)) {
          progressSeen = true
          progressLabel = await progress.getAttribute('aria-label')
          break
        }
        await page.waitForTimeout(100)
      }
      checks.push(CHECK('barra de progreso visible durante la lectura', progressSeen))
      checks.push(CHECK('progressbar con aria-label descriptivo', !!progressLabel && /comprobante/i.test(progressLabel), String(progressLabel)))
      const liveText = await page.evaluate(() => {
        const el = document.querySelector('p[aria-live=polite]')
        return el ? (el.textContent || '').trim() : null
      })
      await page.getByRole('button', { name: 'Ver fecha en el calendario' }).waitFor({ state: 'visible', timeout: 15000 })
      await page.waitForTimeout(400)
      const liveAfter = await page.evaluate(() => {
        const el = document.querySelector('p[aria-live=polite]')
        return el ? (el.textContent || '').trim() : null
      })
      checks.push(CHECK('estado de OCR anunciado en región aria-live=polite', (liveText && /leyendo/i.test(liveText)) || (liveAfter && /leído/i.test(liveAfter)), `durante=${liveText} | después=${liveAfter}`))
      const monto = await page.inputValue('#monto')
      checks.push(CHECK('OCR autocompleta monto (265,00)', monto === '265,00', 'monto=' + monto))
      const notas = await page.inputValue('#notas')
      checks.push(CHECK('OCR autocompleta notas con referencia', /1234567890/.test(notas), notas.slice(0, 60)))
      return checks
    },
  })

  // Pago 200 + comprobante 400: solo el upload se reintenta (D16).
  await runCase(browser, {
    ac: 'ac5', id: 'pago-200-comprobante-400', theme: 'light', ocrText: OCR_TEXTO, shot: 'ac5-comprobante-reintentar-m390-light',
    run: async (env) => {
      const { page } = env
      await goto(page, '/registrar')
      await mockWrite(env, { glob: API + '/pagos', method: 'POST', status: 200, body: MOCK_PAGO_200 })
      await mockWrite(env, { glob: API + '/pagos/*/comprobante', method: 'POST', status: 400, body: ERR_400_CAMPO('imagen', 'La imagen del comprobante no es válida (mock harness)') })
      const checks = []
      await page.setInputFiles('form input[type=file]', { name: 'comprobante.png', mimeType: 'image/png', buffer: PNG_BUFFER })
      await page.getByRole('button', { name: 'Leer comprobante' }).click()
      await page.getByRole('button', { name: 'Ver fecha en el calendario' }).waitFor({ state: 'visible', timeout: 10000 })
      await page.fill('#notas', '')
      await fillRegistrarValido(env)
      await page.getByRole('button', { name: 'Guardar pago' }).click()
      await page.getByRole('button', { name: 'Reintentar comprobante' }).waitFor({ state: 'visible', timeout: 15000 })
      await page.waitForTimeout(300)
      const posts = writeCount(env, 'POST', /\/pagos$/)
      checks.push(CHECK('exactamente 1 POST /pagos (no se re-crea el pago)', posts === 1, 'POSTs=' + posts))
      const uploads = writeCount(env, 'POST', /\/comprobante$/)
      checks.push(CHECK('1 intento de comprobante', uploads === 1, 'uploads=' + uploads))
      const err = (await page.textContent('#comprobante-error') || '').trim()
      checks.push(CHECK('error de comprobante inline visible', await page.locator('#comprobante-error').isVisible() && err.length > 0, err))
      checks.push(CHECK('botón "Reintentar comprobante" visible', true))
      const irA = await page.getByRole('button', { name: 'Ir a ingresos' }).isVisible()
      checks.push(CHECK('botón "Ir a ingresos" visible', irA))
      checks.push(CHECK('sigue en /registrar (pago ya guardado)', page.url().includes('/registrar'), page.url()))
      const dlg = await page.locator('[data-slot=alert-dialog-content]').count()
      checks.push(CHECK('sin confirmación de descarte al reintentar upload', dlg === 0))
      // "Ir a ingresos" no bloquea (guardadoRef).
      await page.getByRole('button', { name: 'Ir a ingresos' }).click()
      await page.waitForTimeout(700)
      checks.push(CHECK('"Ir a ingresos" navega sin bloqueo', page.url().includes('/ingresos'), page.url()))
      const posts2 = writeCount(env, 'POST', /\/pagos$/)
      checks.push(CHECK('no se creó un segundo pago', posts2 === 1, 'POSTs=' + posts2))
      return checks
    },
  })

  // Reintentar comprobante: solo el upload (mock 200 la segunda vez).
  await runCase(browser, {
    ac: 'ac5', id: 'reintentar-comprobante', theme: 'light', ocrText: OCR_TEXTO,
    run: async (env) => {
      const { page } = env
      await goto(page, '/registrar')
      let calls = 0
      await page.route(API + '/pagos', async route => {
        if (route.request().method() !== 'POST') return route.fallback()
        const u = new URL(route.request().url())
        env.st.requests.push({ method: 'POST', path: u.pathname })
        return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'x-harness-mock': '1' }, body: JSON.stringify(MOCK_PAGO_200) })
      })
      await page.route(API + '/pagos/*/comprobante', async route => {
        if (route.request().method() !== 'POST') return route.fallback()
        const u = new URL(route.request().url())
        env.st.requests.push({ method: 'POST', path: u.pathname })
        calls++
        // El 400 simulado del 1er intento es un mock deliberado: marcarlo para
        // que el filtro de consola lo clasifique como mockedNetwork.
        if (calls === 1) {
          env.st.mockedFail.push(u.href)
          env.st.mockedFailStatuses.add('400')
        }
        return route.fulfill({
          status: calls === 1 ? 400 : 200,
          contentType: 'application/json',
          headers: { 'x-harness-mock': '1' },
          body: JSON.stringify(calls === 1 ? ERR_400_CAMPO('imagen', 'Imagen inválida (mock 1er intento)') : MOCK_COMPROBANTE_200),
        })
      })
      const checks = []
      await page.setInputFiles('form input[type=file]', { name: 'comprobante.png', mimeType: 'image/png', buffer: PNG_BUFFER })
      await page.getByRole('button', { name: 'Leer comprobante' }).click()
      await page.getByRole('button', { name: 'Ver fecha en el calendario' }).waitFor({ state: 'visible', timeout: 10000 })
      await fillRegistrarValido(env)
      await page.getByRole('button', { name: 'Guardar pago' }).click()
      await page.getByRole('button', { name: 'Reintentar comprobante' }).waitFor({ state: 'visible', timeout: 15000 })
      await page.getByRole('button', { name: 'Reintentar comprobante' }).click()
      await page.waitForTimeout(1500)
      const posts = writeCount(env, 'POST', /\/pagos$/)
      const uploads = writeCount(env, 'POST', /\/comprobante$/)
      checks.push(CHECK('reintentar solo sube el comprobante (1 POST /pagos)', posts === 1, 'POSTs=' + posts))
      checks.push(CHECK('2 uploads de comprobante (fallo + reintento)', uploads === 2, 'uploads=' + uploads))
      checks.push(CHECK('tras reintento exitoso navega a /ingresos', page.url().includes('/ingresos'), page.url()))
      return checks
    },
  })

  // Logo: PDF/11MB rechazados; válido sube con mock; sin nombre/tamaño.
  await runCase(browser, {
    ac: 'ac5', id: 'logo-invalidos', theme: 'light',
    run: async (env) => {
      const { page } = env
      await goto(page, '/configuracion', 1200)
      await page.getByRole('tab', { name: 'Fuentes' }).click()
      await page.waitForTimeout(600)
      const checks = []
      const logoInput = 'button[aria-label^="Subir logo de"] >> xpath=ancestor::div[2]/preceding-sibling::input[1]'
      await page.locator(logoInput).first().setInputFiles({ name: 'logo.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fake') })
      await page.waitForTimeout(400)
      const errPdf = await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll('[id^=logo-error-]')).find(e => (e.textContent || '').trim().length > 0)
        return el ? { id: el.id, text: (el.textContent || '').trim() } : null
      })
      checks.push(CHECK('logo PDF rechazado con error inline', !!errPdf && /imagen|PNG|JPG|WEBP/i.test(errPdf.text), JSON.stringify(errPdf)))
      await page.locator(logoInput).first().setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: MB11 })
      await page.waitForTimeout(400)
      const errMb = await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll('[id^=logo-error-]')).find(e => (e.textContent || '').trim().length > 0)
        return el ? (el.textContent || '').trim() : ''
      })
      checks.push(CHECK('logo 11MB rechazado con error inline', /MB|peso|tama/i.test(errMb), errMb))
      const writes = env.st.requests.length + env.st.unexpected.length
      checks.push(CHECK('0 requests de subida de logo', writes === 0, 'writes=' + writes))
      const text = await page.evaluate(() => document.body.textContent || '')
      checks.push(CHECK('logo no muestra nombre/tamaño del archivo', !/logo\.pdf|logo\.png/.test(text)))
      return checks
    },
  })

  await runCase(browser, {
    ac: 'ac5', id: 'logo-qr-validos', theme: 'light',
    run: async (env) => {
      const { page } = env
      await goto(page, '/configuracion', 1200)
      await page.getByRole('tab', { name: 'Fuentes' }).click()
      await page.waitForTimeout(600)
      await mockWrite(env, { glob: API + '/fuentes/*/logo', method: 'POST', status: 200, body: { data: { id: 1, logo_ruta: '/uploads/logo.png' } } })
      const logoInput = 'button[aria-label^="Subir logo de"] >> xpath=ancestor::div[2]/preceding-sibling::input[1]'
      await page.locator(logoInput).first().setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG_BUFFER })
      await page.waitForTimeout(1000)
      const checks = []
      const posts = writeCount(env, 'POST', /\/logo$/)
      checks.push(CHECK('logo válido hace 1 POST /fuentes/:id/logo (mock)', posts === 1, 'POSTs=' + posts))
      const logoErrVisible = await page.evaluate(() => Array.from(document.querySelectorAll('[id^=logo-error-]')).some(e => (e.textContent || '').trim().length > 0))
      checks.push(CHECK('sin error tras subir logo válido', !logoErrVisible))
      // QR de cuenta (m390: sección expandida de la cuenta).
      await page.getByRole('tab', { name: 'Cuentas' }).click()
      await page.waitForTimeout(600)
      const qrInput = 'button[aria-label^="Subir QR de"] >> xpath=ancestor::div[2]/preceding-sibling::input[1]'
      const qrCount = await page.locator(qrInput).count()
      if (qrCount === 0) {
        // En móvil los controles viven en la fila expandida: abrir el detalle.
        await page.locator('button[aria-label^="Ver detalle de"], button[aria-label*="detalle"]').first().click().catch(() => {})
        await page.waitForTimeout(500)
      }
      await mockWrite(env, { glob: API + '/cuentas/*/qr', method: 'POST', status: 400, body: ERR_400_CAMPO('imagen_ruta', 'QR inválido (mock harness)') })
      const qrVisible = await page.locator(qrInput).count()
      if (qrVisible > 0) {
        await page.locator(qrInput).first().setInputFiles({ name: 'qr.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fake') })
        await page.waitForTimeout(500)
        const qrErr = await page.evaluate(() => {
          const el = Array.from(document.querySelectorAll('[id^=qr-error-]')).find(e => (e.textContent || '').trim().length > 0)
          return el ? (el.textContent || '').trim() : ''
        })
        checks.push(CHECK('QR PDF rechazado con error inline', /imagen|PNG|JPG|WEBP/i.test(qrErr), qrErr))
        const writes = writeCount(env, 'POST', /\/qr$/)
        checks.push(CHECK('0 requests de subida de QR', writes === 0, 'writes=' + writes))
      } else {
        checks.push(CHECK('QR PDF rechazado con error inline', false, 'input de QR no encontrado en viewport móvil (se reporta como no ejecutable)'))
      }
      return checks
    },
  })

  // M5: QR válido (PNG) con request de subida mockeado + evidencia.
  await runCase(browser, {
    ac: 'ac5', id: 'qr-valido', theme: 'light', shot: 'ac5-qr-valido-m390-light',
    run: async (env) => {
      const { page } = env
      await goto(page, '/configuracion', 1200)
      await page.getByRole('tab', { name: 'Cuentas' }).click()
      await page.waitForTimeout(700)
      const qrInput = 'button[aria-label^="Subir QR de"] >> xpath=ancestor::div[2]/preceding-sibling::input[1]'
      if ((await page.locator(qrInput).count()) === 0) {
        await page.locator('button[aria-label^="Ver detalle de"], button[aria-label*="detalle"]').first().click().catch(() => {})
        await page.waitForTimeout(500)
      }
      const checks = []
      const labels = await page.locator('button[aria-label^="Subir QR de"]').evaluateAll(els => els.map(e => e.getAttribute('aria-label')))
      checks.push(CHECK('controles de QR disponibles en Cuentas', labels.length > 0, JSON.stringify(labels)))
      await mockWrite(env, { glob: API + '/cuentas/*/qr', method: 'POST', status: 200, body: { data: { id: 3, qr_ruta: '/uploads/harness-qr.png' } } })
      await page.locator(qrInput).first().setInputFiles({ name: 'qr.png', mimeType: 'image/png', buffer: PNG_BUFFER })
      await page.waitForTimeout(1000)
      const posts = writeCount(env, 'POST', /\/qr$/)
      checks.push(CHECK('QR PNG válido hace exactamente 1 POST /cuentas/:id/qr (mock)', posts === 1, 'POSTs=' + posts))
      const errs = await page.evaluate(() => Array.from(document.querySelectorAll('[id^=qr-error-]')).map(e => (e.textContent || '').trim()).filter(Boolean))
      checks.push(CHECK('sin error inline tras subir QR válido', errs.length === 0, JSON.stringify(errs)))
      const qrReq = env.st.requests.filter(r => r.method === 'POST' && /\/qr$/.test(r.path))
      checks.push(CHECK('request registrado en /cuentas/:id/qr', qrReq.length === 1 && /^\/api\/v1\/cuentas\/\d+\/qr$/.test(qrReq[0].path), JSON.stringify(qrReq)))
      checks.push(CHECK('0 escrituras no mockeadas', env.st.unexpected.length === 0, JSON.stringify(env.st.unexpected)))
      return checks
    },
  })

  // M2: estado post-pago (D16) — campos bloqueados, sin re-POST /pagos, OCR sin efecto,
  // reintento solo del upload y salida a ingresos sin confirmación de descarte.
  await runCase(browser, {
    ac: 'ac5', id: 'post-pago-bloqueado', theme: 'light', ocrText: OCR_TEXTO_ALT, shot: 'ac5-post-pago-bloqueado-m390-light',
    run: async (env) => {
      const { page } = env
      await goto(page, '/registrar')
      await mockWrite(env, { glob: API + '/pagos', method: 'POST', status: 200, body: MOCK_PAGO_200 })
      await mockWrite(env, { glob: API + '/pagos/*/comprobante', method: 'POST', status: 400, body: ERR_400_CAMPO('imagen', 'La imagen del comprobante no es válida (mock harness)') })
      const checks = []
      await page.setInputFiles('form input[type=file]', { name: 'comprobante.png', mimeType: 'image/png', buffer: PNG_BUFFER })
      await page.getByRole('button', { name: 'Leer comprobante' }).click()
      await page.getByRole('button', { name: 'Ver fecha en el calendario' }).waitFor({ state: 'visible', timeout: 10000 })
      await fillRegistrarValido(env)
      await page.getByRole('button', { name: 'Guardar pago' }).click()
      await page.getByRole('button', { name: 'Reintentar comprobante' }).waitFor({ state: 'visible', timeout: 15000 })
      await page.waitForTimeout(400)
      const dom = await page.evaluate(() => {
        const dis = id => { const el = document.getElementById(id); return el ? el.disabled === true : null }
        const metodo = document.getElementById('metodo')
        return {
          dias: dis('registrar-dias'), fuente: dis('fuente'), monto: dis('monto'), notas: dis('notas'),
          metodo: metodo ? Array.from(metodo.querySelectorAll('button')).map(b => ({ label: (b.textContent || '').trim(), disabled: b.disabled })) : null,
          guardar: Array.from(document.querySelectorAll('button')).filter(b => (b.textContent || '').trim() === 'Guardar pago').length,
        }
      })
      checks.push(CHECK('calendario bloqueado (fieldset disabled)', dom.dias === true, JSON.stringify(dom.dias)))
      checks.push(CHECK('select de fuente bloqueado', dom.fuente === true, JSON.stringify(dom.fuente)))
      checks.push(CHECK('los 3 métodos de pago bloqueados', !!dom.metodo && dom.metodo.length === 3 && dom.metodo.every(m => m.disabled), JSON.stringify(dom.metodo)))
      checks.push(CHECK('monto bloqueado', dom.monto === true, JSON.stringify(dom.monto)))
      checks.push(CHECK('notas bloqueadas', dom.notas === true, JSON.stringify(dom.notas)))
      checks.push(CHECK('sin botón "Guardar pago" (submit principal ausente)', dom.guardar === 0, 'botones=' + dom.guardar))
      // Un submit tardío no reenvía ni valida.
      const antes = { pagos: writeCount(env, 'POST', /\/pagos$/), uploads: writeCount(env, 'POST', /\/comprobante$/), submits: await page.evaluate(() => window.__submits) }
      await page.evaluate(() => document.querySelector('form[aria-labelledby="registrar-pago-titulo"]').requestSubmit())
      await page.waitForTimeout(600)
      const despues = { pagos: writeCount(env, 'POST', /\/pagos$/), uploads: writeCount(env, 'POST', /\/comprobante$/), submits: await page.evaluate(() => window.__submits) }
      checks.push(CHECK('requestSubmit() dispara el evento submit', despues.submits === antes.submits + 1, 'submits=' + antes.submits + '→' + despues.submits))
      checks.push(CHECK('submit tardío no hace POST /pagos (sigue 1)', despues.pagos === 1 && antes.pagos === 1, 'pagos=' + despues.pagos))
      checks.push(CHECK('submit tardío no reintenta el comprobante', despues.uploads === antes.uploads, 'uploads=' + despues.uploads))
      // El OCR de un comprobante nuevo no altera los campos guardados.
      const montoGuardado = await page.inputValue('#monto')
      await page.setInputFiles('form input[type=file]', { name: 'otro.png', mimeType: 'image/png', buffer: PNG_BUFFER })
      await page.getByRole('button', { name: 'Leer comprobante' }).click()
      await page.waitForTimeout(900)
      const montoTrasOcr = await page.inputValue('#monto')
      checks.push(CHECK('OCR post-pago no altera el monto guardado', montoGuardado === '265,00' && montoTrasOcr === '265,00', 'antes=' + montoGuardado + ', después=' + montoTrasOcr))
      // Reintento: solo sube el comprobante, nunca re-crea el pago.
      await page.getByRole('button', { name: 'Reintentar comprobante' }).click()
      await page.waitForTimeout(900)
      const uploads2 = writeCount(env, 'POST', /\/comprobante$/)
      const pagos2 = writeCount(env, 'POST', /\/pagos$/)
      checks.push(CHECK('reintento hace un 2.º POST de comprobante', uploads2 === 2, 'uploads=' + uploads2))
      checks.push(CHECK('reintento no re-crea el pago (POST /pagos sigue 1)', pagos2 === 1, 'pagos=' + pagos2))
      // Salida a ingresos sin guardia de descarte.
      await page.getByRole('button', { name: 'Ir a ingresos' }).click()
      await page.waitForTimeout(800)
      checks.push(CHECK('"Ir a ingresos" navega a /ingresos sin confirmación', page.url().includes('/ingresos') && (await page.locator('[data-slot=alert-dialog-content]').count()) === 0, page.url()))
      checks.push(CHECK('0 escrituras no mockeadas', env.st.unexpected.length === 0, JSON.stringify(env.st.unexpected)))
      return checks
    },
  })
}

/* ==========================================================================
 * AC6 — Operable por teclado
 * ========================================================================== */
async function ac6(browser) {
  // Flujo completo de Registrar solo con teclado + indicador de foco.
  await runCase(browser, {
    ac: 'ac6', id: 'registrar-teclado', theme: 'light',
    run: async (env) => {
      const { page } = env
      await goto(page, '/registrar')
      await mockWrite(env, { glob: API + '/pagos', method: 'POST', status: 200, body: MOCK_PAGO_200 })
      const checks = []
      const stops = []
      const captureStop = async () => {
        const info = await focusInfo(page)
        if (info) stops.push({ id: info.id || info.selector, tag: info.tag, text: (info.texto || '').slice(0, 40), focusVisible: info.focusVisible, ratio: info.indicator.ratio, pass: info.indicator.pass })
        return info
      }
      // 1) Tab hasta el skip link.
      await page.keyboard.press('Tab')
      const skip = await captureStop()
      checks.push(CHECK('primer Tab = "Saltar al contenido"', skip && /saltar/i.test(skip.texto || ''), JSON.stringify(skip && { id: skip.id, text: skip.text })))
      // 2) Tab hasta el Select de fuente, Enter abre, flechas + Enter elige.
      const fuenteStop = await tabTo(page, info => info.id === 'fuente')
      await captureStop()
      checks.push(CHECK('#fuente alcanzable por Tab', !!fuenteStop))
      await page.keyboard.press('Enter')
      await page.locator('[data-slot=select-content]').first().waitFor({ state: 'visible', timeout: 5000 })
      checks.push(CHECK('Enter abre el listbox', true))
      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(200)
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
      const fuenteVal = await page.evaluate(() => (document.getElementById('fuente').textContent || '').trim())
      checks.push(CHECK('opción elegida con teclado', fuenteVal.length > 0 && !/selecciona/i.test(fuenteVal), 'valor=' + fuenteVal))
      // 3) Tab hasta #monto y escribir.
      const montoStop = await tabTo(page, info => info.id === 'monto')
      await captureStop()
      checks.push(CHECK('#monto alcanzable por Tab', !!montoStop))
      await page.keyboard.type('265,00')
      // 4) Tab hasta un día del calendario y Enter lo marca.
      const tileStop = await tabTo(page, info => info.tag === 'BUTTON' && /^\d{1,2}$/.test(info.text))
      checks.push(CHECK('días del calendario alcanzables por Tab', !!tileStop, JSON.stringify(tileStop)))
      if (tileStop) {
        await page.keyboard.press('Enter')
        await page.waitForTimeout(400)
        const dias = await page.evaluate(() => document.querySelectorAll('#registrar-dias .react-calendar__tile.font-semibold').length)
        checks.push(CHECK('Enter marca el día enfocado', dias >= 1, 'tiles marcados=' + dias))
      }
      // 5) Tab hasta Guardar pago y Enter envía.
      const submitStop = await tabTo(page, info => info.text === 'Guardar pago')
      checks.push(CHECK('submit alcanzable por Tab', !!submitStop))
      await page.keyboard.press('Enter')
      await page.waitForTimeout(1300)
      const posts = writeCount(env, 'POST', /\/pagos$/)
      checks.push(CHECK('Enter en submit guarda el pago', posts === 1, 'POSTs=' + posts))
      checks.push(CHECK('navega a /ingresos', page.url().includes('/ingresos'), page.url()))
      // Indicador de foco en todos los stops intermedios.
      const badStops = stops.filter(s => s.focusVisible !== true || s.pass !== true)
      checks.push(CHECK(`indicador de foco ≥3:1 en ${stops.length} paradas de Tab`, badStops.length === 0, badStops.map(s => `${s.id}/${s.text} fv=${s.focusVisible} ratio=${s.ratio}`).join(' | ')))
      return checks
    },
  })

  // Camino completo por Tab en /registrar (página completa).
  await runCase(browser, {
    ac: 'ac6', id: 'walk-registrar', theme: 'light',
    run: async (env) => {
      const { page } = env
      await goto(page, '/registrar')
      const checks = []
      const stops = []
      for (let i = 0; i < 90; i++) {
        await page.keyboard.press('Tab')
        const info = await focusInfo(page)
        if (!info) break
        const entry = { n: i + 1, id: info.id || info.selector, tag: info.tag, text: (info.texto || '').slice(0, 40), focusVisible: info.focusVisible, ratio: info.indicator ? info.indicator.ratio : null, pass: info.indicator ? info.indicator.pass : null }
        stops.push(entry)
        if ((info.texto || '') === 'Guardar pago') break
      }
      const bad = stops.filter(s => s.focusVisible !== true || s.pass !== true)
      checks.push(CHECK(`walk por /registrar: ${stops.length} paradas, todas con foco visible e indicador`, stops.length >= 20 && bad.length === 0, bad.map(s => `${s.n}:${s.id}/${s.text} fv=${s.focusVisible} ratio=${s.ratio}`).join(' | ')))
      return checks
    },
  })

  // Trampa de foco: diálogo Fuente y ConfirmarDescarte anidado.
  await runCase(browser, {
    ac: 'ac6', id: 'focus-trap-dialogos', theme: 'light',
    run: async (env) => {
      const { page } = env
      await goto(page, '/configuracion', 1200)
      await page.getByRole('tab', { name: 'Fuentes' }).click()
      await page.waitForTimeout(400)
      await openDialogFromButton(env, 'Nueva fuente')
      const checks = []
      // Foco inicial dentro del diálogo (no en la X).
      await page.waitForTimeout(300)
      const firstFocus = await activeDesc(page)
      checks.push(CHECK('foco inicial dentro del diálogo', !!firstFocus && firstFocus.inDialog === 'dialog-content', JSON.stringify(firstFocus)))
      let outside = 0
      for (let i = 0; i < 24; i++) {
        await page.keyboard.press('Tab')
        const info = await page.evaluate(() => {
          const el = document.activeElement
          return el && el.closest('[data-slot=dialog-content]') ? 1 : 0
        })
        if (!info) outside++
      }
      checks.push(CHECK('Tab dentro del diálogo no escapa (trampa de foco)', outside === 0, 'escapes=' + outside))
      // Diálogo sucio → confirmación anidada.
      await page.fill('#fuente-alias', 'QA')
      await page.getByRole('button', { name: 'Cancelar' }).click()
      await page.locator('[data-slot=alert-dialog-content]').waitFor({ state: 'visible', timeout: 5000 })
      let outsideConfirm = 0
      for (let i = 0; i < 16; i++) {
        await page.keyboard.press('Tab')
        const info = await page.evaluate(() => {
          const el = document.activeElement
          return el && el.closest('[data-slot=alert-dialog-content]') ? 1 : 0
        })
        if (!info) outsideConfirm++
      }
      checks.push(CHECK('Tab dentro de la confirmación no escapa', outsideConfirm === 0, 'escapes=' + outsideConfirm))
      const focusBtn = await activeDesc(page)
      checks.push(CHECK('foco sigue dentro de la confirmación', !!focusBtn && focusBtn.inDialog === 'alert-dialog-content', JSON.stringify(focusBtn)))
      return checks
    },
  })

  // SplitsTab autoguardado operable por teclado.
  await runCase(browser, {
    ac: 'ac6', id: 'splits-teclado', theme: 'light',
    run: async (env) => {
      const { page } = env
      await goto(page, '/configuracion', 1200)
      await page.getByRole('tab', { name: 'Splits' }).click()
      await page.waitForTimeout(600)
      // PUT 200 y GET posterior (invalidateQueries) devolviendo lo guardado:
      // así el valor estable no revierte al dato real del backend.
      let puts = 0
      let guardado = null
      await page.route(API + '/settings/split', async route => {
        const m = route.request().method()
        if (m === 'PUT') {
          puts++
          guardado = JSON.parse(route.request().postData() || '{}')
          return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'x-harness-mock': '1' }, body: JSON.stringify({ data: guardado }) })
        }
        if (m === 'GET' && guardado) {
          return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'x-harness-mock': '1' }, body: JSON.stringify({ data: guardado }) })
        }
        return route.fallback()
      })
      const checks = []
      const antes = await page.evaluate(() => (document.getElementById('split-modo-default').textContent || '').trim())
      await page.locator('#split-modo-default').focus()
      await page.keyboard.press('Enter')
      await page.locator('[data-slot=select-content]').first().waitFor({ state: 'visible', timeout: 5000 })
      checks.push(CHECK('Enter abre el listbox del autoguardado', true))
      // El valor actual ("enteros") es la última opción: ArrowUp mueve a "redondeado".
      await page.keyboard.press('ArrowUp')
      await page.waitForTimeout(200)
      await page.keyboard.press('Enter')
      await page.waitForTimeout(900)
      checks.push(CHECK('selección con teclado dispara el PUT', puts === 1, 'PUTs=' + puts))
      const despues = await page.evaluate(() => (document.getElementById('split-modo-default').textContent || '').trim())
      checks.push(CHECK('el modo cambió con teclado', despues !== antes, `antes=${antes} después=${despues}`))
      return checks
    },
  })
}

/* ==========================================================================
 * AC7 — Regresión del gate A sobre estados de formulario
 * ========================================================================== */
async function collectState(page, route, theme, vpLabel) {
  return page.evaluate(async () => {
    const A = window.__a11y
    const overflow = A.collectOverflow()
    const contrast = A.collectTextContrast()
    const touch = await A.measureTouch(null)
    const sinNombre = []
    const controls = Array.from(document.body.querySelectorAll('button, input:not([type=hidden]), select, textarea')).filter(el => {
      if (el.disabled) return false
      return A.isVisible(el)
    })
    for (const el of controls) {
      const aria = el.getAttribute('aria-label')
      const lb = el.getAttribute('aria-labelledby')
      let name = aria || ''
      if (!name && lb) {
        name = lb.split(/\s+/).map(id => document.getElementById(id)).filter(Boolean)
          .map(e => (e.textContent || '').replace(/\s+/g, ' ').trim()).join(' ').trim()
      }
      if (!name && el.labels && el.labels.length) {
        name = Array.prototype.map.call(el.labels, l => l.textContent).join(' ').trim()
      }
      if (!name) name = (el.textContent || '').replace(/\s+/g, ' ').trim()
      if (!name && el.tagName === 'INPUT') name = el.value || ''
      if (!name) sinNombre.push(A.selectorOf(el))
    }
    const imgsSinDim = Array.from(document.images).filter(i => !i.getAttribute('width') || !i.getAttribute('height')).map(i => A.selectorOf(i))
    const toasts = document.querySelectorAll('ol.toaster li, [data-sonner-toast], [data-sonner-toaster] li').length
    const ariaLive = Array.from(document.querySelectorAll('[aria-live]')).map(el => ({
      politeness: el.getAttribute('aria-live'),
      texto: (el.textContent || '').replace(/\s+/g, ' ').trim(),
    })).filter(x => x.texto)
    return {
      overflowX: overflow.overflowX,
      truncados: overflow.truncados.length,
      targets: touch.targets,
      small: touch.small,
      touchFailures: touch.failures.length,
      touchDetail: touch.failures.slice(0, 15).map(f => ({ selector: f.selector, texto: f.texto, w: f.w, h: f.h })),
      contrastChecked: contrast.checked,
      contrastFailures: contrast.failures.length,
      contrastes: contrast.failures.slice(0, 10).map(f => ({ selector: f.selector, texto: f.texto, ratio: f.ratio, need: f.need, category: f.category })),
      sinNombre,
      imgsSinDim: imgsSinDim.length,
      toasts,
      ariaLive,
      headings: Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(h => (h.textContent || '').trim()).filter(Boolean),
    }
  }).then(s => ({ ...s, route, theme, viewport: vpLabel }))
}

async function ac7(browser) {
  const routeDefaults = []
  const formStates = []

  // 1) Rutas por defecto: mismos viewports/temas que el baseline del gate A.
  // M3: el baseline (test-results/a11y-gate) mide otra semántica (lista de
  // elementos <44px) y otro build, así que NO se compara aquí ni se usa como gate.
  for (const vp of [VIEWPORTS.m390, VIEWPORTS.desktop]) {
    for (const theme of ['light', 'dark']) {
      for (const route of ROUTES) {
        const env = await newPage(browser, { theme, vp })
        try {
          await goto(env.page, route, 1200)
          const state = await collectState(env.page, route, theme, vp.label)
          state.console = env.consoleMsgs.filter(m => !/favicon/i.test(m.text))
          state.mockedNetwork = env.st.consoleMocked
          state.failedRequests = env.failed.filter(f => !/favicon/i.test(f.url))
          routeDefaults.push(state)
          // Criterio del gate A: overflow, contraste y consola/failedRequests.
          // Los touch targets (<44px) son informativos, igual que en el baseline.
          const ok = state.contrastFailures === 0 && state.overflowX === 0 && state.truncados === 0 && state.sinNombre.length === 0 && state.console.length === 0 && state.failedRequests.length === 0
          console.log(`  [${ok ? 'PASS' : 'FAIL'}] ac7/route ${route} ${theme}/${vp.label} — targets<44=${state.small} touch=${state.touchFailures} contraste=${state.contrastFailures} overflow=${state.overflowX} truncados=${state.truncados} sinNombre=${state.sinNombre.length} consola=${state.console.length}`)
        } catch (e) {
          routeDefaults.push({ route, theme, viewport: vp.label, error: e.message })
          console.log(`  [ERROR] ac7/route ${route} ${theme}/${vp.label} — ${e.message}`)
        } finally {
          await env.ctx.close()
        }
      }
    }
  }

  // 2) Estados de formulario (m390, light+dark) con capturas.
  const stateDefs = [
    {
      id: 'registrar-invalido', theme: 'light', shot: 'ac7-registrar-invalido-m390-light',
      setup: async (page) => {
        await goto(page, '/registrar')
        await page.getByRole('button', { name: 'Guardar pago' }).click()
        await page.waitForTimeout(500)
      },
    },
    {
      id: 'registrar-invalido', theme: 'dark', shot: 'ac7-registrar-invalido-m390-dark',
      setup: async (page) => {
        await goto(page, '/registrar')
        await page.getByRole('button', { name: 'Guardar pago' }).click()
        await page.waitForTimeout(500)
      },
    },
    {
      id: 'registrar-11mb', theme: 'light', shot: 'ac7-registrar-11mb-m390-light',
      setup: async (page) => {
        await goto(page, '/registrar')
        await page.setInputFiles('form input[type=file]', { name: 'grande.png', mimeType: 'image/png', buffer: MB11 })
        await page.waitForTimeout(400)
      },
    },
    {
      id: 'editar-invalido', theme: 'light', shot: 'ac7-editar-invalido-m390-light',
      setup: async (page) => {
        await goto(page, '/ingresos', 1200)
        await page.locator('div.rounded-lg.border:has(button[aria-label="Generar split"]) button[aria-label="Editar pago"]').first().click()
        await page.locator('[data-slot=dialog-content]').first().waitFor({ state: 'visible', timeout: 5000 })
        await page.fill('#edit-monto', '')
        await page.getByRole('button', { name: 'Guardar cambios' }).click()
        await page.waitForTimeout(500)
      },
    },
    {
      id: 'editar-confirm', theme: 'light', shot: 'ac7-editar-confirm-m390-light',
      setup: async (page) => {
        await goto(page, '/ingresos', 1200)
        await page.locator('div.rounded-lg.border:has(button[aria-label="Generar split"]) button[aria-label="Editar pago"]').first().click()
        await page.locator('[data-slot=dialog-content]').first().waitFor({ state: 'visible', timeout: 5000 })
        await page.fill('#edit-monto', '300,00')
        await page.waitForTimeout(200)
        await page.getByRole('button', { name: 'Cancelar' }).click()
        await page.locator('[data-slot=alert-dialog-content]').waitFor({ state: 'visible', timeout: 5000 })
        await page.waitForTimeout(300)
      },
    },
    {
      id: 'fuente-invalido', theme: 'light', shot: 'ac7-fuente-invalido-m390-light',
      setup: async (page) => {
        await goto(page, '/configuracion', 1200)
        await page.getByRole('tab', { name: 'Fuentes' }).click()
        await page.waitForTimeout(400)
        await page.getByRole('button', { name: 'Nueva fuente' }).click()
        await page.locator('[data-slot=dialog-content]').first().waitFor({ state: 'visible', timeout: 5000 })
        await page.getByRole('button', { name: 'Crear fuente' }).click()
        await page.waitForTimeout(500)
      },
    },
    {
      id: 'tasa-invalido', theme: 'light', shot: 'ac7-tasa-invalido-m390-light',
      setup: async (page) => {
        await goto(page, '/configuracion', 1200)
        await page.locator('button[aria-label^="Editar tasa de"]').first().click()
        await page.locator('[data-slot=dialog-content]').first().waitFor({ state: 'visible', timeout: 5000 })
        await page.waitForTimeout(300)
        const inputId = await page.evaluate(() => (document.querySelector('[data-slot=dialog-content] input[id^=tasa-]') || {}).id)
        await page.locator('#' + inputId).fill('')
        await page.getByRole('button', { name: 'Guardar tasa' }).click()
        await page.waitForTimeout(500)
      },
    },
    {
      id: 'splits-tab-error', theme: 'light', shot: 'ac7-splits-tab-error-m390-light',
      setup: async (page, env) => {
        await goto(page, '/configuracion', 1200)
        await page.getByRole('tab', { name: 'Splits' }).click()
        await page.waitForTimeout(600)
        await mockWrite(env, { glob: API + '/settings/split', method: 'PUT', status: 409, body: ERR_409('Conflicto (mock harness)') })
        await pickSelect(page, '#split-modo-default', 'preciso (truncado al centavo)')
        await page.waitForTimeout(1200)
      },
    },
    {
      id: 'generar-split-dialog', theme: 'light', shot: 'ac7-generar-split-m390-light',
      setup: async (page) => {
        await goto(page, '/ingresos', 1200)
        await page.locator('button[aria-label="Generar split"]').first().click()
        await page.locator('[data-slot=dialog-content]').first().waitFor({ state: 'visible', timeout: 5000 })
        await page.waitForTimeout(400)
      },
    },
    {
      id: 'registrar-ocr-resumen', theme: 'light', shot: 'ac7-registrar-ocr-m390-light', ocrText: OCR_TEXTO,
      setup: async (page) => {
        await goto(page, '/registrar')
        await page.setInputFiles('form input[type=file]', { name: 'comprobante.png', mimeType: 'image/png', buffer: PNG_BUFFER })
        await page.getByRole('button', { name: 'Leer comprobante' }).click()
        await page.getByRole('button', { name: 'Ver fecha en el calendario' }).waitFor({ state: 'visible', timeout: 10000 })
        await page.waitForTimeout(400)
      },
    },
    {
      id: 'registrar-ocr-resumen', theme: 'dark', shot: 'ac7-registrar-ocr-m390-dark', ocrText: OCR_TEXTO,
      setup: async (page) => {
        await goto(page, '/registrar')
        await page.setInputFiles('form input[type=file]', { name: 'comprobante.png', mimeType: 'image/png', buffer: PNG_BUFFER })
        await page.getByRole('button', { name: 'Leer comprobante' }).click()
        await page.getByRole('button', { name: 'Ver fecha en el calendario' }).waitFor({ state: 'visible', timeout: 10000 })
        await page.waitForTimeout(400)
      },
    },
    {
      id: 'cuenta-dialog', theme: 'light', shot: 'ac7-cuenta-dialog-m390-light',
      setup: async (page) => {
        await goto(page, '/configuracion', 1200)
        await page.getByRole('button', { name: 'Nueva cuenta' }).click()
        await page.locator('[data-slot=dialog-content]').first().waitFor({ state: 'visible', timeout: 5000 })
        await page.waitForTimeout(300)
      },
    },
    {
      id: 'registrar-invalido', theme: 'dark',
      setup: async (page) => {
        await goto(page, '/registrar')
        await page.getByRole('button', { name: 'Guardar pago' }).click()
        await page.waitForTimeout(500)
      },
    },
    {
      id: 'editar-invalido', theme: 'dark',
      setup: async (page) => {
        await goto(page, '/ingresos', 1200)
        await page.locator('div.rounded-lg.border:has(button[aria-label="Generar split"]) button[aria-label="Editar pago"]').first().click()
        await page.locator('[data-slot=dialog-content]').first().waitFor({ state: 'visible', timeout: 5000 })
        await page.fill('#edit-monto', '')
        await page.getByRole('button', { name: 'Guardar cambios' }).click()
        await page.waitForTimeout(500)
      },
    },
    {
      id: 'fuente-invalido', theme: 'dark',
      setup: async (page) => {
        await goto(page, '/configuracion', 1200)
        await page.getByRole('tab', { name: 'Fuentes' }).click()
        await page.waitForTimeout(400)
        await page.getByRole('button', { name: 'Nueva fuente' }).click()
        await page.locator('[data-slot=dialog-content]').first().waitFor({ state: 'visible', timeout: 5000 })
        await page.getByRole('button', { name: 'Crear fuente' }).click()
        await page.waitForTimeout(500)
      },
    },
    {
      id: 'splits-tab-error', theme: 'dark',
      setup: async (page, env) => {
        await goto(page, '/configuracion', 1200)
        await page.getByRole('tab', { name: 'Splits' }).click()
        await page.waitForTimeout(600)
        await mockWrite(env, { glob: API + '/settings/split', method: 'PUT', status: 409, body: ERR_409('Conflicto (mock harness)') })
        await pickSelect(page, '#split-modo-default', 'preciso (truncado al centavo)')
        await page.waitForTimeout(1200)
      },
    },
    {
      id: 'editar-confirm', theme: 'dark',
      setup: async (page) => {
        await goto(page, '/ingresos', 1200)
        await page.locator('div.rounded-lg.border:has(button[aria-label="Generar split"]) button[aria-label="Editar pago"]').first().click()
        await page.locator('[data-slot=dialog-content]').first().waitFor({ state: 'visible', timeout: 5000 })
        await page.fill('#edit-monto', '300,00')
        await page.waitForTimeout(200)
        await page.getByRole('button', { name: 'Cancelar' }).click()
        await page.locator('[data-slot=alert-dialog-content]').waitFor({ state: 'visible', timeout: 5000 })
        await page.waitForTimeout(300)
      },
    },
  ]

  for (const def of stateDefs) {
    const env = await newPage(browser, { theme: def.theme, vp: VIEWPORTS.m390, ocrText: def.ocrText || null })
    try {
      await def.setup(env.page, env)
      const state = await collectState(env.page, 'estado:' + def.id, def.theme, 'mobile')
      state.console = env.consoleMsgs.filter(m => !/favicon/i.test(m.text))
      state.mockedNetwork = env.st.consoleMocked
      state.failedRequests = env.failed.filter(f => !/favicon/i.test(f.url))
      state.unexpectedWrites = env.st.unexpected
      // OCR: sin toasts y con el estado inline anunciado por aria-live.
      let ocrOk = true
      if (def.id === 'registrar-ocr-resumen') {
        const inline = state.ariaLive.some(x => x.politeness === 'polite' && /Comprobante leído/.test(x.texto))
        ocrOk = state.toasts === 0 && inline
        state.ocrCheck = { toasts: state.toasts, inlineAriaLive: inline, ariaLive: state.ariaLive }
      }
      formStates.push(state)
      if (def.shot) state.screenshot = await shot(env.page, def.shot)
      // H1: en los estados de formulario (m390) los touch targets NO son informativos:
      // cualquier control <44px hace fallar el estado. OCR: sin toasts + aria-live.
      const ok = state.touchFailures === 0 && state.contrastFailures === 0 && state.overflowX === 0 && state.truncados === 0 && state.sinNombre.length === 0 && state.console.length === 0 && state.failedRequests.length === 0 && state.unexpectedWrites.length === 0 && ocrOk
      console.log(`  [${ok ? 'PASS' : 'FAIL'}] ac7/estado ${def.id} ${def.theme} — touch=${state.touchFailures} (gate) small=${state.small} contraste=${state.contrastFailures} overflow=${state.overflowX} truncados=${state.truncados} sinNombre=${state.sinNombre.length} consola=${state.console.length} writes=${state.unexpectedWrites.length} toasts=${state.toasts}${def.id === 'registrar-ocr-resumen' ? ' ariaLive=' + (state.ocrCheck.inlineAriaLive ? 'ok' : 'FALLA') : ''}`)
    } catch (e) {
      formStates.push({ id: def.id, theme: def.theme, error: e.message })
      console.log(`  [ERROR] ac7/estado ${def.id} ${def.theme} — ${e.message}`)
    } finally {
      await env.ctx.close()
    }
  }

  // 3) Capturas desktop para confirmar layout (AC7, solo informativas + diff).
  const desktopShots = []
  for (const [route, theme] of [['/registrar', 'light'], ['/registrar', 'dark'], ['/configuracion', 'light'], ['/configuracion', 'dark']]) {
    const env = await newPage(browser, { theme, vp: VIEWPORTS.desktop })
    try {
      await goto(env.page, route, 1200)
      const name = `ac7-route${route.replace('/', '-')}-desktop-${theme}`
      desktopShots.push({ route, theme, screenshot: await shot(env.page, name) })
    } finally {
      await env.ctx.close()
    }
  }
  {
    const env = await newPage(browser, { theme: 'light', vp: VIEWPORTS.desktop })
    try {
      await goto(env.page, '/ingresos', 1200)
      await page_openEditar(env)
      desktopShots.push({ route: '/ingresos+dialog', theme: 'light', screenshot: await shot(env.page, 'ac7-ingresos-editar-dialog-desktop-light') })
    } finally {
      await env.ctx.close()
    }
  }

  // Rutas: criterio del gate A (overflow, contraste, truncados, sinNombre, consola);
  // en desktop los <44px son informativos (regla táctil no aplica a ratón).
  const routeOk = routeDefaults.every(s => !s.error && s.contrastFailures === 0 && s.overflowX === 0 && s.truncados === 0 && s.sinNombre.length === 0 && s.console.length === 0 && s.failedRequests.length === 0)
  // Estados (m390): H1 exige 0 touch targets <44px, además del resto del gate A.
  const statesOk = formStates.every(s => !s.error && s.touchFailures === 0 && s.contrastFailures === 0 && s.overflowX === 0 && s.truncados === 0 && s.sinNombre.length === 0 && s.console.length === 0 && s.failedRequests.length === 0 && s.unexpectedWrites.length === 0 && (s.ocrCheck ? s.ocrCheck.toasts === 0 && s.ocrCheck.inlineAriaLive : true))
  return { routeDefaults, formStates, desktopShots, pass: routeOk && statesOk }
}

async function page_openEditar(env) {
  // La fila renderiza AccionesPago en la copia móvil (md:hidden) y en la de
  // escritorio: :visible elige la copia activa en el viewport actual.
  await env.page.locator('div.rounded-lg.border:has(button[aria-label="Generar split"]) button[aria-label="Editar pago"]:visible').first().click()
  await env.page.locator('[data-slot=dialog-content]').first().waitFor({ state: 'visible', timeout: 5000 })
}

/* ==========================================================================
 * AC8/AC9/AC10 — calidad, alcance de cambios, repositorio remoto
 * ========================================================================== */
function runCmd(cmd, cwd, logFile, env) {
  const t0 = Date.now()
  const res = spawnSync('bash', ['-lc', cmd], { cwd, encoding: 'utf8', timeout: 600000, env: { ...process.env, ...(env || {}) } })
  const out = (res.stdout || '') + (res.stderr || '')
  fs.writeFileSync(path.join(LOGS, logFile), `$ ${cmd} (cwd ${cwd})\n${out}\n[exit ${res.status}]\n`)
  const tail = out.split('\n').filter(Boolean).slice(-8)
  return { cmd, cwd, status: res.status, durationMs: Date.now() - t0, log: 'logs/' + logFile, tail }
}

async function ac8_ac9_ac10() {
  const ac8 = {}
  ac8.tsc = runCmd('npx tsc -b', WEB, 'tsc.log')
  ac8.npmTest = runCmd('npm test', WEB, 'npm-test.log')
  ac8.build = runCmd('npm run build', WEB, 'build.log', { VITE_API_URL: 'http://localhost:18082/api/v1' })
  ac8.goTest = runCmd('go test ./...', BACKEND, 'go-test.log')
  ac8.pass = [ac8.tsc, ac8.npmTest, ac8.build, ac8.goTest].every(c => c.status === 0)
  console.log(`  [${ac8.pass ? 'PASS' : 'FAIL'}] ac8 calidad — tsc=${ac8.tsc.status} npm=${ac8.npmTest.status} build=${ac8.build.status} go=${ac8.goTest.status}`)

  const gitLog = []
  const git = (cmd) => {
    const res = spawnSync('git', cmd.split(' '), { cwd: ROOT, encoding: 'utf8', timeout: 60000 })
    return (res.stdout || '') + (res.stderr || '')
  }
  const ac9 = {}
  ac9.branch = git('branch --show-current').trim()
  ac9.head = git('rev-parse HEAD').trim()
  ac9.baseCommit = BASE_COMMIT
  ac9.diffDeps = git(`diff --stat ${BASE_COMMIT}..HEAD -- web/package.json backend/go.mod`).trim()
  ac9.changedFiles = git(`diff --name-only ${BASE_COMMIT}..HEAD`).trim().split('\n').filter(Boolean)
  ac9.outOfScope = ac9.changedFiles.filter(f => !f.startsWith('web/') && !f.startsWith('backlog/') && !f.startsWith('test-results/'))
  ac9.pass = ac9.diffDeps === '' && ac9.outOfScope.length === 0
  gitLog.push(`$ git branch --show-current\n${ac9.branch}`)
  gitLog.push(`$ git rev-parse HEAD\n${ac9.head}`)
  gitLog.push(`$ git diff --stat ${BASE_COMMIT}..HEAD -- web/package.json backend/go.mod\n${ac9.diffDeps || '(vacío)'}\n[exit 0]`)
  gitLog.push(`$ git diff --name-only ${BASE_COMMIT}..HEAD\n${ac9.changedFiles.join('\n')}\n[exit 0]`)
  gitLog.push(`archivos fuera de alcance: ${ac9.outOfScope.length ? ac9.outOfScope.join(', ') : '(ninguno)'}`)
  console.log(`  [${ac9.pass ? 'PASS' : 'FAIL'}] ac9 alcance — deps diff vacío=${ac9.diffDeps === ''}, fuera de alcance=${ac9.outOfScope.length}`)

  const ac10 = {}
  const lsRemote = git(`ls-remote --heads origin feat/forms-a11y`)
  ac10.remote = lsRemote.trim()
  ac10.remoteSha = (lsRemote.trim().split(/\s+/)[0] || '(no existe la rama en origin)')
  ac10.head = ac9.head
  ac10.pass = ac10.remoteSha === ac10.head
  gitLog.push(`$ git ls-remote --heads origin feat/forms-a11y\n${ac10.remote || '(sin resultado)'}\n[exit 0]`)
  gitLog.push(`HEAD local = ${ac10.head}`)
  gitLog.push(`coincidencia HEAD==origin/feat/forms-a11y: ${ac10.pass ? 'sí' : 'no'}`)
  gitLog.push(`$ git status --porcelain\n${git('status --porcelain').trim() || '(limpio)'}`)
  fs.writeFileSync(path.join(LOGS, 'git-ac9-ac10.log'), gitLog.join('\n\n') + '\n')
  console.log(`  [${ac10.pass ? 'PASS' : 'FAIL'}] ac10 repositorio — ${ac10.remoteSha.slice(0, 12)}`)
  return { ac8, ac9, ac10 }
}

/* ==========================================================================
 * main
 * ========================================================================== */
async function main() {
  console.log(`forms-audit — ${BASE} | api ${API} | tesseract ${TESSERACT_CHUNK}`)
  let ac7Res = null
  const browser = await chromium.launch({ headless: true, channel: 'chrome' })
  try {
    console.log('\nAC1 — semántica de formularios y envío')
    await ac1(browser)
    console.log('\nAC2 — validación y estado de error')
    await ac2(browser)
    console.log('\nAC3 — errores de API')
    await ac3(browser)
    console.log('\nAC4 — guardia de descarte')
    await ac4(browser)
    console.log('\nAC5 — reglas de subida')
    await ac5(browser)
    console.log('\nAC6 — teclado')
    await ac6(browser)
    console.log('\nAC7 — regresión del gate A')
    ac7Res = await ac7(browser)
  } finally {
    await browser.close()
  }

  console.log('\nAC8/AC9/AC10 — calidad y repositorio')
  const quality = await ac8_ac9_ac10()

  const finishedAt = now()
  const chromeVersion = await (async () => {
    const b = await chromium.launch({ headless: true, channel: 'chrome' })
    const v = b.version()
    await b.close()
    return v
  })()

  const acSummary = (acs) => {
    const cs = results.filter(r => r.ac === acs)
    return { pass: cs.length > 0 && cs.every(c => c.pass), cases: cs.length, failed: cs.filter(c => !c.pass).map(c => c.id), checks: cs.reduce((n, c) => n + c.checks.length, 0) }
  }

  const metrics = {
    meta: {
      started: startedAt,
      finished: finishedAt,
      baseUrl: BASE,
      apiUrl: API,
      chrome: chromeVersion,
      node: process.version,
      playwright: require('/home/miky/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/package.json').version,
      commit: COMMIT,
      tesseractChunk: TESSERACT_CHUNK,
      nota: 'Escrituras de API mockeadas con page.route (red de seguridad 599 HARNESS_BLOCKED_WRITE); backend :18082 solo GETs reales.',
    },
    ac1: { ...acSummary('ac1'), detail: 'nombre accesible por campo, Enter envía inputs / abre Selects, 0 forms en SplitsTab' },
    ac2: { ...acSummary('ac2'), detail: 'errores inline + aria-invalid/aria-describedby (incl. fieldset del calendario y método inválido en #edit-metodo) + resumen role=alert + foco en primer inválido; notas ≤500 y >500 vía OCR' },
    ac3: { ...acSummary('ac3'), detail: '400/409/422/500 por formulario: error inline/resumen, diálogo abierto, datos persistentes, 0 toasts, 0 unhandled' },
    ac4: { ...acSummary('ac4'), detail: 'guardia de descarte en nav SPA, X/Cancelar/Escape; beforeunload fuera de alcance (R4.9)' },
    ac5: { ...acSummary('ac5'), detail: 'PDF/11MB rechazados sin request; nombre/tamaño solo en comprobante; progreso anunciado; post-pago bloqueado (sin re-POST, OCR sin efecto, reintento solo del upload); QR válido con POST mockeado' },
    ac6: { ...acSummary('ac6'), detail: 'flujo completo por teclado, walk de Tab con indicador ≥3:1, trampas de foco, autoguardado por teclado' },
    ac7: ac7Res,
    ac8: quality.ac8,
    ac9: quality.ac9,
    ac10: quality.ac10,
    ac11: { status: 'PENDING', nota: 'Release notes post-release: fuera del BUILD (M4)' },
    ac12: { evidencia: ['report.md', 'metrics-before.json', 'metrics-after.json', 'console-log.json', 'logs/', 'screenshots/', 'harness/forms-audit.cjs'] },
  }
  fs.writeFileSync(path.join(OUT, 'metrics-after.json'), JSON.stringify(metrics, null, 2))
  fs.writeFileSync(path.join(OUT, 'console-log.json'), JSON.stringify({
    nota: 'Consola/failedRequests/unhandledrejection por caso del harness (favicon excluido; respuestas mockeadas marcadas x-harness-mock excluidas).',
    casos: results.map(c => ({ ac: c.ac, id: c.id, theme: c.theme, console: c.console, failedRequests: c.failedRequests, unhandled: c.unhandled, unexpectedWrites: c.unexpectedWrites, mockedNetwork: c.mockedNetwork })),
  }, null, 2))
  fs.writeFileSync(path.join(LOGS, 'matrix.json'), JSON.stringify(results, null, 2))

  // Logs por AC en markdown.
  const byAc = {}
  for (const c of results) (byAc[c.ac] = byAc[c.ac] || []).push(c)
  for (const [ac, cs] of Object.entries(byAc)) {
    const lines = [`# ${ac.toUpperCase()} — casos`, '', '| caso | tema | resultado | checks | detalle de fallos |', '|---|---|---|---|---|']
    for (const c of cs) {
      const failed = c.error ? ['ERROR: ' + c.error] : c.checks.filter(k => !k.pass).map(k => `${k.name} → ${k.detail}`)
      lines.push(`| ${c.id} | ${c.theme} | ${c.pass ? 'PASS' : 'FAIL'} | ${c.checks.length} | ${failed.join('<br>') || '—'} |`)
    }
    lines.push('')
    for (const c of cs) {
      lines.push(`## ${c.id} (${c.theme}, ${c.viewport})`, '')
      for (const k of c.checks) lines.push(`- [${k.pass ? 'x' : ' '}] ${k.name} — ${k.detail}`)
      if (c.console.length) lines.push(`- consola: ${JSON.stringify(c.console)}`)
      if (c.mockedNetwork && c.mockedNetwork.length) lines.push(`- respuestas mockeadas 4xx/5xx (no cuentan como error de consola): ${c.mockedNetwork.length}`)
      if (c.failedRequests.length) lines.push(`- requests fallidos: ${JSON.stringify(c.failedRequests)}`)
      if (c.unhandled.length) lines.push(`- unhandled: ${JSON.stringify(c.unhandled)}`)
      if (c.writes && c.writes.length) lines.push(`- escrituras mockeadas: ${JSON.stringify(c.writes)}`)
      if (c.screenshot) lines.push(`- captura: ${c.screenshot}`)
      lines.push('')
    }
    fs.writeFileSync(path.join(LOGS, ac + '.md'), lines.join('\n'))
  }

  const totalPass = results.every(c => c.pass)
  console.log('\n==== RESUMEN ====')
  for (const ac of ['ac1', 'ac2', 'ac3', 'ac4', 'ac5', 'ac6']) {
    const s = acSummary(ac)
    console.log(`${ac}: ${s.pass ? 'PASS' : 'FAIL'} (${s.cases} casos, ${s.checks} checks)${s.failed.length ? ' — fallos: ' + s.failed.join(', ') : ''}`)
  }
  console.log(`ac7: ${metrics.ac7.pass ? 'PASS' : 'FAIL'} (${metrics.ac7.routeDefaults.length} rutas × tema/viewport + ${metrics.ac7.formStates.length} estados)`)
  console.log(`ac8: ${metrics.ac8.pass ? 'PASS' : 'FAIL'} | ac9: ${metrics.ac9.pass ? 'PASS' : 'FAIL'} | ac10: ${metrics.ac10.pass ? 'PASS' : 'FAIL'}`)
  const globalPass = totalPass && metrics.ac7.pass && metrics.ac8.pass && metrics.ac9.pass && metrics.ac10.pass
  console.log(`TOTAL casos: ${results.length}, todos los casos ${totalPass ? 'PASS' : 'HAY FALLOS'} — veredicto global: ${globalPass ? 'PASS' : 'FAIL (ver AC7)'} — ver test-results/forms-a11y/report.md`)
}

main().catch(e => { console.error('FATAL', e); process.exit(1) })
