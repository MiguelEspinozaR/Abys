async page => {
  page.__harnessProbe = { count: 7 };
  await page.screenshot({ path: '/tmp/opencode/probe.png' });
  return { viewport: page.viewportSize(), state: page.__harnessProbe };
}
