const { chromium } = require('/home/miky/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')
const BASE = 'https://test3.mikylab.com'

;(async () => {
  const browser = await chromium.launch({ channel: 'chrome' })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })

  const measure = async (route, wait = 2500) => {
    await page.goto(BASE + route)
    await page.waitForTimeout(wait)
    return page.evaluate(() => {
      const vis = (el) => {
        const s = getComputedStyle(el)
        if (s.display === 'none' || s.visibility === 'hidden') return false
        const r = el.getBoundingClientRect()
        return r.width > 0 && r.height > 0
      }
      const targets = {}
      for (const el of document.querySelectorAll('a, button, input, select, textarea, [role="button"], [role="tab"], [role="menuitem"], [role="switch"]')) {
        if (!vis(el)) continue
        const r = el.getBoundingClientRect()
        if (r.width < 44 || r.height < 44) {
          const txt = (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30) || '(sin texto)'
          const k = `${Math.round(r.width)}x${Math.round(r.height)} ${txt}`
          targets[k] = (targets[k] || 0) + 1
        }
      }
      const imgs = [...document.querySelectorAll('img')].filter((i) => !i.getAttribute('width') || !i.getAttribute('height')).length
      const totalInteractive = [...document.querySelectorAll('a, button, input, select, textarea')].filter(vis).length
      return { targets, imgs, totalInteractive }
    })
  }

  for (const [route, wait] of [['/ingresos', 3000], ['/splits', 2000], ['/configuracion', 1500], ['/', 1500], ['/registrar', 1500]]) {
    const m = await measure(route, wait)
    const total = Object.values(m.targets).reduce((a, b) => a + b, 0)
    console.log(`\n=== ${route} — interactivos=${m.totalInteractive} <44px=${total} imgsSinDim=${m.imgs} ===`)
    Object.entries(m.targets).sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([k, v]) => console.log(`  ${String(v).padStart(3)}× ${k}`))
  }

  // Foco visible: Tab y leer indicador
  await page.goto(BASE + '/ingresos')
  await page.waitForTimeout(2500)
  await page.evaluate(() => document.body.focus())
  const focus = []
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab')
    const f = await page.evaluate(() => {
      const el = document.activeElement
      if (!el) return null
      const s = getComputedStyle(el)
      return {
        tag: el.tagName,
        label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 28),
        outline: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`,
        ring: s.boxShadow,
        border: s.borderColor,
      }
    })
    focus.push(f)
  }
  console.log('\n=== FOCO (Tab) /ingresos ===')
  for (const f of focus) console.log(`  ${f.tag.padEnd(6)} ${f.label.padEnd(28)} outline=${f.outline} ring=${f.ring.slice(0, 60)}`)

  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
