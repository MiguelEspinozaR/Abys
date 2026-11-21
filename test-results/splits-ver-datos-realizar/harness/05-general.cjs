async page => {
  const h = page.__h;
  await h.resetScenario();
  const triggers = page.locator('[data-slot="dialog-trigger"]');
  await triggers.nth(1).click(); // General is the second mocked account.
  const d = page.locator('[data-slot="dialog-content"]');
  await d.waitFor({ state: "visible" });
  const title = (await d.locator("h2").innerText()).trim();
  const checks = d.locator('li [role="checkbox"]');
  await checks.nth(0).click();
  await checks.nth(1).click();

  const realizar = d.locator('button[aria-label^="Realizar"]');
  const ayuda = d.locator('p[id^="ayuda-general"]');
  const P10 = {
    title,
    selectedCount: (await d.locator('footer [aria-live="polite"]').first().innerText()).replace(/\s+/g, " ").trim(),
    realizarDisabled: await realizar.isDisabled(),
    realizarText: (await realizar.innerText()).trim(),
    ariaLabel: await realizar.getAttribute("aria-label"),
    ariaDescribedby: await realizar.getAttribute("aria-describedby"),
    ayudaId: await ayuda.getAttribute("id"),
    ayudaVisible: await ayuda.isVisible(),
    ayudaText: (await ayuda.innerText()).trim(),
    rows: await d.locator("li").count(),
  };
  // A programmatic click on a disabled button must not issue any write.
  await realizar.evaluate(el => el.click());
  await page.waitForTimeout(300);
  P10.putsAfterForcedClick = h.puts.length;
  P10.toastsAfterForcedClick = await page.locator("[data-sonner-toast]").count();
  await page.keyboard.press("Escape");
  await d.waitFor({ state: "hidden" });
  return { P10, counts: h.counts() };
}
