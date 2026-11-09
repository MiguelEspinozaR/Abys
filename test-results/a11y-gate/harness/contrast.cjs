const { chromium } = require('/home/miky/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')
const BASE = 'https://test3.mikylab.com'

;(async () => {
  const browser = await chromium.launch({ channel: 'chrome' })
  const ctx = await browser.newContext()
  const page = await ctx.newPage()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(BASE + '/ingresos')
  await page.waitForTimeout(2500)
  const info = await page.evaluate(() => ({
    filas: document.querySelectorAll('[aria-label="Ver detalle"]').length,
    anios: [...document.querySelectorAll('section[aria-label^="Pagos de"]')].map((s) => s.getAttribute('aria-label')),
    header: document.querySelector('h1 + p')?.textContent?.trim(),
    paginacion: [...document.querySelectorAll('p')].map((p) => p.textContent).filter((t) => t.includes('Página')),
    botones: [...document.querySelectorAll('button[aria-label]')].slice(0, 3).map((b) => b.getAttribute('aria-label')),
  }))
  console.log('INGRESOS:', JSON.stringify(info, null, 2))

  // Contraste con composición alpha
  const routes = ['/', '/ingresos', '/splits', '/registrar', '/configuracion']
  const out = []
  for (const theme of ['dark', 'light']) {
    await page.goto(BASE + '/')
    await page.evaluate((t) => localStorage.setItem('abys-ui', JSON.stringify({ state: { sidebarColapsado: false, tema: t }, version: 0 })), theme)
    for (const route of routes) {
      await page.goto(BASE + route)
      await page.waitForTimeout(1200)
      const bad = await page.evaluate(() => {
        const parse = (c) => {
          const m = c.match(/rgba?\(([^)]+)\)/)
          if (!m) return null
          const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number)
          return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }
        }
        const lum = ({ r, g, b }) => {
          const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
        }
        const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) }
        const comp = (fg, bg) => ({
          r: fg.r * fg.a + bg.r * (1 - fg.a),
          g: fg.g * fg.a + bg.g * (1 - fg.a),
          b: fg.b * fg.a + bg.b * (1 - fg.a),
        })
        const bgDe = (el) => {
          let n = el
          while (n && n.nodeType === 1) {
            const s = getComputedStyle(n)
            if (s.backgroundImage && s.backgroundImage !== 'none') return { gradiente: true }
            const c = parse(s.backgroundColor)
            if (c && c.a > 0.01) return c
            n = n.parentElement
          }
          return { r: 255, g: 255, b: 255, a: 1 }
        }
        const sel = (el) => {
          const parts = []
          let n = el
          while (n && n.nodeType === 1 && parts.length < 4) {
            let p = n.tagName.toLowerCase()
            if (n.id) { p += '#' + n.id; parts.unshift(p); break }
            const cls = [...n.classList].slice(0, 2).join('.')
            if (cls) p += '.' + cls
            parts.unshift(p)
            n = n.parentElement
          }
          return parts.join(' > ')
        }
        const res = []
        for (const el of document.querySelectorAll('p, span, a, button, label, h1, h2, h3, h4, li, td, th, dt, dd')) {
          const st = getComputedStyle(el)
          if (st.display === 'none' || st.visibility === 'hidden') continue
          const r = el.getBoundingClientRect()
          if (!r.width || !r.height) continue
          const direct = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
          if (!direct) continue
          const fg = parse(st.color)
          if (!fg) continue
          const bg = bgDe(el)
          if (bg.gradiente) continue
          const fgc = comp(fg, bg)
          const cr = ratio(fgc, bg)
          const size = parseFloat(st.fontSize)
          const bold = Number(st.fontWeight) >= 700
          const min = (size >= 24 || (size >= 18.66 && bold)) ? 3 : 4.5
          if (cr < min) res.push({ el: sel(el), texto: (el.textContent || '').trim().slice(0, 40), ratio: +cr.toFixed(2), min, fg: st.color, bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})` })
        }
        return res
      })
      out.push({ theme, route, bad })
    }
  }
  console.log('\nCONTRASTES:')
  for (const o of out) {
    console.log(`\n${o.theme} ${o.route}: ${o.bad.length}`)
    for (const b of o.bad.slice(0, 8)) console.log(`   ${b.ratio} (<${b.min}) "${b.texto}" fg=${b.fg} bg=${b.bg} :: ${b.el}`)
  }

  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
