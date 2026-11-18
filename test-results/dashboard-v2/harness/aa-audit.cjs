// dashboard-v2 AA harness (policy project-policy.md §5, hard gate; AC15).
// Measures: text contrast AA, UI contrast 3:1, visible focus >=3:1, touch >=44px,
// keyboard operability (order/no traps), accessible names, prefers-reduced-motion,
// and charts-not-color-alone. Environment Playwright only; no screenshots.
const fs = require('fs')
const path = require('path')
const { chromium } = require('/home/miky/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')
const { preparePage, THEMES, VIEWPORTS, ROUTES } = require('./fixtures.cjs')

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5178'
const OUT = path.resolve(__dirname, '..')

const AA_FN = () => {
  // CSS colors in this app are OKLCH/OKLAB; canvas conversion handles all formats.
  const _cv = document.createElement('canvas')
  _cv.width = _cv.height = 1
  const _ctx = _cv.getContext('2d')
  const parse = (c) => {
    if (!c || c === 'none' || c === 'transparent') return null
    try {
      _ctx.clearRect(0, 0, 1, 1)
      _ctx.fillStyle = '#000'
      _ctx.fillStyle = c
      _ctx.fillRect(0, 0, 1, 1)
      const d = _ctx.getImageData(0, 0, 1, 1).data
      if (d[3] === 0) return null
      return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 }
    } catch { return null }
  }
  const firstVisibleColor = (s) => {
    const tokens = String(s || '').match(/(oklch|oklab|rgba?|hsla?|color)\([^)]*\)/g) || []
    for (const t of tokens) {
      const c = parse(t)
      if (c && c.a > 0.05) return c
    }
    return null
  }
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const ratio = (a, b) => {
    const l1 = lum(a), l2 = lum(b)
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
  }
  const comp = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  })
  const bgOf = (el, skipSelf = false) => {
    let n = skipSelf ? el.parentElement : el
    const layers = []
    while (n && n.nodeType === 1) {
      const s = getComputedStyle(n)
      if (s.backgroundImage && s.backgroundImage !== 'none') return { gradient: true, raw: s.backgroundImage }
      const c = parse(s.backgroundColor)
      if (c && c.a > 0.005) {
        layers.push(c)
        if (c.a >= 0.999) break
      }
      n = n.parentElement
    }
    if (!layers.length) return { r: 255, g: 255, b: 255, a: 1 }
    // Composite translucent layers from the bottom of the stack upwards.
    let out = layers[layers.length - 1]
    for (let i = layers.length - 2; i >= 0; i--) out = comp(layers[i], out)
    return out
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
  const isVisible = (el) => {
    const r = el.getBoundingClientRect()
    const s = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
  }
  const isHiddenA11y = (el) => {
    const s = getComputedStyle(el)
    return el.closest('.sr-only') || s.clip === 'rect(0px, 0px, 0px, 0px)' ||
      s.position === 'absolute' && s.width === '1px' && s.height === '1px'
  }
  const text = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60)
  const INTERACTIVE = 'button, a[href], input, select, textarea, [role="button"], [role="switch"], [role="radio"], [role="tab"], [tabindex]'

  // ---- Text contrast (AA 4.5:1 / 3:1 large) ----
  const textFailures = []
  let textChecked = 0
  let textGradientSkipped = 0
  for (const el of document.querySelectorAll('p, span, a, button, label, h1, h2, h3, h4, h5, li, td, th, dt, dd, abbr, strong, em')) {
    if (!isVisible(el) || isHiddenA11y(el) || el.closest('svg')) continue
    const direct = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
    if (!direct) continue
    const st = getComputedStyle(el)
    const fg = parse(st.color)
    if (!fg) continue
    const bg = bgOf(el)
    if (bg.gradient) { textGradientSkipped++; continue }
    textChecked++
    const cr = ratio(comp(fg, bg), bg)
    const size = parseFloat(st.fontSize)
    const bold = Number(st.fontWeight) >= 700
    const min = (size >= 24 || (size >= 18.66 && bold)) ? 3 : 4.5
    if (cr < min) {
      textFailures.push({
        selector: sel(el), text: text(el), measured: +cr.toFixed(2), expected: min,
        fg: st.color, bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`,
        fontSize: size,
      })
    }
  }

  // ---- UI component boundary contrast (3:1) ----
  const uiFailures = []
  let uiChecked = 0
  for (const el of document.querySelectorAll(INTERACTIVE)) {
    if (!isVisible(el) || isHiddenA11y(el)) continue
    const st = getComputedStyle(el)
    const bw = parseFloat(st.borderTopWidth || '0')
    const bc = parse(st.borderTopColor)
    if (!bc || bc.a < 0.05 || bw < 1) continue
    const bg = bgOf(el, true)
    if (bg.gradient) continue
    uiChecked++
    const cr = ratio(comp(bc, bg), bg)
    if (cr < 3) {
      uiFailures.push({
        selector: sel(el), text: text(el), boundary: 'border-top',
        measured: +cr.toFixed(2), expected: 3, border: st.borderTopColor,
        bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`,
      })
    }
  }

  // ---- Touch targets (>=44x44 CSS px) ----
  const touchFailures = []
  let touchChecked = 0
  for (const el of document.querySelectorAll(INTERACTIVE)) {
    if (!isVisible(el) || isHiddenA11y(el) || el.closest('svg')) continue
    if (el.getAttribute('tabindex') === '-1') continue
    const r = el.getBoundingClientRect()
    touchChecked++
    if (r.width + 0.5 < 44 || r.height + 0.5 < 44) {
      touchFailures.push({
        selector: sel(el), text: text(el), ariaLabel: el.getAttribute('aria-label'),
        measured: { width: +r.width.toFixed(1), height: +r.height.toFixed(1) },
        expected: { width: 44, height: 44 },
      })
    }
  }

  // ---- Accessible names (icon-only controls + form fields) ----
  const nameFailures = []
  let nameChecked = 0
  for (const el of document.querySelectorAll('button, a[href], input, select, textarea, [role="button"], [role="switch"]')) {
    if (!isVisible(el) || isHiddenA11y(el)) continue
    nameChecked++
    const labelled = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') ||
      el.getAttribute('title') || (el.id && document.querySelector(`label[for="${el.id}"]`)) ||
      el.closest('label') || text(el)
    if (!labelled || !String(labelled).trim()) {
      nameFailures.push({ selector: sel(el), tag: el.tagName.toLowerCase(), expected: 'non-empty accessible name' })
    }
  }

  // ---- DOM-order focusable inventory (for keyboard reachability) ----
  const focusable = [...document.querySelectorAll(INTERACTIVE)].filter((el) =>
    isVisible(el) && !isHiddenA11y(el) && el.getAttribute('tabindex') !== '-1' && !el.disabled)
  const orderIndex = new Map(focusable.map((el, i) => [el, i]))

  return {
    text: { checked: textChecked, gradientSkipped: textGradientSkipped, failures: textFailures },
    ui: { checked: uiChecked, failures: uiFailures },
    touch: { checked: touchChecked, failures: touchFailures },
    names: { checked: nameChecked, failures: nameFailures },
    _focusableCount: focusable.length,
  }
}

const REDUCED_FN = () => {
  const visible = (el) => {
    const r = el.getBoundingClientRect()
    const s = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden'
  }
  const offenders = []
  let checked = 0
  let maxAnim = 0
  let maxTrans = 0
  for (const el of document.querySelectorAll('*')) {
    if (!visible(el)) continue
    const s = getComputedStyle(el)
    const a = parseFloat(s.animationDuration || '0') || 0
    const t = parseFloat(s.transitionDuration || '0') || 0
    checked++
    maxAnim = Math.max(maxAnim, a)
    maxTrans = Math.max(maxTrans, t)
    if (a > 0.01 || t > 0.01) {
      offenders.push({
        element: `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(/\s+/).slice(0, 2).join('.') : ''}`,
        animationDuration: s.animationDuration,
        transitionDuration: s.transitionDuration,
      })
    }
  }
  return {
    matchesReducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    checked,
    maxAnimationDurationSeconds: maxAnim,
    maxTransitionDurationSeconds: maxTrans,
    offendingElementCount: offenders.length,
    offenders: offenders.slice(0, 25),
  }
}

async function focusAudit(page, expectedFocusableCount) {
  // Reset to document start using the skip link / first Tab from body.
  await page.evaluate(() => { document.body.focus(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur() })
  const seen = []
  for (let i = 0; i < Math.min(Math.max(expectedFocusableCount + 4, 12), 70); i++) {
    await page.keyboard.press('Tab')
    // Focus rings use a 150ms CSS transition; sample after it settles.
    await page.waitForTimeout(260)
    const info = await page.evaluate(() => {
      const a = document.activeElement
      if (!a || a === document.body || a === document.documentElement) return { none: true }
      const s = getComputedStyle(a)
      const r = a.getBoundingClientRect()
      const label = a.getAttribute('aria-label') || (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) || a.tagName.toLowerCase()
      const _cv = document.createElement('canvas')
      _cv.width = _cv.height = 1
      const _ctx = _cv.getContext('2d')
      const parse = (c) => {
        if (!c || c === 'none' || c === 'transparent') return null
        try {
          _ctx.clearRect(0, 0, 1, 1)
          _ctx.fillStyle = '#000'
          _ctx.fillStyle = c
          _ctx.fillRect(0, 0, 1, 1)
          const d = _ctx.getImageData(0, 0, 1, 1).data
          if (d[3] === 0) return null
          return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 }
        } catch { return null }
      }
      const bgOf = (el) => {
        let n = el.parentElement
        const layers = []
        while (n && n.nodeType === 1) {
          const cs = getComputedStyle(n)
          const c = parse(cs.backgroundColor)
          if (c && c.a > 0.005) {
            layers.push(c)
            if (c.a >= 0.999) break
          }
          n = n.parentElement
        }
        if (!layers.length) return { r: 255, g: 255, b: 255, a: 1 }
        const merge = (fg, bg) => ({
          r: fg.r * fg.a + bg.r * (1 - fg.a),
          g: fg.g * fg.a + bg.g * (1 - fg.a),
          b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1,
        })
        let out = layers[layers.length - 1]
        for (let i = layers.length - 2; i >= 0; i--) out = merge(layers[i], out)
        return out
      }
      const firstVisibleColor = (s) => {
        const tokens = String(s || '').match(/(oklch|oklab|rgba?|hsla?|color)\([^)]*\)/g) || []
        for (const t of tokens) {
          const c = parse(t)
          if (c && c.a > 0.05) return c
        }
        return null
      }
      const lum = ({ r, g, b }) => {
        const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
      }
      const cr = (x, y) => { const l1 = lum(x), l2 = lum(y); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) }
      const bg = bgOf(a)
      let indicator = null
      let indicatorRatio = null
      if (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth || '0') >= 1) {
        const oc = parse(s.outlineColor)
        if (oc && oc.a > 0.05) {
          indicator = `outline ${s.outlineWidth} ${s.outlineStyle} ${s.outlineColor}`
          indicatorRatio = +cr({ r: oc.r * oc.a + bg.r * (1 - oc.a), g: oc.g * oc.a + bg.g * (1 - oc.a), b: oc.b * oc.a + bg.b * (1 - oc.a) }, bg).toFixed(2)
        }
      }
      if (indicator == null && s.boxShadow && s.boxShadow !== 'none') {
        const oc = firstVisibleColor(s.boxShadow)
        if (oc && oc.a > 0.05) {
          indicator = `box-shadow ${s.boxShadow}`
          indicatorRatio = +cr({ r: oc.r * oc.a + bg.r * (1 - oc.a), g: oc.g * oc.a + bg.g * (1 - oc.a), b: oc.b * oc.a + bg.b * (1 - oc.a) }, bg).toFixed(2)
        }
      }
      let selector = a.tagName.toLowerCase()
      if (a.id) selector += '#' + a.id
      else if (typeof a.className === 'string' && a.className.trim()) selector += '.' + a.className.split(/\s+/).slice(0, 2).join('.')
      return {
        label: String(label), selector,
        rect: { w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
        indicator, indicatorRatio, bg: `rgb(${bg.r},${bg.g},${bg.b})`,
      }
    })
    seen.push(info)
  }
  const failures = []
  let checked = 0
  for (let i = 0; i < seen.length; i++) {
    const f = seen[i]
    if (f.none) continue
    checked++
    if (!f.indicator) {
      failures.push({ ...f, problem: 'no visible focus indicator', expected: 'outline/ring >=1px with >=3:1 contrast' })
    } else if (f.indicatorRatio != null && f.indicatorRatio < 3) {
      failures.push({ ...f, problem: 'focus indicator contrast below 3:1', expected: 3 })
    }
  }
  const labels = seen.filter((s) => !s.none).map((s) => s.label)
  const unique = new Set(labels)
  const repeats = labels.length - unique.size
  const trap = unique.size <= 4 && labels.length >= 8
  const duplicates = repeats > Math.max(2, labels.length * 0.35)
  return {
    focusStopsChecked: checked,
    uniqueFocusStops: unique.size,
    repeats,
    trapDetected: trap || duplicates,
    sequence: labels.slice(0, 40),
    failures,
  }
}

;(async () => {
  const browser = await chromium.launch({ channel: 'chrome' })
  const results = {
    generatedAt: new Date().toISOString(),
    feature: 'dashboard-v2',
    policy: '.ai/policies/project-policy.md §5 (hard gate)',
    note: 'AA measurements on built SPA at HEAD e9faeea, mocked deterministic API, no screenshots. Failures are reported, not fixed.',
    checks: ['text-contrast-AA', 'ui-contrast-3:1', 'focus-indicator-3:1', 'touch-44px', 'accessible-names', 'keyboard-no-trap', 'prefers-reduced-motion', 'charts-not-color-alone'],
    combinations: [],
  }

  for (const route of ROUTES) {
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        const combo = `${route.id}/${vp.id}/${theme}`
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 1,
          colorScheme: theme,
        })
        const page = await context.newPage()
        await preparePage(page, theme)
        await page.goto(BASE + route.path, { waitUntil: 'domcontentloaded' })
        await page.waitForLoadState('networkidle').catch(() => {})
        await page.waitForTimeout(700)

        const m = await page.evaluate(AA_FN)
        const keyboard = await focusAudit(page, m._focusableCount)
        delete m._focusableCount

        // Reduced motion in a dedicated context with the emulated media feature.
        const rmContext = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 1,
          colorScheme: theme,
          reducedMotion: 'reduce',
        })
        const rmPage = await rmContext.newPage()
        await preparePage(rmPage, theme)
        await rmPage.goto(BASE + route.path, { waitUntil: 'domcontentloaded' })
        await rmPage.waitForLoadState('networkidle').catch(() => {})
        await rmPage.waitForTimeout(500)
        const reducedMotion = await rmPage.evaluate(REDUCED_FN)
        await rmContext.close()

        // Chart-not-color-alone evidence comes from the already captured DOM inventory.
        const inv = JSON.parse(fs.readFileSync(path.join(__dirname, 'dom-inventory.json'), 'utf8'))
          .combinations.find((c) => c.combination === combo) || {}
        const chartCheck = route.id === 'dashboard' ? {
          applicable: true,
          patternDefinitions: inv.patternDefCount || 0,
          patternFilledShapes: inv.patternFillRefCount || 0,
          legendTextsWithSourceNames: (inv.legendTexts || []).length,
          srOnlyDataTables: inv.srOnlyTableCount || 0,
          trendTextPresent: !!inv.hasTrendText,
          pass: (inv.patternDefCount || 0) > 0 && (inv.patternFillRefCount || 0) > 0 &&
            (inv.legendTexts || []).length > 0 && (inv.srOnlyTableCount || 0) > 0 && !inv.hasTrendText,
          requirement: 'patterns + legend with source names + textual sr-only table; no trend',
        } : { applicable: false, pass: true, requirement: 'no charts on /registrar' }

        const checkPass = {
          textContrast: m.text.failures.length === 0,
          uiContrast: m.ui.failures.length === 0,
          focusIndicator: keyboard.failures.length === 0,
          touchTargets: vp.id === 'm390' ? m.touch.failures.length === 0 : null,
          accessibleNames: m.names.failures.length === 0,
          keyboard: !keyboard.trapDetected,
          reducedMotion: reducedMotion.matchesReducedMotion && reducedMotion.offendingElementCount === 0,
          chartsNotColorAlone: chartCheck.pass,
        }
        const hardFailures = Object.entries(checkPass)
          .filter(([, v]) => v === false)
          .map(([k]) => k)

        const entry = {
          combination: combo,
          route: route.path,
          viewport: `${vp.width}x${vp.height}`,
          theme,
          checks: m,
          keyboard,
          reducedMotion,
          chartCheck,
          checkPass,
          hardFailures,
          verdict: hardFailures.length === 0 ? 'PASS' : 'FAIL',
        }
        results.combinations.push(entry)
        console.log(`${combo}: ${entry.verdict} | text=${m.text.failures.length} ui=${m.ui.failures.length} focus=${keyboard.failures.length} touch=${vp.id === 'm390' ? m.touch.failures.length : 'n/a(mobile-only)'} names=${m.names.failures.length} keyboardTrap=${keyboard.trapDetected} reducedMotionOffenders=${reducedMotion.offendingElementCount} chartAlone=${chartCheck.pass}`)
        await context.close()
      }
    }
  }

  const overall = results.combinations.every((c) => c.verdict === 'PASS')
  results.overall = overall ? 'PASS' : 'FAIL'
  results.summary = {
    combinations: results.combinations.length,
    failingCombinations: results.combinations.filter((c) => c.verdict === 'FAIL').length,
    failingChecks: results.combinations.flatMap((c) => c.hardFailures.map((f) => `${c.combination}:${f}`)),
  }
  fs.writeFileSync(path.join(__dirname, 'aa-results.json'), JSON.stringify(results, null, 2) + '\n')
  console.log('AA OVERALL:', results.overall, 'failures:', JSON.stringify(results.summary.failingChecks))
  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
