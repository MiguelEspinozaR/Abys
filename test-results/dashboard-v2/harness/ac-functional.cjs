// dashboard-v2 targeted functional DOM evidence (environment Playwright).
// Covers AC2, AC3, AC6, AC7, AC8, AC9-AC13 at the rendered UI level.
// Writes only with page.route(); POST/PUT/DELETE blocked by fixtures.cjs (599).
const fs = require('fs')
const path = require('path')
const { chromium } = require('/home/miky/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')
const { preparePage } = require('./fixtures.cjs')

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5178'
const results = { generatedAt: new Date().toISOString(), checks: [] }
const put = (id, pass, detail) => {
  results.checks.push({ id, verdict: pass ? 'PASS' : 'FAIL', detail })
  console.log(`${id}: ${pass ? 'PASS' : 'FAIL'} — ${detail}`)
}

;(async () => {
  const browser = await chromium.launch({ channel: 'chrome' })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' })
  const page = await ctx.newPage()
  await preparePage(page, 'light')

  // ---------------- Dashboard ----------------
  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  const dash = await page.evaluate(() => {
    const t = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim()
    const body = t(document.body)
    const cardTitles = ['Total últimos 30 días', 'Total histórico', 'Días trabajados', 'Pagos']
    const cards = Object.fromEntries(cardTitles.map((k) => [k, body.includes(k)]))
    const has = (s) => body.includes(s)
    return {
      cards,
      has30dValue: has('123.456,00 Bs'),
      hasHistoricoValue: has('987.654,00 Bs'),
      hasLaPaz: has('Incluye hoy · zona La Paz'),
      navButtons: [...document.querySelectorAll('button[aria-label]')]
        .map((b) => b.getAttribute('aria-label'))
        .filter((a) => a && /^(Anterior|Siguiente):/.test(a)),
      patternIds: [...document.querySelectorAll('pattern')].map((p) => p.id),
      srOnlyTables: document.querySelectorAll('.sr-only table, table.sr-only').length,
      legendPercentTexts: [...document.querySelectorAll('li, span, p')]
        .map(t).filter((s) => /\d+,\d+ %/.test(s)).slice(0, 6),
      hasOCR: /OCR|tesseract/i.test(body),
      hasTendencia: /tendencia/i.test(body),
      pieSvgs: document.querySelectorAll('.recharts-pie, svg .recharts-sector').length,
      tables: [...document.querySelectorAll('table')].map((t) => ({
        headers: [...t.querySelectorAll('th')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()),
        rows: [...t.querySelectorAll('tbody tr')].map((r) =>
          [...r.querySelectorAll('td,th')].map((x) => x.textContent.replace(/\s+/g, ' ').trim())),
      })),
    }
  })
  put('AC2', dash.cards['Total últimos 30 días'] && dash.cards['Total histórico'] &&
    !dash.cards['Días trabajados'] && !dash.cards['Pagos'],
  `cards=${JSON.stringify(dash.cards)}`)
  put('AC3', dash.has30dValue && dash.hasHistoricoValue && dash.hasLaPaz,
    `30d=123.456,00 Bs:${dash.has30dValue}, histórico=987.654,00 Bs:${dash.hasHistoricoValue}, La Paz:${dash.hasLaPaz}`)
  const weeklyRow22 = (dash.tables[0]?.rows || []).find((r) => r[0] === 'jue, 22 oct 2026')
  const monthlyHeaders = dash.tables[1]?.headers || []
  const yearlyHeaders = dash.tables[2]?.headers || []
  put('AC9', dash.patternIds.some((p) => /semanal-patron-fuente-/.test(p)) &&
    dash.patternIds.some((p) => /dist-(mes|anio)-patron-fuente-/.test(p)) &&
    JSON.stringify(weeklyRow22) === JSON.stringify(['jue, 22 oct 2026', '200,00 Bs', '250,00 Bs', '450,00 Bs']),
  `22/10=${JSON.stringify(weeklyRow22)} (2 sources, 200+250=450); source patterns present`)
  put('AC10', dash.navButtons.some((a) => a.includes('Mensual')) && dash.srOnlyTables >= 1 &&
    ['1–7', '8–14', '15–21', '22–28', '29–31'].every((h) => monthlyHeaders.includes(h)),
  `monthly blocks=${monthlyHeaders.filter((h) => /^(\d+–\d+)$/.test(h)).join(',')}; nav present`)
  put('AC11', dash.navButtons.some((a) => a.includes('Anual')) &&
    ['ene 2026', 'feb 2026', 'mar 2026', 'abr 2026', 'may 2026', 'jun 2026',
      'jul 2026', 'ago 2026', 'sep 2026', 'oct 2026', 'nov 2026', 'dic 2026']
      .every((h) => yearlyHeaders.includes(h)),
  `yearly months=${yearlyHeaders.filter((h) => / 2026$/.test(h)).length}; nav present`)
  put('AC12', !dash.hasTendencia &&
    !(dash.tables[3]?.headers || []).some((h) => /tendencia/i.test(h)),
  `tendencia text/table header present=${dash.hasTendencia || (dash.tables[3]?.headers || []).some((h) => /tendencia/i.test(h))}`)
  const distNav = dash.navButtons.filter((a) => a.includes('Distribución'))
  put('AC13', distNav.length >= 4 && dash.legendPercentTexts.length > 0 && dash.pieSvgs > 0,
    `distribution nav=${distNav.length}, percent legends=${dash.legendPercentTexts.length}, pie sectors=${dash.pieSvgs}`)

  // Empty state for both pies (mocks overridden to zero total).
  await page.route('**/api/v1/dashboard/distribution/**', (route) => {
    const url = new URL(route.request().url())
    const isYear = url.pathname.includes('yearly')
    const body = isYear
      ? { anio: 2026, total_centavos: 0, por_fuente: [] }
      : { mes: 10, anio: 2026, total_centavos: 0, por_fuente: [] }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  const emptyCount = await page.locator('text=Sin datos en el período').count()
  put('AC13-empty', emptyCount >= 2, `empty-state messages rendered=${emptyCount} (expected >=2)`)
  // Remove override for the registrar pass.
  await page.unroute('**/api/v1/dashboard/distribution/**')

  // ---------------- Registrar ----------------
  await page.goto(BASE + '/registrar', { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  const tiles = page.locator('button.react-calendar__tile:not(.react-calendar__month-view__days__day--neighboringMonth):has(abbr)')
  const tileCount = await tiles.count()
  for (let i = 0; i < Math.min(3, tileCount); i++) await tiles.nth(i).click()
  await page.waitForTimeout(200)

  const reg0 = await page.evaluate(() => ({
    body: (document.body.textContent || '').replace(/\s+/g, ' '),
    dailyInputs: [...document.querySelectorAll('input[id^="monto-dia-"]')].map((e) => e.id),
  }))
  put('AC8', !/OCR|tesseract|Leer comprobante/i.test(reg0.body) &&
    /comprobante/i.test(reg0.body),
  `OCR text=${/OCR|tesseract|Leer comprobante/i.test(reg0.body)}, comprobante text=${/comprobante/i.test(reg0.body)}`)

  const detailedBtn = page.locator('fieldset#registrar-modo button', { hasText: 'Detallado' })
  const distributedBtn = page.locator('fieldset#registrar-modo button', { hasText: 'Distribuido' })
  const detailedPressedBefore = await detailedBtn.getAttribute('aria-pressed')
  if (detailedPressedBefore !== 'true') await detailedBtn.click()
  await page.waitForTimeout(150)
  const dayInputs = page.locator('input[id^="monto-dia-"]')
  const nInputs = await dayInputs.count()
  const vals = ['150', '200', '250']
  for (let i = 0; i < nInputs; i++) await dayInputs.nth(i).fill(vals[i] || '0')
  await page.waitForTimeout(200)
  const totalDetailed = await page.evaluate(() => {
    const el = [...document.querySelectorAll('span')].find((s) => (s.textContent || '').trim().startsWith('Total del pago'))
    return el ? el.parentElement.textContent.replace(/\s+/g, ' ').trim() : null
  })
  put('AC6', nInputs === 3 && /600,00 Bs/.test(totalDetailed || ''),
    `daily inputs=${nInputs}, total="${totalDetailed}" (expected 600,00 Bs)`)

  await distributedBtn.click()
  await page.waitForTimeout(200)
  await page.locator('#monto-total').fill('600')
  await page.waitForTimeout(250)
  const preview600 = await page.evaluate(() => {
    const ul = [...document.querySelectorAll('ul')].find((u) =>
      /200,00 Bs/.test(u.textContent || '') && [...u.querySelectorAll('li')].length >= 3)
    return ul ? [...ul.querySelectorAll('li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim()) : []
  })
  put('AC7', preview600.length === 3 && preview600.every((s) => s.includes('200,00 Bs')),
    `600/3 preview=${JSON.stringify(preview600)}`)

  await page.locator('#monto-total').fill('600,01')
  await page.waitForTimeout(250)
  const previewResidual = await page.evaluate(() => {
    const ul = [...document.querySelectorAll('ul')].find((u) =>
      [...u.querySelectorAll('li')].length >= 3 && /200,0[01] Bs/.test(u.textContent || ''))
    return ul ? [...ul.querySelectorAll('li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim()) : []
  })
  put('AC7-residual', previewResidual.length === 3 &&
    previewResidual[0].includes('200,00 Bs') && previewResidual[2].includes('200,01 Bs'),
  `600,01/3 preview (residue to last day)=${JSON.stringify(previewResidual)}`)

  results.summary = {
    total: results.checks.length,
    passed: results.checks.filter((c) => c.verdict === 'PASS').length,
    failed: results.checks.filter((c) => c.verdict === 'FAIL').length,
  }
  fs.writeFileSync(path.join(__dirname, 'ac-functional.json'), JSON.stringify(results, null, 2) + '\n')
  console.log('SUMMARY', JSON.stringify(results.summary))
  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
