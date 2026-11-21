/**
 * Harness setup for splits-ver-datos-realizar TEST evidence.
 * Runs inside `playwright-cli run-code` (single function expression, no require).
 * Every API GET/PUT is intercepted with page.route(); no request reaches a
 * database or a real backend. State is attached to `page` so later run-code
 * snippets can reuse helpers and counters.
 */
async page => {
  const ISO = "2026-11-20T10:00:00Z";
  const makeTx = (id, cuentaId, monto) => ({
    id,
    split_id: 101,
    cuenta_id: cuentaId,
    alias_snapshot: `Transferencia #${id}`,
    monto_enteros: monto,
    tasa_bps: 1500,
    realizado: false,
    fecha_realizacion: null,
    created_at: ISO,
    updated_at: ISO,
  });

  const cuentas = [
    {
      id: 11,
      alias: "Cuenta Principal",
      banco: "Banco Uno",
      numero: "1234567890",
      qr_ruta: "/uploads/qr-principal.png",
      es_general: false,
      tasa_bps: 1500,
      created_at: ISO,
      updated_at: ISO,
    },
    {
      id: 3,
      alias: "General",
      banco: null,
      numero: null,
      qr_ruta: "/uploads/qr-general.png",
      es_general: true,
      tasa_bps: 0,
      created_at: ISO,
      updated_at: ISO,
    },
  ];

  const txPrincipal = Array.from({ length: 30 }, (_, i) => makeTx(1001 + i, 11, 15500));
  const txGeneral = [makeTx(2001, 3, 1000), makeTx(2002, 3, 1000)];
  const todasLasTx = [...txPrincipal, ...txGeneral];

  const h = {
    startedAt: Date.now(),
    requests: [],
    puts: [],
    gets: [],
    apiUnknown: [],
    externalAborted: [],
    failIds: new Set(),
    delayMs: 0,
    realizadas: new Set(),
    consoleErrors: [],
    pageErrors: [],
    spaOrigin: new URL(page.url()).origin,
  };

  h.json = (route, status, payload) => route.fulfill({
    status,
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*" },
    body: JSON.stringify(payload),
  });

  h.splits = () => [{
    id: 101,
    pago_id: 501,
    modo_calculo: "redondeado",
    total_pendiente: todasLasTx
      .filter(t => t.cuenta_id !== 3 && !h.realizadas.has(t.id))
      .reduce((a, t) => a + t.monto_enteros, 0),
    total_realizado: 0,
    transacciones: todasLasTx
      .filter(t => !h.realizadas.has(t.id))
      .map(t => ({ ...t, realizado: false })),
    created_at: ISO,
    updated_at: ISO,
  }];

  h.resetCounters = () => {
    h.requests = [];
    h.puts = [];
    h.gets = [];
    h.apiUnknown = [];
    h.externalAborted = [];
    h.consoleErrors = [];
    h.pageErrors = [];
  };

  h.resetScenario = async ({ failIds = [], delayMs = 0, clearRealizadas = true } = {}) => {
    h.failIds = new Set(failIds);
    h.delayMs = delayMs;
    if (clearRealizadas) h.realizadas = new Set();
    h.resetCounters();
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector('[data-slot="dialog-trigger"]', { timeout: 10000 });
    return { url: page.url(), requests: h.requests.length };
  };

  h.counts = () => ({
    requests: h.requests.length,
    gets: h.gets.length,
    puts: h.puts.length,
    getByPath: h.gets.reduce((acc, r) => {
      const key = r.path.split("?")[0];
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
    putIds: h.puts.map(r => r.id),
  });

  page.on("console", msg => {
    if (msg.type() === "error") h.consoleErrors.push(msg.text().slice(0, 300));
  });
  page.on("pageerror", err => h.pageErrors.push(String(err).slice(0, 300)));

  await page.route("**/*", async route => {
    const req = route.request();
    const method = req.method();
    const url = req.url();
    let parsed;
    try { parsed = new URL(url); } catch { return route.abort(); }

    // SPA assets are served locally by vite preview.
    if (parsed.origin === h.spaOrigin) return route.continue();

    // QR images: fulfill with a real 1x1 PNG, never fetched from a backend host.
    if (parsed.pathname.startsWith("/uploads/")) {
      h.requests.push({ method, path: parsed.pathname, kind: "asset" });
      return route.fulfill({
        status: 200,
        contentType: "image/png",
        headers: { "access-control-allow-origin": "*" },
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
          "base64",
        ),
      });
    }

    if (!parsed.pathname.startsWith("/api/v1/")) {
      h.externalAborted.push({ method, url });
      return route.abort();
    }

    const path = parsed.pathname.replace(/^\/api\/v1/, "");
    const entry = { method, path: parsed.pathname + parsed.search, at: Date.now() };
    h.requests.push(entry);

    if (method === "PUT") {
      const match = path.match(/^\/transacciones\/(\d+)\/realizar$/);
      if (!match) {
        h.apiUnknown.push(entry);
        return h.json(route, 404, { error: { code: "NOT_FOUND", message: "Unexpected PUT" } });
      }
      const id = Number(match[1]);
      h.puts.push({ ...entry, id });
      if (h.delayMs) await new Promise(resolve => setTimeout(resolve, h.delayMs));
      if (h.failIds.has(id)) {
        return h.json(route, 500, {
          error: { code: "INTERNAL", message: `Fallo forzado en #${id}` },
        });
      }
      h.realizadas.add(id);
      const tx = todasLasTx.find(t => t.id === id) || makeTx(id, 11, 15500);
      return h.json(route, 200, { data: { ...tx, realizado: true } });
    }

    if (method === "GET") {
      entry.id = null;
      h.gets.push(entry);
      if (path === "/fuentes") {
        return h.json(route, 200, { data: [{
          id: 1, alias: "Nómina", color: "#3b82f6", logo_ruta: null,
          split_auto: false, split_auto_modo: null, created_at: ISO, updated_at: ISO,
        }] });
      }
      if (path === "/cuentas") return h.json(route, 200, { data: cuentas });
      if (path === "/splits") return h.json(route, 200, { data: h.splits() });
      if (path.startsWith("/pagos")) {
        return h.json(route, 200, {
          data: [],
          meta: { page: 1, page_size: 1, total: 0, total_pages: 0 },
        });
      }
      if (path === "/dashboard/history") return h.json(route, 200, { por_mes: [] });
      if (path === "/settings/registrar") {
        return h.json(route, 200, { metodo_default: "qr", modo_default: "detallado" });
      }
      if (path === "/settings/split") {
        return h.json(route, 200, { modo_default: "redondeado" });
      }
      if (path === "/health/db") {
        return h.json(route, 200, {
          conexion: "ok", latencia_ms: 1, version_pg: "16", tamano_db: "1 MB", tablas: [],
        });
      }
      h.apiUnknown.push(entry);
      return h.json(route, 200, { data: [] });
    }

    h.apiUnknown.push(entry);
    return h.json(route, 405, { error: { code: "METHOD", message: "Method not mocked" } });
  });

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector('[data-slot="dialog-trigger"]', { timeout: 10000 });

  page.__h = h;
  return {
    browser: await page.evaluate(() => navigator.userAgent),
    url: page.url(),
    cuentas: cuentas.map(c => ({ id: c.id, alias: c.alias, es_general: c.es_general })),
    txCount: todasLasTx.length,
    initialCounts: h.counts(),
    externalAborted: h.externalAborted,
    apiUnknown: h.apiUnknown,
  };
}
