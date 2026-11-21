async page => {
  const h = page.__h;
  await h.resetScenario();
  await page.locator('[data-slot="dialog-trigger"]').first().click();
  const d = page.locator('[data-slot="dialog-content"]');
  await d.waitFor({ state: "visible" });
  await d.locator('li [role="checkbox"]').first().click();

  const activeInfo = () => page.evaluate(() => {
    const el = document.activeElement;
    return {
      role: el?.getAttribute("role"),
      text: (el?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 30),
      aria: el?.getAttribute("aria-label"),
    };
  });
  const walk = async () => {
    const stops = [await activeInfo()];
    for (let i = 0; i < 35; i++) {
      await page.keyboard.press("Tab");
      stops.push(await activeInfo());
    }
    return stops;
  };
  const firstUniquePositions = (stops, pred) => {
    const i = stops.findIndex(pred);
    return i;
  };

  await d.locator('li [role="checkbox"]').first().focus();
  const selectionStops = await walk();
  const compact = stops => {
    const out = [];
    for (const s of stops) {
      const key = `${s.role}|${s.aria}|${s.text}`;
      if (out.length && out[out.length - 1].key === key) { out[out.length - 1].n++; continue; }
      out.push({ key, ...s, n: 1 });
    }
    return out;
  };
  const selectionCompact = compact(selectionStops);
  const idx = (stops, pred) => firstUniquePositions(stops, pred);
  const P15Order = {
    selectionCompact,
    iCheck: idx(selectionStops, s => s.role === "checkbox"),
    iCancelar: idx(selectionStops, s => s.text === "Cancelar"),
    iRealizar: idx(selectionStops, s => s.aria?.startsWith("Realizar")),
    iClose: idx(selectionStops, s => s.text === "Close"),
    logical: (() => {
      const a = idx(selectionStops, s => s.role === "checkbox");
      const b = idx(selectionStops, s => s.text === "Cancelar");
      const c = idx(selectionStops, s => s.aria?.startsWith("Realizar"));
      return a >= 0 && a < b && b < c;
    })(),
    noTrap: selectionCompact.length >= 4 && selectionStops.some(s => s.text === "Close"),
  };

  await d.locator('button[aria-label^="Realizar"]').click();
  await d.locator('li [role="checkbox"]').first().focus();
  const confirmStops = await walk();
  const P15ConfirmOrder = {
    compact: compact(confirmStops),
    iVolver: idx(confirmStops, s => s.text === "Volver"),
    iConfirmar: idx(confirmStops, s => s.text === "Confirmar"),
    logical: idx(confirmStops, s => s.text === "Volver") < idx(confirmStops, s => s.text === "Confirmar"),
  };
  return { P15Order, P15ConfirmOrder };
}
