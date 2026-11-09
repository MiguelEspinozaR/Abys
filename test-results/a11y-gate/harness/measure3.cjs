const { chromium } = require('/home/miky/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')
const BASE = 'https://test3.mikylab.com'

;(async () => {
  const browser = await chromium.launch({ channel: 'chrome' })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })

  // 1) Foco real por teclado en /ingresos
  await page.goto(BASE + '/ingresos')
  await page.waitForTimeout(2500)
  await page.evaluate(() => document.body.focus())
  console.log('=== FOCO /ingresos ===')
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab')
    const f = await page.evaluate(() => {
      const el = document.activeElement
      if (!el) return null
      const s = getComputedStyle(el)
      return {
        tag: el.tagName,
        type: el.getAttribute('type') || '',
        label: (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || '').trim().slice(0, 26),
        fv: el.matches(':focus-visible'),
        oStyle: s.outlineStyle,
        oWidth: s.outlineWidth,
        oColor: s.outlineColor,
        shadow: s.boxShadow,
        bWidth: s.borderWidth,
        bColor: s.borderColor,
      }
    })
    console.log(JSON.stringify(f))
  }

  // 2) Formulario /registrar
  await page.goto(BASE + '/registrar')
  await page.waitForTimeout(2000)
  const form = await page.evaluate(() => {
    const fields = [...document.querySelectorAll('input, select, textarea')].map((el) => ({
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute('type') || '',
      name: el.getAttribute('name'),
      id: el.id || null,
      autocomplete: el.getAttribute('autocomplete'),
      ariaLabel: el.getAttribute('aria-label'),
      labelFor: el.id ? !!document.querySelector(`label[for="${el.id}"]`) : false,
      required: el.required,
    }))
    const radios = [...document.querySelectorAll('[role="radiogroup"]')].map((g) => ({
      role: g.getAttribute('role'),
      children: [...g.querySelectorAll('button,[role="radio"]')].map((b) => ({
        role: b.getAttribute('role'),
        pressed: b.getAttribute('aria-pressed'),
        checked: b.getAttribute('aria-checked'),
        text: (b.textContent || '').trim(),
      })),
    }))
    return { fields, radios }
  })
  console.log('\n=== FORM /registrar ===')
  form.fields.forEach((f, i) => console.log(i, JSON.stringify(f)))
  console.log('radiogroups:', JSON.stringify(form.radios, null, 1))

  // 3) Meta + paginación
  await page.goto(BASE + '/ingresos')
  await page.waitForTimeout(2500)
  const meta = await page.evaluate(() => ({
    themeColor: document.querySelector('meta[name="theme-color"]')?.content || null,
    viewport: document.querySelector('meta[name="viewport"]')?.content || null,
    lang: document.documentElement.lang,
    skip: !!document.querySelector('a[href^="#"]:not([data-slot])'),
    paginacion: [...document.querySelectorAll('body *')].map((e) => e.childElementCount === 0 ? (e.textContent || '').trim() : '').filter((t) => /Página \d+ de \d+/.test(t)).slice(0, 3),
    filas: document.querySelectorAll('tbody tr, [data-slot="card"]').length,
    reducedMotionRules: [...document.styleSheets].flatMap((s) => { try { return [...s.cssRules] } catch { return [] } }).filter((r) => r.conditionText && /prefers-reduced-motion/.test(r.conditionText)).length,
    searchParamsSync: [...document.querySelectorAll('a[href*="?"]')].length,
  }))
  console.log('\n=== META /ingresos ===')
  console.log(JSON.stringify(meta, null, 1))

  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
