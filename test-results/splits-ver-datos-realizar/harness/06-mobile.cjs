async page => {
  const h = page.__h;
  await page.setViewportSize({ width: 375, height: 812 });
  await h.resetScenario();
  await page.locator('[data-slot="dialog-trigger"]').first().click();
  const d = page.locator('[data-slot="dialog-content"]');
  await d.waitFor({ state: "visible" });
  await d.focus();

  const dialogBox = await d.boundingBox();
  const viewport = page.viewportSize();
  const scroll0 = await d.evaluate(el => ({ top: el.scrollTop, sh: el.scrollHeight, ch: el.clientHeight }));

  for (let i = 0; i < 3; i++) await page.keyboard.press("PageDown");
  await page.waitForTimeout(150);
  const scrollPageDown = await d.evaluate(el => el.scrollTop);
  await page.keyboard.press("End");
  await page.waitForTimeout(250);
  const scrollEnd = await d.evaluate(el => ({
    top: el.scrollTop, max: el.scrollHeight - el.clientHeight,
  }));

  const P2 = {
    viewport,
    dialogBox,
    withinViewport:
      dialogBox.x >= -1 && dialogBox.y >= -1 &&
      dialogBox.x + dialogBox.width <= viewport.width + 1 &&
      dialogBox.y + dialogBox.height <= viewport.height + 1,
    scroll0,
    scrollPageDown,
    scrollEnd,
    pageDownWorks: scrollPageDown > scroll0.top,
    endWorks: scrollEnd.top >= scrollEnd.max - 2,
    lastRowVisible: await d.locator("li").last().isVisible(),
  };

  const checks = d.locator('li [role="checkbox"]');
  const live = d.locator('footer [aria-live="polite"]').first();
  const btnBox = loc => loc.boundingBox().then(b => ({
    w: Math.round(b.width * 10) / 10, h: Math.round(b.height * 10) / 10,
  }));

  const targets = {
    qr: await btnBox(d.locator('button[aria-label^="Ampliar QR"]')),
    cancelar: await btnBox(d.getByRole("button", { name: "Cancelar" })),
    realizar: await btnBox(d.locator('button[aria-label^="Realizar"]')),
    checkbox: await btnBox(checks.first()),
  };

  // Select 3 so Realizar is enabled, then capture the mobile evidence shot.
  await checks.nth(0).click();
  await checks.nth(1).click();
  await checks.nth(2).click();
  await d.locator("li").last().scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "/home/miky/Documentos/finanzasMikyGoRef/test-results/splits-ver-datos-realizar/03-movil.png",
  });
  targets.realizarEnabled = await btnBox(d.locator('button[aria-label^="Realizar"]'));

  await d.locator('button[aria-label^="Realizar"]').click();
  targets.volver = await btnBox(d.getByRole("button", { name: "Volver" }));
  targets.confirmar = await btnBox(d.getByRole("button", { name: "Confirmar" }));

  // Lightbox close button is also an overlay target.
  await page.keyboard.press("Escape"); // confirmación → selección
  await d.locator('button[aria-label^="Ampliar QR"]').click();
  const lightbox = page.locator('[aria-label="QR ampliado"]');
  await lightbox.waitFor({ state: "visible" });
  targets.cerrarLightbox = await btnBox(lightbox.getByRole("button", { name: "Cerrar" }));

  const P14 = {
    viewport: "375x812",
    targets,
    allAtLeast44: Object.values(targets).every(t => t.w >= 44 && t.h >= 44),
  };
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1280, height: 720 });
  return { P2, P14, counts: h.counts() };
}
