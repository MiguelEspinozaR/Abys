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
  await page.waitForTimeout(350);
  return page.evaluate(() => {
    const el = document.activeElement;
    const s = getComputedStyle(el);
    return { aria: el.getAttribute("aria-label"), fv: el.matches(":focus-visible"), boxShadow: s.boxShadow, borderColor: s.borderColor };
  });
}
