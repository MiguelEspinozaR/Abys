async page => {
  const h = page.__h;
  await h.resetScenario({ failIds: [1002] });
  await page.locator('[data-slot="dialog-trigger"]').first().click();
  const d = page.locator('[data-slot="dialog-content"]');
  await d.waitFor({ state: "visible" });
  const checks = d.locator('li [role="checkbox"]');
  await checks.nth(0).click();
  await checks.nth(1).click();
  await checks.nth(2).click();
  await d.locator('button[aria-label^="Realizar"]').click();
  await d.getByRole("button", { name: "Confirmar" }).click();

  const status = d.locator('footer [role="status"]');
  await status.waitFor({ state: "visible", timeout: 10000 });
  const statusText = (await status.innerText()).replace(/\s+/g, " ").trim();
  const firstRoundIds = h.puts.map(p => p.id);
  const afterFailure = {
    statusText,
    statusAriaLive: await status.getAttribute("aria-live"),
    dialogStillOpen: await d.isVisible(),
    footerText: (await d.locator("footer").innerText()).replace(/\s+/g, " ").trim(),
    selectedCountText: (await d.locator('footer [aria-live="polite"]').first().innerText()).replace(/\s+/g, " ").trim(),
    confirmText: (await d.locator("footer").innerText()).includes("Marcar 1 transferencias"),
    firstRoundIds,
    toasts: (await page.locator("[data-sonner-toast]").allTextContents()).map(t => t.replace(/\s+/g, " ").trim()),
    toastsWithFailedId: (await page.locator("[data-sonner-toast]").allTextContents()).filter(t => t.includes("#1002")).length,
  };

  // Retry: clear the forced failure (endpoint is idempotent) and resend only the failed id.
  h.failIds.delete(1002);
  const putsBeforeRetry = h.puts.length;
  await d.getByRole("button", { name: "Confirmar" }).click();
  await d.waitFor({ state: "hidden", timeout: 10000 });
  await page.waitForTimeout(250);
  const retryIds = h.puts.slice(putsBeforeRetry).map(p => p.id);
  const P12 = {
    afterFailure,
    retryIds,
    retryOnlyFailedId: retryIds.length === 1 && retryIds[0] === 1002,
    dialogClosedAfterRetry: !(await d.isVisible()),
    toastsAfterRetry: (await page.locator("[data-sonner-toast]").allTextContents()).map(t => t.replace(/\s+/g, " ").trim()),
    totalPuts: h.puts.length,
    totalPutIds: h.puts.map(p => p.id),
  };
  return { P12, counts: h.counts(), consoleErrors: h.consoleErrors, pageErrors: h.pageErrors };
}
