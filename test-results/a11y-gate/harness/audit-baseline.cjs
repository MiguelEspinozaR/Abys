const { chromium } = require('/home/miky/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')
const fs = require('fs')

const BASE = 'https://test3.mikylab.com'
const OUT = '/tmp/opencode/audit'
const routes = [
  ['/', 'dashboard'],
  ['/ingresos', 'ingresos'],
  ['/splits', 'splits'],
  ['/registrar', 'registrar'],
  ['/configuracion', 'configuracion'],
]
const themes = ['dark', 'light']
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]

const collect = () => {
  const isVisible = (el) => {
    const s = getComputedStyle(el)
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  }
  const selector = (el) => {
    const parts = []
    let n = el
    while (n && n.nodeType === 1 && parts.length < 5) {
      let p = n.tagName.toLowerCase()
      if (n.getAttribute('data-slot')) p += `[${n.getAttribute('data-slot')}]`
      if (n.id) { p += '#' + n.id; parts.unshift(p); break }
      const cls = [...n.classList].filter((c) => !c.startsWith('data-')).slice(0, 2).join('.')
      if (cls) p += '.' + cls
      parts.unshift(p)
      n = n.parentElement
    }
    return parts.join(' > ')
  }
  const label = (el) => (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 60)

  const overflowX = Math.max(
    0,
    document.documentElement.scrollWidth - window.innerWidth,
    document.body.scrollWidth - window.innerWidth,
  )

  const truncados = []
  for (const el of document.querySelectorAll('*')) {
    if (!isVisible(el) || el.children.length > 0) continue
    const s = getComputedStyle(el)
    if (s.textOverflow !== 'ellipsis') continue
    if (el.scrollWidth > el.clientWidth + 1 && (el.textContent || '').trim()) {
      truncados.push({ el: selector(el), texto: (el.textContent || '').trim().slice(0, 50), ancho: el.clientWidth, real: el.scrollWidth })
    }
  }

  const targets = []
  for (const el of document.querySelectorAll('a, button, input, select, textarea, [role="button"], [role="tab"], [role="menuitem"], [role="switch"]')) {
    if (!isVisible(el)) continue
    const r = el.getBoundingClientRect()
    if (r.width < 44 || r.height < 44) {
      targets.push({ el: selector(el), texto: label(el).slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) })
    }
  }

  const sinNombre = []
  for (const el of document.querySelectorAll('button')) {
    if (!isVisible(el)) continue
    const txt = (el.textContent || '').trim()
    const hasName = txt || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title')
    if (!hasName) sinNombre.push({ el: selector(el) })
  }

  const imgsSinDim = []
  for (const img of document.querySelectorAll('img')) {
    if (!img.getAttribute('width') || !img.getAttribute('height')) {
      imgsSinDim.push({ src: (img.getAttribute('src') || '').slice(0, 50), alt: img.getAttribute('alt') })
    }
  }

  const parseColor = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/)
    if (!m) return null
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number)
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }
  }
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const ratio = (a, b) => {
    const l1 = lum(a), l2 = lum(b)
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
  }
  const bgDe = (el) => {
    let n = el
    while (n && n.nodeType === 1) {
      const s = getComputedStyle(n)
      if (s.backgroundImage && s.backgroundImage !== 'none') return { gradiente: true }
      const c = parseColor(s.backgroundColor)
      if (c && c.a > 0.5) return c
      n = n.parentElement
    }
    return { r: 255, g: 255, b: 255, a: 1 }
  }
  const contrastes = []
  for (const el of document.querySelectorAll('p, span, a, button, label, h1, h2, h3, h4, li, td, th, div')) {
    if (!isVisible(el)) continue
    const directText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
    if (!directText) continue
    const s = getComputedStyle(el)
    const fg = parseColor(s.color)
    if (!fg || fg.a < 0.5) continue
    const bg = bgDe(el)
    if (bg.gradiente) continue
    const cr = ratio(fg, bg)
    const size = parseFloat(s.fontSize)
    const bold = Number(s.fontWeight) >= 700
    const grande = size >= 24 || (size >= 18.66 && bold)
    const min = grande ? 3 : 4.5
    if (cr < min) {
      contrastes.push({ el: selector(el), texto: (el.textContent || '').trim().slice(0, 40), ratio: Number(cr.toFixed(2)), min, color: s.color, bg: `rgb(${bg.r},${bg.g},${bg.b})` })
    }
  }

  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => `${h.tagName}: ${h.textContent.trim().slice(0, 40)}`)
  const lang = document.documentElement.lang
  const colorScheme = getComputedStyle(document.documentElement).colorScheme
  const themeColor = document.querySelector('meta[name="theme-color"]')?.content ?? null

  return {
    overflowX,
    truncados: truncados.slice(0, 20),
    targets: targets.slice(0, 40),
    sinNombre: sinNombre.slice(0, 15),
    imgsSinDim: imgsSinDim.slice(0, 10),
    contrastes: contrastes.slice(0, 30),
    headings,
    lang,
    colorScheme,
    themeColor,
    counts: {
      truncados: truncados.length,
      targets: targets.length,
      sinNombre: sinNombre.length,
      contrastes: contrastes.length,
    },
  }
}

;(async () => {
  const browser = await chromium.launch({ channel: 'chrome' })
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  const results = []

  for (const theme of themes) {
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto(BASE + '/')
      await page.evaluate((t) => {
        localStorage.setItem('abys-ui', JSON.stringify({ state: { sidebarColapsado: false, tema: t }, version: 0 }))
      }, theme)

      for (const [route, slug] of routes) {
        await page.goto(BASE + route)
        await page.waitForTimeout(700)
        const data = await page.evaluate(collect)
        results.push({ theme, viewport: vp.name, route, ...data })
        await page.screenshot({ path: `${OUT}/${slug}-${theme}-${vp.name}.png`, fullPage: true })
      }
    }
  }

  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log('DONE', results.length, 'combinations')
  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
