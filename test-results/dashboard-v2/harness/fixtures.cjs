// dashboard-v2 evidence harness — deterministic API mocks.
// Environment Playwright only (never added to web/package.json).
// Security net: any non-GET API request is fulfilled with 599 HARNESS_BLOCKED_WRITE.

const API_GLOB = '**/api/v1/**'

const STAMP = '2026-01-01T00:00:00Z'
const fuente = (id, alias, color) => ({
  id,
  alias,
  color,
  logo_ruta: null,
  split_auto: false,
  split_auto_modo: null,
  created_at: STAMP,
  updated_at: STAMP,
})

const FUENTES = [
  fuente(1, 'Athena', '#1d4ed8'),
  fuente(2, 'Essencia', '#15803d'),
  fuente(3, 'Malnova', '#b91c1c'),
]

const porFuente = (items) => items.map(([fuente_id, alias, color, total_centavos]) => ({
  fuente_id, alias, color, total_centavos,
}))

const WEEK_DAYS = ['2026-10-19','2026-10-20','2026-10-21','2026-10-22','2026-10-23','2026-10-24','2026-10-25']

const FIXTURES = {
  '/fuentes': FUENTES,
  '/cuentas': [],
  '/splits': [],
  '/settings/split': { modo_default: 'redondeado' },
  '/pagos': { data: [], meta: { page: 1, page_size: 20, total: 0, total_pages: 0 } },
  '/health': { estado: 'ok' },
  '/health/db': {
    conexion: 'ok',
    tablas: [{ nombre: 'pagos', registros: 0 }],
  },
  '/dashboard/summary': { total_30d_centavos: 12345600, total_historico_centavos: 98765400 },
  '/dashboard/history': {
    por_mes: Array.from({ length: 12 }, (_, i) => ({
      anio: 2026, mes: i + 1, total_centavos: (i + 1) * 100000,
    })),
  },
  '/dashboard/weekly': {
    semana_inicio: '2026-10-19',
    semana_fin: '2026-10-25',
    dias: WEEK_DAYS.map((fecha, i) => ({
      fecha,
      total_centavos: [15000, 20000, 25000, 45000, 12000, 0, 8000][i],
      por_fuente: fecha === '2026-10-22'
        ? porFuente([[1, 'Athena', '#1d4ed8', 20000], [2, 'Essencia', '#15803d', 25000]])
        : porFuente([[1, 'Athena', '#1d4ed8', [15000, 20000, 25000, 0, 12000, 0, 8000][i]]]),
    })),
  },
  '/dashboard/monthly': {
    mes: 10,
    anio: 2026,
    bloques: [
      { bloque: 1, inicio: '2026-10-01', fin: '2026-10-07', total_centavos: 15000 },
      { bloque: 2, inicio: '2026-10-08', fin: '2026-10-14', total_centavos: 20000 },
      { bloque: 3, inicio: '2026-10-15', fin: '2026-10-21', total_centavos: 25000 },
      { bloque: 4, inicio: '2026-10-22', fin: '2026-10-28', total_centavos: 45000 },
      { bloque: 5, inicio: '2026-10-29', fin: '2026-10-31', total_centavos: 0 },
    ],
  },
  '/dashboard/yearly': {
    anio: 2026,
    meses: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, total_centavos: (i + 1) * 10000 })),
  },
  '/dashboard/distribution/monthly': {
    mes: 10, anio: 2026, total_centavos: 105000,
    por_fuente: porFuente([[1, 'Athena', '#1d4ed8', 50000], [2, 'Essencia', '#15803d', 35000], [3, 'Malnova', '#b91c1c', 20000]]),
  },
  '/dashboard/distribution/yearly': {
    anio: 2026, total_centavos: 780000,
    por_fuente: porFuente([[1, 'Athena', '#1d4ed8', 330000], [2, 'Essencia', '#15803d', 270000], [3, 'Malnova', '#b91c1c', 180000]]),
  },
}

function respond(route, path) {
  // Security net: never allow writes of any kind.
  if (route.request().method() !== 'GET') {
    return route.fulfill({ status: 599, contentType: 'text/plain', body: 'HARNESS_BLOCKED_WRITE' })
  }
  const key = Object.keys(FIXTURES).find((k) => path === k || path.startsWith(k + '?'))
  if (key) {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(FIXTURES[key]),
    })
  }
  // Unknown path: empty envelope, still GET-only.
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: '{"data":null}',
  })
}

async function installMocks(contextOrPage) {
  await contextOrPage.route(API_GLOB, (route) => {
    const url = new URL(route.request().url())
    let path = url.pathname.replace(/^\/api\/v1/, '')
    if (!path.startsWith('/')) path = '/' + path
    return respond(route, path)
  })
}

async function preparePage(page, theme) {
  await page.addInitScript((t) => {
    localStorage.setItem('abys-ui', JSON.stringify({
      state: { sidebarColapsado: false, tema: t },
      version: 0,
    }))
  }, theme)
  await installMocks(page)
}

const THEMES = ['light', 'dark']
const VIEWPORTS = [
  { id: 'm390', width: 390, height: 844 },
  { id: 'd1440', width: 1440, height: 900 },
]
const ROUTES = [
  { id: 'dashboard', path: '/dashboard' },
  { id: 'registrar', path: '/registrar' },
]

module.exports = { installMocks, preparePage, FIXTURES, THEMES, VIEWPORTS, ROUTES, API_GLOB }
