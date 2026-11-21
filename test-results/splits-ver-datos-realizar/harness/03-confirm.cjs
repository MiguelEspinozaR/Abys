async page => {
  const h = page.__h;
  await h.resetScenario();
  await page.locator('[data-slot="dialog-trigger"]').first().click();
  const d = page.locator('[data-slot="dialog-content"]');
  await d.waitFor({ state: "visible" });
  const checks = d.locator('li [role="checkbox"]');
  await checks.nth(0).click();
  await checks.nth(1).click();
  await checks.nth(2).click();
  const selectedIds = [1001, 1002, 1003];

  await d.locator('button[aria-label^="Realizar"]').click();
  const confirmText = (await d.locator("footer").innerText()).replace(/\s+/g, " ").trim();
  const P7 = {
    confirmText,
    hasCount: confirmText.includes("3"),
    hasAmount: confirmText.includes("465,00 Bs"),
    putsBeforeConfirm: h.puts.length,
    toastsBeforeConfirm: await page.locator("[data-sonner-toast]").count(),
  };
  await page.screenshot({
    path: "/home/miky/Documentos/finanzasMikyGoRef/test-results/splits-ver-datos-realizar/02-confirmacion.png",
  });

  const getsBefore = h.counts().getByPath;
  await d.getByRole("button", { name: "Confirmar" }).click();
  await d.waitFor({ state: "hidden", timeout: 10000 });
  await page.waitForTimeout(400);
  const getsAfter = h.counts().getByPath;
  await page.waitForTimeout(900);
  const getsSettled = h.counts().getByPath;

  const toastNodes = await page.locator("[data-sonner-toast]").allTextContents();
  const P8 = {
    putIds: h.puts.map(p => p.id),
    putUrls: h.puts.map(p => `${p.method} ${p.path}`),
    expected: selectedIds,
    exactlyOncePerId: selectedIds.every(id => h.puts.filter(p => p.id === id).length === 1) &&
      h.puts.length === selectedIds.length,
  };
  const P9 = {
    toastCount: toastNodes.length,
    toasts: toastNodes.map(t => t.replace(/\s+/g, " ").trim()),
    getsBefore, getsAfter, getsSettled,
    stableAfterSettle: JSON.stringify(getsAfter) === JSON.stringify(getsSettled),
  };

  // P11: reopen — selection cleared, Realizar disabled, list refetched with 27 rows.
  await page.locator('[data-slot="dialog-trigger"]').first().click();
  await d.waitFor({ state: "visible" });
  const P11 = {
    reopened: await d.isVisible(),
    liveText: (await d.locator('footer [aria-live="polite"]').first().innerText()).replace(/\s+/g, " ").trim(),
    realizarDisabled: await d.locator('button[aria-label^="Realizar"]').isDisabled(),
    rowsAfter: await d.locator("li").count(),
    splitsGets: h.gets.filter(g => g.path.startsWith("/api/v1/splits")).length,
  };
  await page.keyboard.press("Escape");
  await d.waitFor({ state: "hidden" });

  return { P7, P8, P9, P11, counts: h.counts(), consoleErrors: h.consoleErrors, pageErrors: h.pageErrors };
}
