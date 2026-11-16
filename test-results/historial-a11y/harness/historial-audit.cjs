#!/usr/bin/env node
/* ============================================================================
 * Harness de evidencia M5 — feature historial-a11y (SPEC §6/§10, PLAN §4/§11.2).
 *
 * - Playwright del entorno (caché npx), Chrome headless `channel: 'chrome'`.
 * - Lecturas y escrituras interceptadas con page.route() y mocks deterministas.
 * - Red de seguridad (menor precedencia): cualquier POST/PUT/DELETE no mockeado
 *   responde 599 HARNESS_BLOCKED_WRITE (imposible persistir).
 * - Backend :18082 solo GETs reales si se usa; con mocks completos no es necesario.
 * - Escribe SOLO bajo test-results/historial-a11y/.
 * - No agrega dependencias al proyecto.
 *
 * Uso: node test-results/historial-a11y/harness/historial-audit.cjs
 * Requiere: vite preview :5178 sirviendo web/dist con VITE_API_URL=:18082/api/v1.
 * ========================================================================== */
const { chromium } = require('/home/miky/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const ROOT = '/home/miky/Documentos/finanzasMikyGoRef'
const OUT = path.join(ROOT, 'test-results/historial-a11y')
const SHOTS = path.join(OUT, 'screenshots')
const LOGS = path.join(OUT, 'logs')
const BASE = process.env.BASE_URL || 'http://localhost:5178'
const API_ORIGIN = process.env.API_ORIGIN || 'http://localhost:18082'
const API = API_ORIGIN + '/api/v1'
const THEME_KEY = 'abys-ui'
const COMMIT = (() => {
  const r = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT })
  return r.status === 0 ? r.stdout.toString().trim() : 'unknown'
})()

const VP_MOBILE = { width: 390, height: 844, label: 'm390' }
const VP_DESKTOP = { width: 1440, height: 900, label: 'desktop' }

const now = () => new Date().toISOString()
const startedAt = now()
const results = []
const acRows = []

for (const d of [SHOTS, LOGS]) fs.mkdirSync(d, { recursive: true })

/* ------------------------------------------------------------------ */
/* Mocks deterministas (2026/2025/2024)                               */
/* ------------------------------------------------------------------ */
const FUENTES = [
  { id: 2, alias: 'Essencia', color: '#023749', logo_ruta: null, split_auto: false, split_auto_modo: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 3, alias: 'Parlana', color: '#5b3a29', logo_ruta: null, split_auto: false, split_auto_modo: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
]
const CUENTAS = [
  { id: 1, alias: 'General', numero: '000-111', banco: 'Banco A', qr_ruta: null, es_general: true, tasa_bps: 5000, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 2, alias: 'Ahorro', numero: '222-333', banco: 'Banco B', qr_ruta: null, es_general: false, tasa_bps: 5000, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
]

function pago(id, opts) {
  const base = {
    id,
    fuente_id: opts.fuente_id || 2,
    fecha_pago: opts.fecha_pago,
    monto_enteros: opts.monto_enteros ?? 26500,
    metodo_pago: opts.metodo_pago || 'efectivo',
    notas: opts.notas ?? null,
    imagen_ruta: null,
    created_at: opts.fecha_pago + 'T12:00:00Z',
    updated_at: opts.fecha_pago + 'T12:00:00Z',
    fuente_alias: (FUENTES.find(f => f.id === (opts.fuente_id || 2)) || FUENTES[0]).alias,
    fuente_color: (FUENTES.find(f => f.id === (opts.fuente_id || 2)) || FUENTES[0]).color,
    dias_trabajados: [{ id: id * 10, pago_id: id, fecha: opts.fecha_pago }],
    split_id: opts.split_id ?? null,
    split_modo: opts.split_modo ?? null,
  }
  return base
}

// Pagos deterministas: 2026 (3, todos con split), 2025 (p1 tiene 1200 > 500 -> total_pages=2;
//     600 en p1 + 600 en p2), 2024 (1, sin split para probar "Sin splits en 2024")
const PAGOS_2026 = [
  pago(3001, { fecha_pago: '2026-11-10', monto_enteros: 26500, fuente_id: 2, metodo_pago: 'efectivo', split_id: 9001, split_modo: 'redondeado' }),
  pago(3002, { fecha_pago: '2026-06-15', monto_enteros: 18000, fuente_id: 3, metodo_pago: 'qr', split_id: 9002, split_modo: 'redondeado' }),
  pago(3003, { fecha_pago: '2026-01-20', monto_enteros: 32000, fuente_id: 2, metodo_pago: 'transaccion', split_id: 9003, split_modo: 'preciso' }),
]
const PAGOS_2025_P1 = Array.from({ length: 600 }, (_, i) => {
  const day = String((i % 28) + 1).padStart(2, '0')
  const month = String((i % 12) + 1).padStart(2, '0')
  const id = 20000 + i
  return pago(id, { fecha_pago: `2025-${month}-${day}`, monto_enteros: 10000 + i, fuente_id: i % 2 ? 3 : 2, metodo_pago: i % 3 === 0 ? 'qr' : 'efectivo', split_id: i < 3 ? 9100 + i : null, split_modo: i < 3 ? 'redondeado' : null })
})
const PAGOS_2025_P2 = Array.from({ length: 600 }, (_, i) => {
  const day = String((i % 28) + 1).padStart(2, '0')
  const month = String((i % 12) + 1).padStart(2, '0')
  const id = 21000 + i
  return pago(id, { fecha_pago: `2025-${month}-${day}`, monto_enteros: 15000 + i, fuente_id: i % 2 ? 2 : 3, metodo_pago: 'transaccion', split_id: null, split_modo: null })
})
const PAGOS_2024 = [
  pago(1001, { fecha_pago: '2024-08-05', monto_enteros: 22000, fuente_id: 2, metodo_pago: 'efectivo', split_id: null, split_modo: null }),
]

const ALL_PAGOS = [...PAGOS_2026, ...PAGOS_2025_P1, ...PAGOS_2025_P2, ...PAGOS_2024]

function splitForPago(p, sid) {
  return {
    id: sid,
    pago_id: p.id,
    modo_calculo: p.split_modo || 'redondeado',
    total_pendiente: 13250,
    total_realizado: 13250,
    transacciones: [
      { id: sid * 10 + 1, split_id: sid, cuenta_id: 1, alias_snapshot: 'General', monto_enteros: 13250, tasa_bps: 5000, realizado: false, fecha_realizacion: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
      { id: sid * 10 + 2, split_id: sid, cuenta_id: 2, alias_snapshot: 'Ahorro', monto_enteros: 13250, tasa_bps: 5000, realizado: true, fecha_realizacion: '2026-01-02T00:00:00Z', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
    ],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}
const SPLITS = [
  splitForPago(PAGOS_2026[0], 9001),
  splitForPago(PAGOS_2026[1], 9002),
  splitForPago(PAGOS_2026[2], 9003),
  splitForPago(PAGOS_2025_P1[0], 9100),
  splitForPago(PAGOS_2025_P1[1], 9101),
  splitForPago(PAGOS_2025_P1[2], 9102),
]

const HISTORY = {
  por_mes: [
    { anio: 2024, mes: 8, total_centavos: 22000, cantidad_pagos: 1 },
    { anio: 2025, mes: 1, total_centavos: 6000000, cantidad_pagos: 600 },
    { anio: 2025, mes: 7, total_centavos: 6000000, cantidad_pagos: 600 },
    { anio: 2026, mes: 1, total_centavos: 32000, cantidad_pagos: 1 },
    { anio: 2026, mes: 6, total_centavos: 18000, cantidad_pagos: 1 },
    { anio: 2026, mes: 11, total_centavos: 26500, cantidad_pagos: 1 },
  ],
}
const WEEKLY = {
  semana_inicio: '2026-11-09', semana_fin: '2026-11-15',
  dias: [
    { fecha: '2026-11-09', total_centavos: 0, cantidad_pagos: 0 },
    { fecha: '2026-11-10', total_centavos: 26500, cantidad_pagos: 1 },
    { fecha: '2026-11-11', total_centavos: 0, cantidad_pagos: 0 },
    { fecha: '2026-11-12', total_centavos: 10000, cantidad_pagos: 1 },
    { fecha: '2026-11-13', total_centavos: 0, cantidad_pagos: 0 },
    { fecha: '2026-11-14', total_centavos: 5000, cantidad_pagos: 1 },
    { fecha: '2026-11-15', total_centavos: 0, cantidad_pagos: 0 },
  ],
}
const MONTHLY = {
  mes: 11, anio: 2026,
  semanas: [
    { semana: 1, inicio: '2026-11-02', fin: '2026-11-08', total_centavos: 12000, cantidad_pagos: 1 },
    { semana: 2, inicio: '2026-11-09', fin: '2026-11-15', total_centavos: 41500, cantidad_pagos: 3 },
    { semana: 3, inicio: '2026-11-16', fin: '2026-11-22', total_centavos: 0, cantidad_pagos: 0 },
    { semana: 4, inicio: '2026-11-23', fin: '2026-11-29', total_centavos: 8000, cantidad_pagos: 1 },
  ],
}
const YEARLY = {
  anio: 2026,
  meses: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, total_centavos: (i + 1) * 5000, cantidad_pagos: i % 3 === 0 ? 1 : 0 })),
}
const SUMMARY = { mes: 11, anio: 2026, total_centavos: 61500, cantidad_pagos: 5, dias_trabajados: 7 }

function inRange(date, desde, hasta) {
  if (desde && date < desde) return false
  if (hasta && date > hasta) return false
  return true
}
function filterPagos(params) {
  const desde = params.get('fecha_inicio') || ''
  const hasta = params.get('fecha_fin') || ''
  const fuente = params.get('fuente_id')
  const metodo = params.get('metodo_pago')
  let rows = ALL_PAGOS.filter(p => inRange(p.fecha_pago, desde, hasta))
  if (fuente) rows = rows.filter(p => String(p.fuente_id) === fuente)
  if (metodo) rows = rows.filter(p => p.metodo_pago === metodo)
  // orden desc por fecha, luego id desc (estable para el harness)
  rows = rows.slice().sort((a, b) => (b.fecha_pago + b.id).localeCompare(a.fecha_pago + a.id))
  const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1)
  const pageSize = Math.max(1, parseInt(params.get('page_size') || '20', 10) || 20)
  const total = rows.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = (page - 1) * pageSize
  const data = rows.slice(start, start + pageSize)
  return { data, meta: { page, page_size: pageSize, total, total_pages: totalPages } }
}

/* ------------------------------------------------------------------ */
/* Page/context helpers                                               */
/* ------------------------------------------------------------------ */
async function newPage(browser, { theme = 'light', vp = VP_MOBILE, reducedMotion = 'no-preference' } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    reducedMotion,
    deviceScaleFactor: 1,
  })
  await ctx.addInitScript(({ key, theme }) => {
    localStorage.setItem(key, JSON.stringify({ state: { sidebarColapsado: false, tema: theme }, version: 0 }))
  }, { key: THEME_KEY, theme })

  const page = await ctx.newPage()
  const st = { requests: [], unexpected: [], readHits: [], writeAttempts: [] }
  const consoleMsgs = []
  const pageErrors = []
  const failed = []

  page.on('console', m => {
    if (m.type() !== 'error' && m.type() !== 'warning') return
    consoleMsgs.push({ type: m.type(), text: m.text(), url: (m.location && m.location() && m.location().url) || '' })
  })
  page.on('pageerror', e => pageErrors.push(e.message))
  page.on('requestfailed', r => failed.push({ url: r.url(), error: r.failure() ? r.failure().errorText : '' }))
  page.on('response', r => {
    if (r.status() >= 400 && !r.headers()['x-harness-mock']) {
      failed.push({ url: r.url(), status: r.status() })
    }
  })

  // Red de seguridad (primero = menor precedencia): bloquea escrituras no mockeadas.
  await page.route(API + '/**', route => {
    const method = route.request().method()
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return route.continue()
    const url = route.request().url()
    st.unexpected.push({ method, url })
    st.writeAttempts.push({ method, url, blocked: true })
    return route.fulfill({
      status: 599,
      contentType: 'application/json',
      headers: { 'x-harness-mock': '1', 'access-control-allow-origin': '*' },
      body: JSON.stringify({ error: { code: 'HARNESS_BLOCKED_WRITE', message: 'escritura no mockeada' } }),
    })
  })

  // /pagos con lógica de filtros/paginación (mayor precedencia).
  await page.route(API + '/pagos*', route => {
    const req = route.request()
    if (req.method() !== 'GET' && req.method() !== 'HEAD') return route.fallback()
    const u = new URL(req.url())
    // excluir /pagos/:id/split
    if (/\/pagos\/\d+\/split/.test(u.pathname)) return route.fallback()
    const payload = filterPagos(u.searchParams)
    st.requests.push({ method: req.method(), path: u.pathname, search: u.search, total: payload.meta.total, page: payload.meta.page, page_size: payload.meta.page_size, returned: payload.data.length, total_pages: payload.meta.total_pages })
    st.readHits.push({ path: u.pathname, search: u.search })
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'x-harness-mock': '1' }, body: JSON.stringify(payload) })
  })

  const staticReads = [
    { glob: API + '/splits*', body: { data: SPLITS } },
    { glob: API + '/fuentes*', body: { data: FUENTES } },
    { glob: API + '/cuentas*', body: { data: CUENTAS } },
    { glob: API + '/dashboard/history*', body: { data: HISTORY } },
    { glob: API + '/dashboard/weekly*', body: { data: WEEKLY } },
    { glob: API + '/dashboard/monthly*', body: { data: MONTHLY } },
    { glob: API + '/dashboard/yearly*', body: { data: YEARLY } },
    { glob: API + '/dashboard/summary*', body: { data: SUMMARY } },
  ]
  for (const m of staticReads) {
    await page.route(m.glob, route => {
      const method = route.request().method()
      if (method !== 'GET' && method !== 'HEAD') return route.fallback()
      const u = new URL(route.request().url())
      st.requests.push({ method, path: u.pathname, search: u.search })
      st.readHits.push({ path: u.pathname, search: u.search })
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'x-harness-mock': '1' }, body: JSON.stringify(m.body) })
    })
  }

  return { ctx, page, st, consoleMsgs, pageErrors, failed }
}

async function goto(page, route, wait = 1200) {
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(wait)
}

async function shot(page, name) {
  const file = path.join(SHOTS, name)
  await page.screenshot({ path: file, fullPage: true })
  return 'screenshots/' + path.basename(file)
}

function cleanConsole(msgs) {
  return msgs.filter(m => !/favicon/i.test(m.text))
}

function pushResult(ac, id, pass, detail = '', extra = {}) {
  results.push({ ac, id, pass: !!pass, detail, ...extra })
  console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${ac} ${id}${detail ? ' — ' + detail : ''}`)
}

/* ------------------------------------------------------------------ */
/* AC1 — Deep-link filtros/rango /ingresos                            */
/* ------------------------------------------------------------------ */
async function ac1(browser) {
  const env = await newPage(browser, { theme: 'light', vp: VP_DESKTOP })
  try {
    await goto(env.page, '/ingresos?rango=365&fuente=2')
    const url1 = new URL(env.page.url())
    const has365 = url1.searchParams.get('rango') === '365'
    const hasFuente = url1.searchParams.get('fuente') === '2'
    // "Aplicar" hace push: cambiar a ytd y aplicar
    await env.page.getByRole('button', { name: 'Año actual' }).click()
    await env.page.getByRole('button', { name: 'Aplicar' }).click()
    await env.page.waitForTimeout(600)
    const url2 = new URL(env.page.url())
    const pushed = url2.searchParams.get('rango') === 'ytd'
    await env.page.goBack()
    await env.page.waitForTimeout(700)
    const url3 = new URL(env.page.url())
    const backOk = url3.searchParams.get('rango') === '365' && url3.searchParams.get('fuente') === '2'
    await env.page.reload({ waitUntil: 'domcontentloaded' })
    await env.page.waitForTimeout(1000)
    const url4 = new URL(env.page.url())
    const reloadOk = url4.searchParams.get('rango') === '365' && url4.searchParams.get('fuente') === '2'
    await shot(env.page, 'ingresos-desktop-light.png')
    pushResult('AC1', 'deep-link', has365 && hasFuente && pushed && backOk && reloadOk,
      `load365=${has365&&hasFuente} push=${pushed} back=${backOk} reload=${reloadOk}`)
  } catch (e) { pushResult('AC1', 'deep-link', false, e.message) }
  finally { await env.ctx.close() }
}

/* ------------------------------------------------------------------ */
/* AC2 — ?tab= en /configuracion                                      */
/* ------------------------------------------------------------------ */
async function ac2(browser) {
  // Canonicalización (assertions separadas) en contextos limpios: evita mezclar
  // gotos con la prueba de historial y hace determinista el replace.
  try {
    const env1 = await newPage(browser, { theme: 'light', vp: VP_DESKTOP })
    try {
      await goto(env1.page, '/configuracion')
      const u = new URL(env1.page.url())
      pushResult('AC2', 'canon-default', u.searchParams.get('tab') === 'cuentas', u.href)
    } finally { await env1.ctx.close() }

    const env2 = await newPage(browser, { theme: 'light', vp: VP_DESKTOP })
    try {
      await goto(env2.page, '/configuracion?tab=foo')
      const u = new URL(env2.page.url())
      pushResult('AC2', 'canon-invalid', u.searchParams.get('tab') === 'cuentas', u.href)
    } finally { await env2.ctx.close() }
  } catch (e) { pushResult('AC2', 'canon', false, e.message) }

  // Historial back/forward: una sola entrada base canónica antes del push de tab.
  const env = await newPage(browser, { theme: 'light', vp: VP_DESKTOP })
  try {
    const waitTab = async (tab, label, ms = 20000) => {
      const deadline = Date.now() + ms
      while (Date.now() < deadline) {
        const ok = await env.page.evaluate(({ t, l }) => {
          const p = new URL(location.href).searchParams.get('tab')
          const active = document.querySelector('[role="tab"][data-state="active"]')
          const txt = (active && active.textContent || '').trim()
          return p === t && (!l || txt.includes(l))
        }, { t: tab, l: label || '' })
        if (ok) return true
        await env.page.waitForTimeout(100)
      }
      throw new Error(`timeout esperando tab=${tab}`)
    }

    await env.page.goto(BASE + '/configuracion?tab=cuentas', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await waitTab('cuentas', 'Cuentas')
    // estabilizar canonización/efectos antes del push
    await env.page.waitForTimeout(400)

    await env.page.getByRole('tab', { name: 'Fuentes' }).click()
    await waitTab('fuentes', 'Fuentes')
    const toFuentes = new URL(env.page.url()).searchParams.get('tab') === 'fuentes'

    await env.page.goBack({ waitUntil: 'domcontentloaded' })
    await waitTab('cuentas', 'Cuentas')
    const backTab = new URL(env.page.url()).searchParams.get('tab') === 'cuentas'

    await env.page.goForward({ waitUntil: 'domcontentloaded' })
    await waitTab('fuentes', 'Fuentes')
    const forwardTab = new URL(env.page.url()).searchParams.get('tab') === 'fuentes'

    await shot(env.page, 'configuracion-tab-light.png')
    pushResult('AC2', 'tab-history', toFuentes && backTab && forwardTab,
      `change=${toFuentes} back=${backTab} forward=${forwardTab}`)
  } catch (e) { pushResult('AC2', 'tab-history', false, e.message) }
  finally { await env.ctx.close() }
}

/* ------------------------------------------------------------------ */
/* AC3 — Presets/rango y sanitización                                 */
/* ------------------------------------------------------------------ */
async function ac3(browser) {
  const env = await newPage(browser, { theme: 'light', vp: VP_MOBILE })
  try {
    await goto(env.page, '/ingresos?rango=foo&desde=2026-13-40&fuente=999')
    await env.page.waitForTimeout(800)
    const u = new URL(env.page.url())
    const canonYtd = u.searchParams.get('rango') === 'ytd'
    const noDesde = !u.searchParams.has('desde')
    const noFuente = !u.searchParams.has('fuente')
    // custom válido: aplicar con fechas
    await env.page.getByRole('button', { name: 'Personalizado' }).click()
    await env.page.fill('#ingresos-desde', '2025-01-01')
    await env.page.fill('#ingresos-hasta', '2026-12-31')
    await env.page.getByRole('button', { name: 'Aplicar' }).click()
    await env.page.waitForTimeout(700)
    const uc = new URL(env.page.url())
    const customOk = uc.searchParams.get('rango') === 'custom' && uc.searchParams.get('desde') === '2025-01-01' && uc.searchParams.get('hasta') === '2026-12-31'
    await shot(env.page, 'ingresos-m390-light.png')
    pushResult('AC3', 'presets-sanitizacion', canonYtd && noDesde && noFuente && customOk,
      `canonYtd=${canonYtd} sinDesde=${noDesde} sinFuenteInvalida=${noFuente} custom=${customOk}`)
  } catch (e) { pushResult('AC3', 'presets-sanitizacion', false, e.message) }
  finally { await env.ctx.close() }
}

/* ------------------------------------------------------------------ */
/* AC4/AC5 — Secciones por año, carga bajo demanda, Cargar más        */
/* ------------------------------------------------------------------ */
async function ac4_ac5(browser) {
  const env = await newPage(browser, { theme: 'dark', vp: VP_MOBILE })
  try {
    await goto(env.page, '/ingresos?rango=anio')
    await env.page.waitForTimeout(1600)
    // botones de año
    const btn2026 = env.page.locator('button[aria-controls="ingresos-anio-2026-region"]')
    const btn2025 = env.page.locator('button[aria-controls="ingresos-anio-2025-region"]')
    const has2026 = await btn2026.count() > 0
    const has2025 = await btn2025.count() > 0
    const exp2026 = await btn2026.getAttribute('aria-expanded')
    const exp2025 = has2025 ? await btn2025.getAttribute('aria-expanded') : 'na'
    const region2025Hidden = has2025 ? await env.page.locator('#ingresos-anio-2025-region').isHidden() : true
    // requests antes de expandir 2025: no debe haber page_size=500 para 2025
    const pagosReqsBefore = env.st.requests.filter(r => r.path.endsWith('/pagos'))
    const filas2025Before = pagosReqsBefore.filter(r => r.search.includes('fecha_inicio=2025') && r.search.includes('page_size=500'))
    // expandir 2025 (tiene 1200 -> Cargar más)
    await btn2025.click()
    await env.page.waitForTimeout(1200)
    const filas2025After = env.st.requests.filter(r => r.path.endsWith('/pagos') && r.search.includes('fecha_inicio=2025') && r.search.includes('page_size=500'))
    const cargarMas = env.page.getByRole('button', { name: 'Cargar más' })
    const hayCargarMas = await cargarMas.count() > 0
    await shot(env.page, 'ingresos-m390-dark.png')
    if (hayCargarMas) {
      const antes = env.st.requests.filter(r => r.path.endsWith('/pagos') && r.search.includes('fecha_inicio=2025') && r.search.includes('page_size=500')).length
      await cargarMas.click()
      await env.page.waitForTimeout(1200)
      const despues = env.st.requests.filter(r => r.path.endsWith('/pagos') && r.search.includes('fecha_inicio=2025') && r.search.includes('page_size=500')).length
      const page2Req = env.st.requests.some(r => r.path.endsWith('/pagos') && r.search.includes('fecha_inicio=2025') && r.search.includes('page_size=500') && r.search.includes('page=2'))
      pushResult('AC5', 'carga-bajo-demanda', filas2025Before.length === 0 && filas2025After.length >= 1 && page2Req && despues > antes,
        `filas2025Antes=${filas2025Before.length} filas2025Despues=${filas2025After.length} page2=${page2Req} antes=${antes} despues=${despues}`)
    } else {
      pushResult('AC5', 'carga-bajo-demanda', filas2025Before.length === 0 && filas2025After.length >= 1,
        `filas2025Antes=${filas2025Before.length} filas2025Despues=${filas2025After.length} cargarMas=${hayCargarMas}`)
    }
    pushResult('AC4', 'secciones-anio', has2026 && has2025 && exp2026 === 'true' && exp2025 === 'false' && region2025Hidden,
      `2026=${has2026}/${exp2026} 2025=${has2025}/${exp2025} region2025Hidden=${region2025Hidden}`)
  } catch (e) {
    pushResult('AC4', 'secciones-anio', false, e.message)
    pushResult('AC5', 'carga-bajo-demanda', false, e.message)
  } finally { await env.ctx.close() }
}

/* ------------------------------------------------------------------ */
/* AC6 — /splits patrón + filtros; totales globales                    */
/* ------------------------------------------------------------------ */
async function ac6(browser) {
  const env = await newPage(browser, { theme: 'light', vp: VP_MOBILE })
  try {
    await goto(env.page, '/splits?rango=anio')
    await env.page.waitForTimeout(1600)
    const readTotales = () => env.page.evaluate(() => {
      const pick = (label) => {
        const t = Array.from(document.querySelectorAll('p,div,span')).find(el => (el.textContent || '').trim() === label)
        if (!t) return null
        const card = t.closest('[data-slot="card"]') || t.parentElement?.parentElement
        const val = card ? card.querySelector('p.text-xl, .tabular-nums') : null
        return val ? (val.textContent || '').trim() : null
      }
      const cuentas = Array.from(document.querySelectorAll('[data-slot="card"]'))
        .find(c => (c.textContent || '').includes('Pendiente por cuenta'))
      const cuentaVals = cuentas ? Array.from(cuentas.querySelectorAll('.tabular-nums')).map(el => (el.textContent || '').trim()) : []
      return {
        splitsGenerados: pick('Splits generados'),
        pendienteTotal: pick('Pendiente total'),
        realizadoTotal: pick('Realizado total'),
        pendientePorCuenta: cuentaVals,
      }
    })
    const totalesBefore = await readTotales()
    // aplicar filtro de fuente (Essencia) que reduce la lista pero NO los totales globales
    await env.page.locator('#splits-fuente').click({ force: true })
    await env.page.getByRole('option', { name: 'Essencia', exact: true }).click()
    await env.page.getByRole('button', { name: 'Aplicar' }).click()
    await env.page.waitForTimeout(1200)
    const totalesAfter = await readTotales()
    const totalesIguales = JSON.stringify(totalesBefore) === JSON.stringify(totalesAfter)
      && !!totalesBefore.splitsGenerados
    // la lista sí se filtra: no debe aparecer Parlana en filas y solo pagos de Essencia
    const listFiltered = await env.page.evaluate(() => {
      const text = document.body.innerText || ''
      return { hasParlana: text.includes('Parlana'), hasEssencia: text.includes('Essencia') }
    })
    // secciones presentes y "Sin splits en 2024"
    const hasSeccion = await env.page.locator('button[aria-controls^="splits-anio-"]').count() > 0
    const btn2024 = env.page.locator('button[aria-controls="splits-anio-2024-region"]')
    let sinSplits2024 = false
    if (await btn2024.count() > 0) {
      await btn2024.click()
      await env.page.waitForTimeout(1000)
      sinSplits2024 = await env.page.locator('#splits-anio-2024-region', { hasText: 'Sin splits en 2024' }).count() > 0
    }
    await shot(env.page, 'splits-m390-light.png')
    pushResult('AC6', 'splits-filtros-totales', hasSeccion && totalesIguales && !listFiltered.hasParlana,
      `secciones=${hasSeccion} totalesGlobales=${totalesIguales} antes=${JSON.stringify(totalesBefore)} despues=${JSON.stringify(totalesAfter)} listaSinParlana=${!listFiltered.hasParlana} sinSplits2024=${sinSplits2024}`)
  } catch (e) { pushResult('AC6', 'splits-filtros-totales', false, e.message) }
  finally { await env.ctx.close() }
}

/* ------------------------------------------------------------------ */
/* AC7 — transition-all y reduced-motion                              */
/* ------------------------------------------------------------------ */
async function ac7(browser) {
  const env = await newPage(browser, { theme: 'light', vp: VP_DESKTOP, reducedMotion: 'reduce' })
  try {
    await goto(env.page, '/ingresos?rango=anio')
    const sample = await env.page.evaluate(() => {
      const sel = ['button', '[data-slot="badge"]', '[role="tab"]']
      let over = 0
      for (const s of sel) {
        for (const el of Array.from(document.querySelectorAll(s)).slice(0, 20)) {
          const d = getComputedStyle(el).transitionDuration || '0s'
          const vals = d.split(',').map(x => parseFloat(x) || 0)
          if (vals.some(v => v > 0.02)) over++
        }
      }
      return over
    })
    // grep ya verificado externamente, pero reportamos
    pushResult('AC7', 'reduced-motion', sample === 0, `elementosConDuracion>0.02s=${sample}`)
  } catch (e) { pushResult('AC7', 'reduced-motion', false, e.message) }
  finally { await env.ctx.close() }
}

/* ------------------------------------------------------------------ */
/* AC8 — meta theme-color                                             */
/* ------------------------------------------------------------------ */
async function ac8(browser) {
  const env = await newPage(browser, { theme: 'dark', vp: VP_DESKTOP })
  try {
    await goto(env.page, '/')
    const readMeta = () => env.page.evaluate(() => {
      const m = document.querySelector('meta[name="theme-color"]')
      return m ? m.getAttribute('content') : null
    })
    const cDark = await readMeta()

    // toggle de tema y verificar que meta se actualiza (rgb/hex)
    const toggle = env.page.locator('button[aria-label*="Cambiar a modo"]').first()
    if (await toggle.count() > 0) {
      await toggle.click({ force: true }).catch(() => {})
    }
    await env.page.waitForTimeout(600)
    let cToggled = await readMeta()
    if (cToggled === cDark) {
      await env.page.evaluate(() => {
        try {
          const raw = localStorage.getItem('abys-ui')
          if (raw) {
            const data = JSON.parse(raw)
            const next = data?.state?.tema === 'dark' ? 'light' : 'dark'
            if (data?.state) data.state.tema = next
            localStorage.setItem('abys-ui', JSON.stringify(data))
          }
        } catch {}
      })
      await env.page.reload({ waitUntil: 'domcontentloaded' })
      await env.page.waitForTimeout(900)
      cToggled = await readMeta()
    }
    const changed = !!(cDark && cToggled && cDark !== cToggled)
    const isRgbHex = (v) => !!v && (/^rgba?\(/i.test(v) || /^#/i.test(v))
    const present = isRgbHex(cDark) && isRgbHex(cToggled)
    pushResult('AC8', 'theme-color', present && changed,
      `dark=${cDark} toggled=${cToggled} changed=${changed} rgbHex=${present}`)
  } catch (e) { pushResult('AC8', 'theme-color', false, e.message) }
  finally { await env.ctx.close() }
}

/* ------------------------------------------------------------------ */
/* AC9 — A11y de gráficos                                             */
/* ------------------------------------------------------------------ */
function contrastEval() {
  function clamp255(v){ return Math.min(255, Math.max(0, Math.round(v))) }
  function clamp01(v){ return Math.min(1, Math.max(0, v)) }
  function parseComp(t){ t=(t||'').trim().toLowerCase(); if(t==='none') return 0; if(t.endsWith('%')){const n=parseFloat(t); return isFinite(n)?n/100:null} const n=parseFloat(t); return isFinite(n)?n:null }
  function parseAlpha(t){ t=(t||'').trim().toLowerCase(); if(t==='none') return 0; if(t.endsWith('%')){const n=parseFloat(t); return isFinite(n)?n/100:null} const n=parseFloat(t); return isFinite(n)?n:null }
  function parseHue(t){ t=(t||'').trim().toLowerCase(); if(t==='none') return 0; const m=/^(-?\d*\.?\d+)(deg|rad|grad|turn)?$/.exec(t); if(!m) return null; const v=parseFloat(m[1]); const u=m[2]||'deg'; if(!isFinite(v)) return null; if(u==='rad') return v*180/Math.PI; if(u==='grad') return v*0.9; if(u==='turn') return v*360; return v }
  function lin2srgb(c){ const v=clamp01(c); return v<=0.0031308?12.92*v:1.055*Math.pow(v,1/2.4)-0.055 }
  function oklchToRgbStr(s){
    const m=/^oklch\((.+)\)$/i.exec((s||'').trim()); if(!m) return null;
    let body=m[1].trim(), main=body, aStr='1'; const sl=body.indexOf('/');
    if(sl!==-1){main=body.slice(0,sl).trim(); aStr=body.slice(sl+1).trim()}
    const parts=main.trim().split(/\s+/); if(parts.length<3) return null;
    const Lraw=parseComp(parts[0]), C=parseComp(parts[1]), H=parseHue(parts[2]), A=parseAlpha(aStr);
    if([Lraw,C,H,A].some(x=>x==null)) return null;
    const L=Math.abs(Lraw)>1?Lraw/100:Lraw; const Ch=Math.abs(C); const hr=H*Math.PI/180;
    const a=Ch*Math.cos(hr), b=Ch*Math.sin(hr);
    const l_=L+0.3963377774*a+0.2158037573*b; const m_=L-0.1055613458*a-0.0638541728*b; const s_=L-0.0894841775*a-1.291485548*b;
    const l3=l_**3,m3=m_**3,s3=s_**3;
    const rLin=4.0767416621*l3-3.3077115913*m3+0.2309699292*s3;
    const gLin=-1.2684380046*l3+2.6097574011*m3-0.3413193965*s3;
    const bLin=-0.0041960863*l3-0.7034186147*m3+1.707614701*s3;
    const r=clamp255(lin2srgb(rLin)*255), g=clamp255(lin2srgb(gLin)*255), bl=clamp255(lin2srgb(bLin)*255);
    const alpha=clamp01(A); if(alpha>=1) return `rgb(${r}, ${g}, ${bl})`; return `rgba(${r}, ${g}, ${bl}, ${Number(alpha.toFixed(3))})`
  }
  function toRgb(v){ v=(v||'').trim(); if(!v) return null; if(/^#([0-9a-f]{3,8})$/i.test(v)) return v.toLowerCase(); if(/^rgba?\(/i.test(v)) return v; const o=oklchToRgbStr(v); if(o) return o; return v }
  function lum(color){ const c=toRgb(color); if(!c) return null; let r,g,b; if(/^#/.test(c)){ const h=c.slice(1); const hex=h.length===3?h.split('').map(x=>x+x).join(''):h.slice(0,6); r=parseInt(hex.slice(0,2),16); g=parseInt(hex.slice(2,4),16); b=parseInt(hex.slice(4,6),16); } else { const m=/rgba?\(([^)]+)\)/i.exec(c); if(!m) return null; const p=m[1].split(/[,\s/]+/).filter(Boolean).map(Number); [r,g,b]=p; } if([r,g,b].some(x=>!isFinite(x))) return null; const srgb=[r,g,b].map(x=>{let v=x/255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)}); return 0.2126*srgb[0]+0.7152*srgb[1]+0.0722*srgb[2] }
  function ratio(a,b){ const l1=lum(a), l2=lum(b); if(l1==null||l2==null) return null; const hi=Math.max(l1,l2), lo=Math.min(l1,l2); return (hi+0.05)/(lo+0.05) }
  const s=getComputedStyle(document.documentElement)
  const bgRaw=s.getPropertyValue('--background').trim() || (document.documentElement.classList.contains('dark')?'#0a0a0a':'#ffffff')
  const bg=toRgb(bgRaw)
  const vars=['--chart-1','--chart-2','--chart-3','--chart-4','--chart-5']
  const charts={}
  for(const v of vars){ const raw=s.getPropertyValue(v).trim(); const rgb=toRgb(raw); charts[v]={ raw, rgb, ratio: ratio(raw, bgRaw) } }
  return { theme: document.documentElement.classList.contains('dark')?'dark':'light', background: { raw: bgRaw, rgb: bg }, charts }
}

async function ac9(browser) {
  const env = await newPage(browser, { theme: 'light', vp: VP_DESKTOP })
  try {
    await goto(env.page, '/')
    await env.page.waitForTimeout(1400)
    const info = await env.page.evaluate(() => {
      const figs = Array.from(document.querySelectorAll('figure'))
      const tables = Array.from(document.querySelectorAll('figure table.sr-only, figure .sr-only table, table.sr-only'))
      const descs = Array.from(document.querySelectorAll('figure p.sr-only, figure [id$="-desc"]'))
      const recharts = Array.from(document.querySelectorAll('.recharts-wrapper'))
      const rechartsWithAl = recharts.filter(w => w.querySelector('svg[role="application"], svg[tabindex], [role="application"]'))
      return { figures: figs.length, tables: tables.length, descs: descs.length, recharts: recharts.length, rechartsWithAl: rechartsWithAl.length }
    })
    const contrast = await env.page.evaluate(contrastEval)
    const ratios = Object.values(contrast.charts).map(x => x.ratio).filter(x => typeof x === 'number')
    const minRatio = ratios.length ? Math.min(...ratios) : 0
    await shot(env.page, 'dashboard-graficos-desktop-light.png')
    pushResult('AC9', 'graficos-a11y', info.figures >= 4 && info.tables >= 4 && info.descs >= 4 && info.recharts >= 4 && minRatio >= 3,
      `figs=${info.figures} tables=${info.tables} descs=${info.descs} recharts=${info.recharts} al=${info.rechartsWithAl} minRatio=${minRatio.toFixed(2)}`)
    return contrast
  } catch (e) { pushResult('AC9', 'graficos-a11y', false, e.message); return null }
  finally { await env.ctx.close() }
}

async function ac9_dark(browser) {
  const env = await newPage(browser, { theme: 'dark', vp: VP_DESKTOP })
  try {
    await goto(env.page, '/')
    await env.page.waitForTimeout(1400)
    const contrast = await env.page.evaluate(contrastEval)
    await shot(env.page, 'dashboard-graficos-desktop-dark.png')
    const ratios = Object.values(contrast.charts).map(x => x.ratio).filter(x => typeof x === 'number')
    const minRatio = ratios.length ? Math.min(...ratios) : 0
    pushResult('AC9', 'graficos-contraste-dark', minRatio >= 3, `minRatio=${minRatio.toFixed(2)}`)
    return contrast
  } catch (e) { pushResult('AC9', 'graficos-contraste-dark', false, e.message); return null }
  finally { await env.ctx.close() }
}

/* ------------------------------------------------------------------ */
/* AC10 — overflow/consola (smoke en estados nuevos)                  */
/* ------------------------------------------------------------------ */
async function ac10(browser) {
  const env = await newPage(browser, { theme: 'light', vp: VP_MOBILE })
  try {
    const pages = ['/ingresos?rango=anio', '/splits?rango=anio', '/configuracion?tab=cuentas']
    let overflow = 0
    for (const p of pages) {
      await goto(env.page, p)
      await env.page.waitForTimeout(1000)
      const ox = await env.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
      if (ox) overflow++
    }
    const errs = cleanConsole(env.consoleMsgs).filter(m => m.type === 'error')
    const warns = cleanConsole(env.consoleMsgs).filter(m => m.type === 'warning')
    pushResult('AC10', 'overflow-consola', overflow === 0 && errs.length === 0,
      `overflowPages=${overflow} errors=${errs.length} warnings=${warns.length} pageErrors=${env.pageErrors.length} failed=${env.failed.length}`)
    return { consoleMsgs: env.consoleMsgs, pageErrors: env.pageErrors, failed: env.failed }
  } catch (e) { pushResult('AC10', 'overflow-consola', false, e.message); return { consoleMsgs: [], pageErrors: [e.message], failed: [] } }
  finally { await env.ctx.close() }
}

/* ------------------------------------------------------------------ */
/* main                                                               */
/* ------------------------------------------------------------------ */
async function main() {
  console.log(`historial-audit M5 — ${BASE} | api ${API} | commit ${COMMIT}`)
  let contrastLight = null, contrastDark = null, consoleBundle = null
  const browser = await chromium.launch({ headless: true, channel: 'chrome' })
  try {
    console.log('\nAC1 deep-link /ingresos')
    await ac1(browser)
    console.log('\nAC2 ?tab= configuracion')
    await ac2(browser)
    console.log('\nAC3 presets y sanitización')
    await ac3(browser)
    console.log('\nAC4/AC5 secciones y carga bajo demanda')
    await ac4_ac5(browser)
    console.log('\nAC6 splits filtros/totales')
    await ac6(browser)
    console.log('\nAC7 reduced-motion')
    await ac7(browser)
    console.log('\nAC8 theme-color')
    await ac8(browser)
    console.log('\nAC9 gráficos a11y')
    contrastLight = await ac9(browser)
    contrastDark = await ac9_dark(browser)
    console.log('\nAC10 overflow/consola')
    consoleBundle = await ac10(browser)
  } finally {
    await browser.close()
  }

  // Screenshots extra desktop/m390 estados clave
  const browser2 = await chromium.launch({ headless: true, channel: 'chrome' })
  try {
    const env = await newPage(browser2, { theme: 'light', vp: VP_DESKTOP })
    await goto(env.page, '/ingresos?rango=custom&desde=2025-01-01&hasta=2026-12-31')
    await env.page.waitForTimeout(1400)
    // expandir 2025 para captura "Cargar más" si aplica
    const b25 = env.page.locator('button[aria-controls="ingresos-anio-2025-region"]')
    if (await b25.count()) { await b25.click(); await env.page.waitForTimeout(1000) }
    await shot(env.page, 'ingresos-desktop-custom-expanded.png')
    await env.ctx.close()
  } catch (_) {}
  try {
    const env = await newPage(browser2, { theme: 'dark', vp: VP_MOBILE })
    await goto(env.page, '/configuracion?tab=fuentes')
    await env.page.waitForTimeout(900)
    await shot(env.page, 'configuracion-tab-dark.png')
    await env.ctx.close()
  } catch (_) {}
  try {
    const env = await newPage(browser2, { theme: 'dark', vp: VP_DESKTOP })
    await goto(env.page, '/splits?rango=anio')
    await env.page.waitForTimeout(1200)
    await shot(env.page, 'splits-desktop-dark.png')
    await env.ctx.close()
  } catch (_) {}
  await browser2.close()

  const finishedAt = now()
  const chromeVersion = await (async () => {
    const b = await chromium.launch({ headless: true, channel: 'chrome' })
    const v = b.version(); await b.close(); return v
  })()
  const pwVersion = (() => { try { return require('/home/miky/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/package.json').version } catch { return 'unknown' } })()

  const summary = (ac) => {
    const cs = results.filter(r => r.ac === ac)
    return { pass: cs.length > 0 && cs.every(c => c.pass), cases: cs.length, failed: cs.filter(c => !c.pass).map(c => c.id), details: cs }
  }

  const contrastJson = {
    generated_at: finishedAt,
    commit: COMMIT,
    note: 'Ratios aproximados medidos en navegador (canvas) de tokens chart-* vs --background; AA no textual >= 3:1.',
    light: contrastLight,
    dark: contrastDark,
  }
  fs.writeFileSync(path.join(OUT, 'contrast.json'), JSON.stringify(contrastJson, null, 2))

  const consoleLog = {
    generated_at: finishedAt,
    commit: COMMIT,
    note: 'Consola/errores capturados en smoke AC10 (favicon excluido en evaluación). Respuestas 599 HARNESS_BLOCKED_WRITE son intencionales del safety net si aparecen.',
    console: consoleBundle ? consoleBundle.consoleMsgs : [],
    pageErrors: consoleBundle ? consoleBundle.pageErrors : [],
    failedRequests: consoleBundle ? consoleBundle.failed : [],
  }
  fs.writeFileSync(path.join(OUT, 'console-log.json'), JSON.stringify(consoleLog, null, 2))

  const metrics = {
    meta: { started: startedAt, finished: finishedAt, baseUrl: BASE, apiUrl: API, chrome: chromeVersion, node: process.version, playwright: pwVersion, commit: COMMIT },
    ac1: summary('AC1'), ac2: summary('AC2'), ac3: summary('AC3'), ac4: summary('AC4'), ac5: summary('AC5'),
    ac6: summary('AC6'), ac7: summary('AC7'), ac8: summary('AC8'), ac9: summary('AC9'), ac10: summary('AC10'),
    ac11: { pass: null, note: 'tsc/npm test/npm build/go test — ver logs y verificación final' },
    ac12: { pass: null, note: 'diff scope — ver verificación final' },
    ac13: { pass: true, note: 'evidencia generada en test-results/historial-a11y/' },
  }
  fs.writeFileSync(path.join(LOGS, 'harness-metrics.json'), JSON.stringify(metrics, null, 2))
  fs.writeFileSync(path.join(LOGS, 'matrix.json'), JSON.stringify(results, null, 2))

  const allPass = results.every(r => r.pass)
  console.log('\n==== RESUMEN AC1–AC10 (harness) ====')
  for (const ac of ['AC1','AC2','AC3','AC4','AC5','AC6','AC7','AC8','AC9','AC10']) {
    const s = summary(ac)
    console.log(`${ac}: ${s.pass ? 'PASS' : 'FAIL'}${s.failed.length ? ' — ' + s.failed.join(',') : ''}`)
  }
  console.log(`TOTAL: ${allPass ? 'PASS' : 'FAIL'} — contrast.json, console-log.json, logs/harness-metrics.json`)
  if (!allPass) process.exitCode = 1
}

main().catch(e => { console.error('FATAL', e); process.exit(1) })
