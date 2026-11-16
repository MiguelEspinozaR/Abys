const { chromium } = require('/home/miky/Documentos/finanzasMikyGoRef/web/node_modules/playwright')
const BASE = 'http://localhost:5178'

async function state(page, label) {
  const s = await page.evaluate(() => {
    const active = document.querySelector('[role="tab"][data-state="active"]')
    return {
      href: location.href,
      tabParam: new URL(location.href).searchParams.get('tab'),
      activeTab: active ? active.textContent.trim() : null,
      historyLen: history.length,
    }
  })
  console.log(label, JSON.stringify(s))
  return s
}

async function waitTab(page, tab, label, ms = 10000) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    const ok = await page.evaluate(({ t, l }) => {
      const p = new URL(location.href).searchParams.get('tab')
      const active = document.querySelector('[role="tab"][data-state="active"]')
      const txt = (active && active.textContent || '').trim()
      return p === t && (!l || txt.includes(l))
    }, { t: tab, l: label || '' })
    if (ok) return true
    await page.waitForTimeout(50)
  }
  throw new Error(`timeout esperando tab=${tab} label=${label}`)
}

async function probeBackForward() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  try {
    console.log('\n--- PROBE 1: direct /configuracion?tab=cuentas then click Fuentes, back, forward ---')
    await page.goto(BASE + '/configuracion?tab=cuentas', { waitUntil: 'domcontentloaded' })
    await waitTab(page, 'cuentas', 'Cuentas')
    await page.waitForTimeout(300)
    await state(page, 'after load cuentas')
    await page.getByRole('tab', { name: 'Fuentes' }).click()
    await waitTab(page, 'fuentes', 'Fuentes')
    await page.waitForTimeout(300)
    await state(page, 'after click Fuentes')
    await page.goBack()
    try {
      await waitTab(page, 'cuentas', 'Cuentas', 5000)
      await state(page, 'after goBack (ok)')
    } catch (e) {
      await state(page, 'after goBack (TIMEOUT)')
      console.log('goBack error:', e.message)
    }
    await page.goForward()
    try {
      await waitTab(page, 'fuentes', 'Fuentes', 5000)
      await state(page, 'after goForward (ok)')
    } catch (e) {
      await state(page, 'after goForward (TIMEOUT)')
      console.log('goForward error:', e.message)
    }
  } finally { await ctx.close(); await browser.close() }
}

async function probeCanonAndHarnessFlow() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  try {
    console.log('\n--- PROBE 2: harness-like flow /configuracion, /configuracion?tab=foo, click Fuentes, back, forward ---')
    await page.goto(BASE + '/configuracion', { waitUntil: 'domcontentloaded' })
    await waitTab(page, 'cuentas', 'Cuentas')
    await page.waitForTimeout(300)
    await state(page, 'after /configuracion (canon)')
    await page.goto(BASE + '/configuracion?tab=foo', { waitUntil: 'domcontentloaded' })
    await waitTab(page, 'cuentas', 'Cuentas')
    await page.waitForTimeout(300)
    await state(page, 'after /configuracion?tab=foo (canon)')
    await page.getByRole('tab', { name: 'Fuentes' }).click()
    await waitTab(page, 'fuentes', 'Fuentes')
    await page.waitForTimeout(300)
    await state(page, 'after click Fuentes')
    await page.goBack()
    try {
      await waitTab(page, 'cuentas', 'Cuentas', 5000)
      await state(page, 'after goBack (ok)')
    } catch (e) {
      await state(page, 'after goBack (TIMEOUT)')
      console.log('goBack error:', e.message)
    }
    await page.goForward()
    try {
      await waitTab(page, 'fuentes', 'Fuentes', 5000)
      await state(page, 'after goForward (TIMEOUT?)')
    } catch (e) {
      await state(page, 'after goForward (TIMEOUT)')
      console.log('goForward error:', e.message)
    }
  } finally { await ctx.close(); await browser.close() }
}

async function probeNoParamCanon() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  try {
    console.log('\n--- PROBE 3: /configuracion (no param) canonization history effect ---')
    await page.goto(BASE + '/configuracion', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(100)
    await state(page, 'immediate after domcontentloaded')
    await waitTab(page, 'cuentas', 'Cuentas')
    await page.waitForTimeout(500)
    await state(page, 'after canon settled')
  } finally { await ctx.close(); await browser.close() }
}

;(async () => {
  await probeBackForward()
  await probeCanonAndHarnessFlow()
  await probeNoParamCanon()
})().catch(e => { console.error(e); process.exit(1) })
