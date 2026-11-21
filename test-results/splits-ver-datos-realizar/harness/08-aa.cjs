/**
 * P16/P17 harness: real computed-style contrast in both themes, focus ring
 * ≥3:1, and prefers-reduced-motion. Colors are resolved to sRGB through a
 * canvas so oklch/oklab/color-mix values are handled exactly as rendered.
 */
async page => {
  const h = page.__h;
  const out = { schemes: {}, reducedMotion: null };

  const injectHelpers = () => page.evaluate(() => {
    window.__aa = (() => {
      const cv = document.createElement("canvas");
      cv.width = 1; cv.height = 1;
      const ctx = cv.getContext("2d", { willReadFrequently: true });
      const toRgb = color => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = "#000000";
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        return [d[0], d[1], d[2]];
      };
      const parseAlpha = css => {
        const m = css.match(/(?:,\s*|\/\s*)(0?\.\d+|0|1)\s*\)/);
        return m ? Number(m[1]) : 1;
      };
      const stripAlpha = css => css
        .replace(/\/[^)]*\)$/, ")")
        .replace(/,\s*(?:0?\.\d+|0|1)\s*\)$/, ", 1)");
      const lum = rgb => {
        const f = v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
      };
      const ratio = (a, b) => {
        const l1 = lum(a), l2 = lum(b);
        return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 1000) / 1000;
      };
      const bgOf = el => {
        let cur = el;
        const stack = [];
        while (cur) {
          const bg = getComputedStyle(cur).backgroundColor;
          const a = parseAlpha(bg);
          if (bg && bg !== "transparent" && a > 0) stack.push({ css: bg, a, rgb: toRgb(stripAlpha(bg)) });
          if (a >= 0.999) break;
          cur = cur.parentElement;
        }
        if (!stack.length) return { css: "fallback #ffffff", rgb: [255, 255, 255] };
        let rgb = stack[stack.length - 1].rgb;
        for (let i = stack.length - 2; i >= 0; i--) {
          const s = stack[i];
          rgb = rgb.map((v, k) => Math.round(s.a * s.rgb[k] + (1 - s.a) * v));
        }
        return { css: stack.map(s => s.css).join(" over "), rgb };
      };
      const fgOf = el => {
        const css = getComputedStyle(el).color;
        return { css, rgb: toRgb(stripAlpha(css)), alpha: parseAlpha(css) };
      };
      const pair = (label, el, bgParent = false) => {
        if (!el) return { label, missing: true };
        const fg = fgOf(el);
        const bg = bgOf(bgParent ? el.parentElement : el);
        return {
          label, fgCss: fg.css, bgCss: bg.css,
          ratio: ratio(fg.rgb, bg.rgb),
          text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 70),
        };
      };
      const ring = el => {
        const shadow = getComputedStyle(el).boxShadow;
        // Tailwind emits 5 layers: offset, ring, shadow, inset, etc.
        const parts = shadow.match(/(oklch\([^)]*\)|oklab\([^)]*\)|rgba?\([^)]*\)|color\([^)]*\)|hsl\([^)]*\))\s+[^,]+/g) || [];
        const visible = parts.find(p => parseAlpha(p) > 0.01 && !/0px 0px 0px 0px/.test(p));
        const adjacent = bgOf(el.parentElement);
        return {
          visibleLayer: visible || null,
          adjacentCss: adjacent.css,
          ratio: visible ? ratio(toRgb(stripAlpha(visible.match(/^([^(]+\([^)]*\))/)[1])), adjacent.rgb) : null,
          fv: el.matches(":focus-visible"),
        };
      };
      return { pair, ring, bgOf, ratio, toRgb };
    })();
  });

  for (const tema of ["light", "dark"]) {
    await page.evaluate(t => {
      localStorage.setItem("abys-ui", JSON.stringify({ state: { tema: t }, version: 0 }));
    }, tema);
    await h.resetScenario();
    await injectHelpers();
    await page.locator('[data-slot="dialog-trigger"]').first().click();
    const d = page.locator('[data-slot="dialog-content"]');
    await d.waitFor({ state: "visible" });

    const collect = () => page.evaluate(() => {
      const a = window.__aa;
      const d = document.querySelector('[data-slot="dialog-content"]');
      const footer = d.querySelector("footer");
      const live = footer.querySelector('[aria-live="polite"]');
      const spans = live.querySelectorAll("span");
      const byText = t => [...footer.querySelectorAll("button")].find(b => b.textContent.trim() === t);
      const realizar = footer.querySelector('button[aria-label^="Realizar"]');
      const ayuda = footer.querySelector('p[id^="ayuda-general"]');
      const confirmP = footer.querySelector("p:not([id])");
      return {
        theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
        conteo: a.pair("conteo / popover", spans[0], true),
        subtotal: a.pair("subtotal / popover", spans[1], true),
        cancelar: a.pair("Cancelar / background", byText("Cancelar")),
        realizar: a.pair("Realizar / primary|muted", realizar),
        ayudaGeneral: ayuda ? a.pair("ayuda General / popover", ayuda, true) : null,
        confirmTexto: confirmP ? a.pair("texto confirmación / popover", confirmP, true) : null,
      };
    });

    const disabled = await collect();
    await d.locator('li [role="checkbox"]').first().click();
    await d.locator('li [role="checkbox"]').first().focus();
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      const aria = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
      if (aria?.startsWith("Realizar")) break;
    }
    await page.waitForTimeout(350); // button box-shadow/border transition is 100ms
    const enabled = await collect();
    const ringRealizar = await page.evaluate(() =>
      window.__aa.ring(document.querySelector('[data-slot="dialog-content"] button[aria-label^="Realizar"]')));

    await d.locator('button[aria-label^="Realizar"]').click();
    const confirm = await collect();
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await d.waitFor({ state: "hidden" });

    await page.locator('[data-slot="dialog-trigger"]').nth(1).click();
    await d.waitFor({ state: "visible" });
    await d.locator('li [role="checkbox"]').first().click();
    const general = await collect();
    await page.keyboard.press("Escape");
    await d.waitFor({ state: "hidden" });

    out.schemes[tema] = { disabled, enabled, confirm, general, ringRealizar };
  }

  // P17 — reduced motion.
  await page.evaluate(() => localStorage.setItem("abys-ui", JSON.stringify({ state: { tema: "dark" }, version: 0 })));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await h.resetScenario({ delayMs: 900 });
  await page.locator('[data-slot="dialog-trigger"]').first().click();
  const d = page.locator('[data-slot="dialog-content"]');
  await d.waitFor({ state: "visible" });
  await d.locator('li [role="checkbox"]').first().click();
  await d.locator('button[aria-label^="Realizar"]').click();
  await d.getByRole("button", { name: "Confirmar" }).click();
  out.reducedMotion = await page.evaluate(() => {
    const d = document.querySelector('[data-slot="dialog-content"]');
    const spinner = d.querySelector("footer svg");
    const qr = d.querySelector('button[aria-label^="Ampliar QR"]');
    const ss = spinner ? getComputedStyle(spinner) : null;
    const qs = qr ? getComputedStyle(qr) : null;
    const ds = getComputedStyle(d);
    return {
      match: matchMedia("(prefers-reduced-motion: reduce)").matches,
      spinnerFound: !!spinner,
      spinnerAnimationName: ss?.animationName,
      qrTransitionProperty: qs?.transitionProperty,
      qrTransitionDuration: qs?.transitionDuration,
      dialogAnimationName: ds.animationName,
      dialogAnimationDuration: ds.animationDuration,
    };
  });
  await d.waitFor({ state: "hidden", timeout: 10000 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  return out;
}
