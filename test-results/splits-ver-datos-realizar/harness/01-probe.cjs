async page => {
  const h = page.__h;
  await h.resetScenario();
  const triggers = page.locator('[data-slot="dialog-trigger"]');
  const n = await triggers.count();
  await triggers.first().click();
  const content = page.locator('[data-slot="dialog-content"]');
  await content.waitFor({ state: "visible" });
  const probe = await page.evaluate(() => {
    const d = document.querySelector('[data-slot="dialog-content"]');
    const footer = d.querySelector('footer');
    const btns = [...d.querySelectorAll('button')].map(b => ({
      text: b.textContent.trim(), aria: b.getAttribute('aria-label'),
      disabled: b.disabled, cls: b.className.slice(0, 90),
      box: (r => ({ w: Math.round(r.width), h: Math.round(r.height) }))(b.getBoundingClientRect()),
    }));
    const cs = el => {
      const s = getComputedStyle(el);
      return { color: s.color, bg: s.backgroundColor, shadow: s.boxShadow, anim: s.animationName, transition: s.transitionProperty };
    };
    const live = d.querySelector('[aria-live="polite"]');
    const help = d.querySelector('p[id^="ayuda-general"]');
    return {
      title: d.querySelector('h2')?.textContent,
      desc: d.querySelector('[data-slot="dialog-description"]')?.textContent,
      rows: d.querySelectorAll('li').length,
      scroll: { sh: d.scrollHeight, ch: d.clientHeight },
      footerBox: (r => ({ top: r.top, bottom: r.bottom, h: r.height }))(footer.getBoundingClientRect()),
      dialogBox: (r => ({ top: r.top, bottom: r.bottom, h: r.height }))(d.getBoundingClientRect()),
      liveHTML: live?.outerHTML.slice(0, 400),
      liveStyles: live ? cs(live) : null,
      countStyles: live?.querySelector('span') ? cs(live.querySelector('span')) : null,
      firstRowLabel: d.querySelector('label')?.outerHTML.slice(0, 300),
      buttons: btns,
      bodyInert: d.querySelector('div[inert]')?.hasAttribute('inert'),
      footerInert: footer.hasAttribute('inert'),
      rootVars: (() => {
        const s = getComputedStyle(document.documentElement);
        return ['--popover','--popover-foreground','--muted','--muted-foreground','--primary','--primary-foreground','--ring','--background','--foreground']
          .map(k => [k, s.getPropertyValue(k).trim()]);
      })(),
      sonnerNodes: document.querySelectorAll('[data-sonner-toast]').length,
    };
  });
  return probe;
}
