async page => {
  const h = page.__h;
  await h.resetScenario();
  await page.locator('[data-slot="dialog-trigger"]').first().click();
  const d = page.locator('[data-slot="dialog-content"]');
  await d.waitFor({ state: "visible" });
  const lightbox = page.locator('[aria-label="QR ampliado"]');

  await d.locator('button[aria-label^="Ampliar QR"]').click();
  await lightbox.waitFor({ state: "visible" });
  const P13 = await page.evaluate(() => {
    const d = document.querySelector('[data-slot="dialog-content"]');
    const lb = document.querySelector('[aria-label="QR ampliado"]');
    return {
      lightboxVisible: !!lb,
      lightboxRole: lb?.getAttribute("role"),
      lightboxModal: lb?.getAttribute("aria-modal"),
      lightboxLabel: lb?.getAttribute("aria-label"),
      bodyInert: !!d.querySelector("div[inert]"),
      footerInert: !!d.querySelector("footer[inert]"),
      headerCloseHidden: ![...d.querySelectorAll("button")].some(b =>
        (b.textContent || "").trim() === "Close"),
      closeName: lb?.querySelector("button")?.getAttribute("aria-label"),
    };
  });

  await page.keyboard.press("Escape");
  await lightbox.waitFor({ state: "hidden" });
  P13.firstEscapeClosesLightboxOnly = !(await lightbox.isVisible()) && (await d.isVisible());

  await d.locator('button[aria-label^="Ampliar QR"]').click();
  await lightbox.waitFor({ state: "visible" });
  await page.mouse.click(5, 5);
  await lightbox.waitFor({ state: "hidden" });
  P13.outsideClickClosesLightbox = !(await lightbox.isVisible()) && (await d.isVisible());
  await page.keyboard.press("Escape");
  await d.waitFor({ state: "hidden" });
  P13.secondEscapeClosesDialog = !(await d.isVisible());

  // Escape priority with the inline confirmation step.
  await page.locator('[data-slot="dialog-trigger"]').first().click();
  await d.waitFor({ state: "visible" });
  await d.locator('li [role="checkbox"]').first().click();
  await d.locator('button[aria-label^="Realizar"]').click();
  P13.confirmStepEntered = (await d.locator("footer").innerText()).includes("Marcar 1 transferencias");
  await page.keyboard.press("Escape");
  P13.escapeFromConfirmBackToSelection =
    (await d.locator("footer").innerText()).includes("Realizar (1)") && (await d.isVisible());
  await page.keyboard.press("Escape");
  await d.waitFor({ state: "hidden" });
  P13.escapeThenClosesDialog = !(await d.isVisible());

  // Escape is absorbed while the PUT is pending (slow mock).
  await h.resetScenario({ delayMs: 900 });
  await page.locator('[data-slot="dialog-trigger"]').first().click();
  await d.waitFor({ state: "visible" });
  await d.locator('li [role="checkbox"]').first().click();
  await d.locator('button[aria-label^="Realizar"]').click();
  await d.getByRole("button", { name: "Confirmar" }).click();
  await page.keyboard.press("Escape");
  P13.escapeIgnoredWhilePending =
    (await d.isVisible()) && (await d.locator("footer").getAttribute("aria-busy")) === "true";
  await d.waitFor({ state: "hidden", timeout: 10000 });

  // P15: accessible snapshot of the footer in selection and confirm steps.
  await h.resetScenario();
  await page.locator('[data-slot="dialog-trigger"]').first().click();
  await d.waitFor({ state: "visible" });
  const ariaSelection = await d.locator("footer").ariaSnapshot();
  const names = await page.evaluate(() => {
    const d = document.querySelector('[data-slot="dialog-content"]');
    const cbs = [...d.querySelectorAll('[role="checkbox"]')];
    const label = document.querySelector(`label[for="${cbs[0]?.id}"]`);
    const btn = (sel) => d.querySelector(sel);
    return {
      checkboxCount: cbs.length,
      firstCheckboxId: cbs[0]?.id,
      firstCheckboxLabelText: label?.textContent.replace(/\s+/g, " ").trim().slice(0, 60) || null,
      qrName: btn('button[aria-label^="Ampliar QR"]')?.getAttribute("aria-label"),
      realizarName: btn('button[aria-label^="Realizar"]')?.getAttribute("aria-label"),
      liveRegion: btn('[aria-live="polite"]')?.getAttribute("aria-live"),
    };
  });

  // Tab order from the first checkbox in the selection step.
  const activeInfo = () => page.evaluate(() => {
    const el = document.activeElement;
    return {
      tag: el?.tagName?.toLowerCase(),
      role: el?.getAttribute("role"),
      text: (el?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40),
      aria: el?.getAttribute("aria-label"),
    };
  });
  await d.locator('li [role="checkbox"]').first().focus();
  const tabOrderSelection = [await activeInfo()];
  for (let i = 0; i < 34; i++) {
    await page.keyboard.press("Tab");
    tabOrderSelection.push(await activeInfo());
  }
  const indexOf = (arr, pred) => arr.findIndex(pred);
  const iCheck = indexOf(tabOrderSelection, x => x.role === "checkbox");
  const iCancelar = indexOf(tabOrderSelection, x => x.text === "Cancelar");
  const iRealizar = indexOf(tabOrderSelection, x => x.aria?.startsWith("Realizar"));
  const P15 = {
    names,
    ariaSelection: ariaSelection.slice(0, 1200),
    tabOrderSelectionSample: tabOrderSelection.slice(0, 6),
    iCheck, iCancelar, iRealizar,
    logicalOrder: iCheck >= 0 && iCheck < iCancelar && iCancelar < iRealizar,
    distinctStops: new Set(tabOrderSelection.map(x => `${x.role}|${x.aria}|${x.text}`)).size,
  };

  await d.locator('li [role="checkbox"]').first().click();
  await d.locator('button[aria-label^="Realizar"]').click();
  const ariaConfirm = await d.locator("footer").ariaSnapshot();
  P15.ariaConfirm = ariaConfirm.slice(0, 1200);
  P15.focusOnConfirmEntry = (await activeInfo()).text === "Confirmar";

  return { P13, P15, counts: h.counts() };
}
