async page => {
  const h = page.__h;
  await page.evaluate(() => localStorage.setItem("abys-ui", JSON.stringify({ state: { tema: "light" }, version: 0 })));
  await h.resetScenario();
  await page.locator('[data-slot="dialog-trigger"]').first().click();
  const d = page.locator('[data-slot="dialog-content"]');
  await d.waitFor({ state: "visible" });
  await d.locator('li [role="checkbox"]').first().click();
  await d.locator('li [role="checkbox"]').first().focus();
  const walk = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        aria: el?.getAttribute("aria-label"), text: el?.textContent?.trim().slice(0, 20),
        fv: el?.matches(":focus-visible"),
        shadow: el ? getComputedStyle(el).boxShadow.slice(0, 220) : null,
        ringShadow: el ? getComputedStyle(el).getPropertyValue("--tw-ring-shadow").slice(0, 200) : null,
      };
    });
    walk.push(info);
    if (info.aria?.startsWith("Realizar")) break;
  }
  const btn = d.locator('button[aria-label^="Realizar"]');
  await btn.evaluate(el => el.focus());
  const afterProgrammatic = await page.evaluate(() => {
    const el = document.activeElement;
    return { fv: el.matches(":focus-visible"), shadow: getComputedStyle(el).boxShadow.slice(0, 250) };
  });

  await page.emulateMedia({ reducedMotion: "reduce" });
  const anim = await page.evaluate(() => {
    const el = document.querySelector('[data-slot="dialog-content"]');
    const s = getComputedStyle(el);
    return { name: s.animationName, duration: s.animationDuration, timing: s.animationTimingFunction };
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  return { walk: walk.slice(-4), afterProgrammatic, anim };
}
