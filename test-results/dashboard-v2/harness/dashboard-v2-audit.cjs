// dashboard-v2 scroll-metrics + console E2E (environment Playwright, no project dep).
// Produces: metrics-after.json, console-log.json, harness/dom-inventory.json
const fs = require('fs')
const path = require('path')
const { chromium } = require('/home/miky/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')
const { preparePage, THEMES, VIEWPORTS, ROUTES } = require('./fixtures.cjs')

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5178'
const OUT = path.resolve(__dirname, '..')

const scrollMetricsFn = () => {
  const se = document.scrollingElement || document.documentElement
  const de = document.documentElement
  const body = document.body
  const main = document.querySelector('main#contenido')
  const desc = (el) => {
    if (!el) return null
    const cls = (el.className && typeof el.className === 'string') ? el.className.split(/\s+/).filter(Boolean).slice(0, 4).join('.') : ''
    return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls ? '.' + cls : ''}`
  }
  const scrollers = []
  for (const el of document.querySelectorAll('*')) {
    const s = getComputedStyle(el)
    const oy = s.overflowY
    if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
      const isDoc = el === de || el === body || el === se
      scrollers.push({
        element: desc(el),
        isDocument: isDoc,
        overflowY: oy,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
      })
    }
  }
  const documentScrollers = scrollers.filter((s) => s.isDocument)
  const nestedScrollers = scrollers.filter((s) => !s.isDocument)
  const docOverflow = se.scrollHeight > se.clientHeight + 1
  return {
    viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio },
    document: {
      scrollingElement: desc(se),
      scrollHeight: se.scrollHeight,
      clientHeight: se.clientHeight,
      innerHeight: window.innerHeight,
      bodyScrollHeight: body ? body.scrollHeight : null,
      documentElementScrollHeight: de ? de.scrollHeight : null,
      overflowY: de ? getComputedStyle(de).overflowY : null,
      scrollWidth: se.scrollWidth,
      clientWidth: se.clientWidth,
    },
    computedOverflowY: {
      html: de ? getComputedStyle(de).overflowY : null,
      body: body ? getComputedStyle(body).overflowY : null,
      main_contenido: main ? getComputedStyle(main).overflowY : null,
      main_contenido_present: !!main,
    },
    scrollContainers: {
      total: scrollers.length,
      documentLevel: documentScrollers.length,
      nested: nestedScrollers.length,
      documentActuallyOverflows: docOverflow,
      items: scrollers,
    },
    horizontalOverflow: {
      documentElement: de ? (de.scrollWidth > de.clientWidth + 1) : null,
      body: body ? (body.scrollWidth > body.clientWidth + 1) : null,
    },
  }
}

const inventoryFn = () => {
  const textOf = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim()
  const visible = (el) => {
    const r = el.getBoundingClientRect()
    const s = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
  }
  const svgs = [...document.querySelectorAll('svg')]
  const patterns = [...document.querySelectorAll('pattern')]
  const patternRefs = [...document.querySelectorAll('[fill]')].filter((el) =>
    /url\(#/.test(el.getAttribute('fill') || ''))
  const srOnlyTables = [...document.querySelectorAll('.sr-only table, table.sr-only, table')]
    .filter((t) => t.closest('.sr-only') || t.classList.contains('sr-only'))
  const figures = [...document.querySelectorAll('figure, [role="img"], [aria-label]')]
    .filter(visible)
    .map((f) => ({ tag: f.tagName.toLowerCase(), label: f.getAttribute('aria-label') || null }))
    .filter((f) => f.label)
  const legendLike = [...document.querySelectorAll('ul, [class*="legend"], [role="list"]')]
    .filter(visible)
    .map((el) => textOf(el).slice(0, 160))
    .filter((t) => /Athena|Essencia|Malnova/.test(t))
  const aliases = ['Athena', 'Essencia', 'Malnova']
  const bodyText = textOf(document.body)
  const headings = [...document.querySelectorAll('h1,h2,h3,h4')].filter(visible).map(textOf)
  const toggleLike = [...document.querySelectorAll('[aria-pressed], fieldset legend, [role="group"] legend')]
    .filter(visible)
    .map((el) => ({ tag: el.tagName.toLowerCase(), text: textOf(el).slice(0, 80), ariaPressed: el.getAttribute('aria-pressed') }))
  const controls = [...document.querySelectorAll('button, a[href], input, select, textarea, [role="button"], [role="switch"], [role="radio"], [role="tab"]')]
    .filter(visible).length
  return {
    svgCount: svgs.length,
    patternDefCount: patterns.length,
    patternFillRefCount: patternRefs.length,
    patternIds: patterns.map((p) => p.id).filter(Boolean).slice(0, 20),
    srOnlyTableCount: srOnlyTables.length,
    srOnlyTableHeaders: srOnlyTables.slice(0, 6).map((t) => [...t.querySelectorAll('th')].map(textOf).slice(0, 8)),
    figureLabels: figures.slice(0, 30),
    legendTexts: legendLike.slice(0, 10),
    aliasTextPresent: Object.fromEntries(aliases.map((a) => [a, bodyText.includes(a)])),
    headings: headings.slice(0, 30),
    toggleLike: toggleLike.slice(0, 20),
    visibleControlCount: controls,
    hasOCRText: /OCR|tesseract|Leer comprobante|leerComprobante/i.test(bodyText),
    hasTrendText: /tendencia/i.test(bodyText),
    cardsText: [...document.querySelectorAll('h2,h3,p')].filter(visible).map(textOf)
      .filter((t) => /Total|histórico|últimos 30|días trabajados|pagos/i.test(t)).slice(0, 20),
  }
}

;(async () => {
  const browser = await chromium.launch({ channel: 'chrome' })
  const metrics = {
    generatedAt: new Date().toISOString(),
    feature: 'dashboard-v2',
    commitRange: '643c511..e9faeea',
    baseUrl: BASE,
    note: 'Live post-change metrics at HEAD e9faeea. Metrics-only: NO screenshots taken. All API calls mocked; all writes blocked with 599 HARNESS_BLOCKED_WRITE. The viewport scroller (document.scrollingElement = html) is counted as the document scroll container by actual overflow because its computed overflow-y is "visible" in standards mode; nested scrollers are detected via computed overflow-y in {auto,scroll} AND scrollHeight > clientHeight + 1.',
    combinations: [],
  }
  const consoleLog = {
    generatedAt: new Date().toISOString(),
    feature: 'dashboard-v2',
    note: 'Console errors/warnings and page errors captured during the E2E matrix.',
    entries: [],
    summary: {},
  }
  const inventory = { generatedAt: new Date().toISOString(), combinations: [] }

  for (const route of ROUTES) {
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 1,
          colorScheme: theme,
        })
        const page = await context.newPage()
        const combo = `${route.id}/${vp.id}/${theme}`
        const collect = (level, msg) => {
          consoleLog.entries.push({
            combination: combo,
            route: route.path,
            level,
            text: String(msg).slice(0, 500),
            at: new Date().toISOString(),
          })
        }
        page.on('console', (m) => {
          if (m.type() === 'error' || m.type() === 'warning') collect(m.type(), m.text())
        })
        page.on('pageerror', (e) => collect('pageerror', e.message))
        page.on('requestfailed', (r) => collect('requestfailed', `${r.method()} ${r.url()} :: ${r.failure()?.errorText || ''}`))

        await preparePage(page, theme)
        const response = await page.goto(BASE + route.path, { waitUntil: 'domcontentloaded' })
        await page.waitForLoadState('networkidle').catch(() => {})
        await page.waitForTimeout(700)
        const marker = route.id === 'dashboard'
          ? await page.locator('text=Total histórico').count()
          : await page.locator('text=Registrar').count()

        const sm = await page.evaluate(scrollMetricsFn)
        const inv = await page.evaluate(inventoryFn)
        sm.combination = combo
        sm.route = route.path
        sm.theme = theme
        sm.renderMarkerCount = marker
        sm.httpStatus = response ? response.status() : null
        // The viewport scroller is document.scrollingElement (html) even though its
        // computed overflow-y is "visible" in standards mode; it is counted by
        // actual overflow. Nested scrollers are counted by computed overflow-y.
        sm.verdict = {
          documentScrollerActive: sm.scrollContainers.documentActuallyOverflows,
          nestedScrollers: sm.scrollContainers.nested,
          exactlyOneVerticalScrollContainer:
            sm.scrollContainers.documentActuallyOverflows && sm.scrollContainers.nested === 0,
          singleDocumentScrollNoNesting: sm.scrollContainers.nested === 0,
          noHorizontalOverflow: !(sm.horizontalOverflow.documentElement || sm.horizontalOverflow.body),
        }
        metrics.combinations.push(sm)
        inv.combination = combo
        inventory.combinations.push(inv)
        console.log(`${combo}: scrollers=${sm.scrollContainers.total} nested=${sm.scrollContainers.nested} docOverflow=${sm.scrollContainers.documentActuallyOverflows} hOverflow=${sm.horizontalOverflow.documentElement}/${sm.horizontalOverflow.body} renderMarker=${marker}`)
        await context.close()
      }
    }
  }

  consoleLog.summary = {
    total: consoleLog.entries.length,
    errors: consoleLog.entries.filter((e) => e.level === 'error').length,
    warnings: consoleLog.entries.filter((e) => e.level === 'warning').length,
    pageerrors: consoleLog.entries.filter((e) => e.level === 'pageerror').length,
    requestfailed: consoleLog.entries.filter((e) => e.level === 'requestfailed').length,
  }
  fs.writeFileSync(path.join(OUT, 'metrics-after.json'), JSON.stringify(metrics, null, 2) + '\n')
  fs.writeFileSync(path.join(OUT, 'console-log.json'), JSON.stringify(consoleLog, null, 2) + '\n')
  fs.writeFileSync(path.join(__dirname, 'dom-inventory.json'), JSON.stringify(inventory, null, 2) + '\n')
  console.log('CONSOLE SUMMARY:', JSON.stringify(consoleLog.summary))
  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
