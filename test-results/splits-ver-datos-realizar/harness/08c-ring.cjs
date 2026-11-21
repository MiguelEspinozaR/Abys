async page => {
  const h = page.__h;
  await h.resetScenario();
  await page.locator('[data-slot="dialog-trigger"]').first().click();
  const d = page.locator('[data-slot="dialog-content"]');
  await d.waitFor({ state: "visible" });
  await d.locator('li [role="checkbox"]').first().click();
  await d.locator('li [role="checkbox"]').first().focus();
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const a = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
    if (a?.startsWith("Realizar")) break;
  }
  return page.evaluate(() => {
    const dump = el => {
      const s = getComputedStyle(el);
      return {
        tag: el.tagName, aria: el.getAttribute("aria-label"),
        className: el.className,
        fv: el.matches(":focus-visible"),
        boxShadow: s.boxShadow,
        ringShadow: s.getPropertyValue("--tw-ring-shadow"),
        ringColor: s.getPropertyValue("--tw-ring-color"),
        ringOffsetShadow: s.getPropertyValue("--tw-ring-offset-shadow"),
        shadow: s.getPropertyValue("--tw-shadow"),
        borderColor: s.borderColor,
      };
    };
    return {
      btn: dump(document.activeElement),
      checkbox: dump(document.querySelector('[role="checkbox"]')),
    };
  });
}
