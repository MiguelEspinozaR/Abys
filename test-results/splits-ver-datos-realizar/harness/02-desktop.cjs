async page => {
  const h = page.__h;
  await page.setViewportSize({ width: 1280, height: 720 });
  await h.resetScenario();
  await page.locator('[data-slot="dialog-trigger"]').first().click();
  const d = page.locator('[data-slot="dialog-content"]');
  await d.waitFor({ state: "visible" });

  const live = d.locator('footer [aria-live="polite"]').first();
  const realizar = d.locator('button[aria-label^="Realizar"]');
  const boxes = role => d.locator(`li [role="${role}"]`);
  const checks = boxes("checkbox");
  const rowCount = await d.locator("li").count();

  const p5 = {
    countText: (await live.innerText()).replace(/\s+/g, " ").trim(),
    disabled: await realizar.isDisabled(),
    label: await realizar.getAttribute("aria-label"),
    text: (await realizar.innerText()).trim(),
  };

  const scrollBefore = await d.evaluate(el => ({
    scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, scrollTop: el.scrollTop,
  }));

  // P4: select 3, verify count/format/aria-live, then uncheck one and recheck.
  await checks.nth(0).click();
  await checks.nth(1).click();
  await checks.nth(2).click();
  const p4 = {
    countText: (await live.innerText()).replace(/\s+/g, " ").trim(),
    ariaLive: await live.getAttribute("aria-live"),
    disabled: await realizar.isDisabled(),
    label: await realizar.getAttribute("aria-label"),
    text: (await realizar.innerText()).trim(),
  };
  await checks.nth(2).click();
  const p4Uncheck = (await live.innerText()).replace(/\s+/g, " ").trim();
  await checks.nth(2).click();
  const p4Recheck = (await live.innerText()).replace(/\s+/g, " ").trim();

  // P1: scroll to the very last row.
  await d.locator("li").last().scrollIntoViewIfNeeded();
  const scrollAfter = await d.evaluate(el => ({
    scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, scrollTop: el.scrollTop,
    maxScrollTop: el.scrollHeight - el.clientHeight,
  }));
  const lastRow = d.locator("li").last();
  const lastRowBox = await lastRow.boundingBox();
  const dialogBox = await d.boundingBox();
  const p1 = {
    rowCount,
    scrollable: scrollBefore.scrollHeight > scrollBefore.clientHeight,
    scrollBefore, scrollAfter,
    lastRowVisible: await lastRow.isVisible(),
    lastRowWithinDialog:
      lastRowBox.y >= dialogBox.y - 1 &&
      lastRowBox.y + lastRowBox.height <= dialogBox.y + dialogBox.height + 1,
    lastRowText: (await lastRow.innerText()).replace(/\s+/g, " ").trim().slice(0, 80),
  };

  // P3: sticky footer + subtotal/count still visible at the bottom.
  const footer = d.locator("footer");
  const footerBox = await footer.boundingBox();
  const p3 = {
    footerVisible: await footer.isVisible(),
    subtotalVisible: await live.isVisible(),
    countVisible: await footer.getByText("3 seleccionadas").isVisible(),
    subtotalText: (await live.innerText()).replace(/\s+/g, " ").trim(),
    footerBox, dialogBox,
    footerBottomGapToDialog: Math.round(dialogBox.y + dialogBox.height - (footerBox.y + footerBox.height)),
    ariaLive: await live.getAttribute("aria-live"),
  };

  await page.screenshot({
    path: "/home/miky/Documentos/finanzasMikyGoRef/test-results/splits-ver-datos-realizar/01-lista-larga-subtotal.png",
  });

  return { P1: p1, P3: p3, P4: { ...p4, p4Uncheck, p4Recheck }, P5: p5, P6: p4, counts: h.counts() };
}
