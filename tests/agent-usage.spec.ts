import { expect, test, type Page } from '@playwright/test';

const installed = ['wolinet'];
const usageButton = (page: Page) => page.getByRole('button', { name: 'Agent usage', exact: true });
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Agent usage', exact: true });
const card = (page: Page, name: string) => dialog(page).locator('.usage-card').filter({ hasText: name });
const refresh = (page: Page) => dialog(page).getByRole('button', { name: 'Refresh usage', exact: true });
const calls = (page: Page): Promise<{ provider: string; refresh: boolean }[]> => page.evaluate(() => (window as any).__usageFixture.calls);
const tab = (page: Page, name: string) => dialog(page).getByRole('tab', { name, exact: true });
const hourOn = (daysBack: number, hour = 14) => { const now = new Date(); return Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysBack, hour).getTime() / 3_600_000); };
const ledger = () => ({
  scannedAt: Date.now(), pricing: { source: 'live', fetchedAt: Date.now() }, sources: [{ provider: 'wolinet', files: 5 }],
  models: [{ provider: 'wolinet', name: 'wolinet-pro', priced: true }, { provider: 'wolinet', name: 'wolinet-coder', priced: true }, { provider: 'wolinet', name: 'wolinet-flash', priced: false }],
  rows: [[hourOn(0), 0, 1000, 90_000, 2000, 7000, 4.25, 3.1], [hourOn(2), 1, 5000, 40_000, 0, 5000, 1.5, 0.4], [hourOn(2), 2, 9000, 0, 0, 1000, 0, 0], [hourOn(60), 0, 100, 100, 0, 100, 20, 0]],
  sessions: [{ provider: 'wolinet', first: hourOn(3), last: hourOn(0) }, { provider: 'wolinet', first: hourOn(2), last: hourOn(2) }, { provider: 'wolinet', first: hourOn(60), last: hourOn(60) }],
});

async function openApp(page: Page, hold: string[] = [], failures: string[] = []): Promise<void> {
  await page.addInitScript(({ hold, failures, ledgerFixture }) => {
    const result = (provider: string, status: string, message: string | null = null) => ({
      provider, status, windows: [], plan: null, message, checkedAt: Date.now(), stale: false, source: null, dashboardUrl: null,
    });
    (window as any).__usageFixture = {
      hold, failures, calls: [], pending: [], ledgerCalls: [], ledgerError: null, ledger: ledgerFixture,
      prompts: [[Math.floor(Date.now() / 3_600_000), 'wolinet', 4]],
      responses: {
        wolinet: {
          ...result('wolinet', 'ready'), plan: 'Pro', source: 'Wolinet AI Platform',
          windows: [
            { label: '5-hour window', usedPercent: 35, resetsAt: new Date(Date.now() + 7_200_000).toISOString(), detail: null },
            { label: 'Weekly window', usedPercent: 68, resetsAt: new Date(Date.now() + 172_800_000).toISOString(), detail: 'All models' },
          ],
        },
      },
    };
  }, { hold, failures, ledgerFixture: ledger() });
  await page.route('**/src/preview.ts*', async route => {
    const response = await route.fetch();
    const source = await response.text();
    const marker = /switch\s*\(command\)\s*\{/;
    expect(source).toMatch(marker);
    await route.fulfill({ response, body: source.replace(marker, `
      if (command === 'usage_ledger') {
        const fixture = window.__usageFixture;
        fixture.ledgerCalls.push(structuredClone(args));
        if (fixture.ledgerError) throw new Error(fixture.ledgerError);
        return structuredClone(fixture.ledger);
      }
      if (command === 'prompt_activity') return structuredClone(window.__usageFixture.prompts);
      if (command === 'agent_usage') {
        const fixture = window.__usageFixture;
        fixture.calls.push(structuredClone(args));
        if (fixture.failures.includes(args.provider)) throw new Error('Usage service temporarily unavailable.');
        const result = structuredClone(fixture.responses[args.provider]);
        if (fixture.hold.includes(args.provider)) return new Promise(resolve => {
          fixture.pending.push({ provider: args.provider, resolve, result });
        });
        return result;
      }
      switch (command) {
    `) });
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('textbox', { name: 'Message your coding agent' })).toBeEnabled();
}

async function openUsage(page: Page): Promise<void> {
  await usageButton(page).click();
  await expect(dialog(page)).toBeVisible();
}

async function release(page: Page, provider?: string): Promise<void> {
  await page.evaluate(async provider => {
    const fixture = (window as any).__usageFixture;
    const pending = fixture.pending.filter((entry: any) => !provider || entry.provider === provider);
    fixture.pending = fixture.pending.filter((entry: any) => provider && entry.provider !== provider);
    for (const entry of pending) entry.resolve(entry.result);
    // Let invoke and the panel's result handlers settle before checking the DOM.
    await new Promise(resolve => setTimeout(resolve, 0));
  }, provider);
}

test('Agent usage loads only on opening and reopening, with explicit used percentages and no polling', async ({ page }, testInfo) => {
  await page.clock.install();
  await openApp(page);
  await page.clock.fastForward(60_000);
  expect(await calls(page)).toEqual([]);
  await expect(page.locator('.sidebar-bottom > #agent-usage-button')).toBeVisible();
  await openUsage(page);
  await expect(refresh(page)).toBeEnabled();
  expect((await calls(page)).map(call => call.provider).sort()).toEqual([...installed].sort());
  expect((await calls(page)).every(call => call.refresh === false)).toBe(true);
  await expect(dialog(page).locator('.usage-card')).toHaveCount(installed.length);
  await expect(card(page, 'Antigravity')).toHaveCount(0);
  await expect(tab(page, 'Overview')).toHaveAttribute('aria-selected', 'true');
  // Wolinet peaks at 68%
  await expect(dialog(page).locator('.usage-limit-hero')).toContainText('68%');
  await expect(dialog(page).locator('.usage-limit-hero')).toContainText('Across 1 agent');
  await tab(page, 'Wolinet AI').click();
  await expect(card(page, 'Wolinet AI')).toBeVisible();
  await expect(dialog(page).locator('.usage-overview')).toBeHidden();
  const wolinet = card(page, 'Wolinet AI');
  const shortWindow = wolinet.getByRole('progressbar', { name: 'Wolinet AI · 5-hour window', exact: true });
  await expect(shortWindow).toHaveAttribute('aria-valuenow', '35');
  await expect(shortWindow).toHaveAttribute('aria-valuemin', '0');
  await expect(shortWindow).toHaveAttribute('aria-valuemax', '100');
  await expect(wolinet.getByRole('progressbar', { name: 'Wolinet AI · Weekly window', exact: true })).toHaveAttribute('aria-valuenow', '68');
  await expect(wolinet).toContainText('35% used');
  await expect(wolinet).toContainText('68% used');
  await expect(wolinet).toContainText(/Resets/i);
  await expect(wolinet).toContainText('Pro');
  await page.screenshot({ path: testInfo.outputPath('agent-usage-desktop.png'), animations: 'disabled' });
  await page.clock.fastForward(300_000);
  expect(await calls(page)).toHaveLength(installed.length);
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  await page.clock.fastForward(300_000);
  expect(await calls(page)).toHaveLength(installed.length);
  await openUsage(page);
  await expect(refresh(page)).toBeEnabled();
  expect(await calls(page)).toHaveLength(installed.length * 2);
  expect((await calls(page)).every(call => call.refresh === false)).toBe(true);
});

test('Agent usage shows loading state and disables refresh while provider is loading', async ({ page }) => {
  await openApp(page, ['wolinet']);
  await openUsage(page);
  await expect(refresh(page)).toBeDisabled();
  await tab(page, 'Wolinet AI').click();
  await expect(card(page, 'Wolinet AI').locator('.usage-card-body')).toContainText('Checking limits…');
  await expect(card(page, 'Wolinet AI').getByRole('progressbar')).toHaveCount(0);
  await release(page, 'wolinet');
  await expect(card(page, 'Wolinet AI').getByRole('progressbar').first()).toHaveAttribute('aria-valuenow', '35');
  await expect(refresh(page)).toBeEnabled();
});

test('Agent usage refresh bypasses cached results and stays disabled until every provider settles', async ({ page }) => {
  await openApp(page);
  await openUsage(page);
  await expect(refresh(page)).toBeEnabled();
  await tab(page, 'Wolinet AI').click();
  await page.evaluate(installed => {
    const fixture = (window as any).__usageFixture;
    fixture.hold = installed;
    fixture.responses.wolinet.windows[0].usedPercent = 72;
  }, installed);
  await refresh(page).click();
  await expect(refresh(page)).toBeDisabled();
  await expect.poll(() => calls(page)).toHaveLength(installed.length + 1);
  await expect(card(page, 'Wolinet AI').getByRole('progressbar').first()).toHaveAttribute('aria-valuenow', '35');
  await release(page, 'wolinet');
  await expect(card(page, 'Wolinet AI').getByRole('progressbar').first()).toHaveAttribute('aria-valuenow', '72');
  await expect(refresh(page)).toBeEnabled();
  expect(await calls(page)).toHaveLength(installed.length * 2);
  const forced = (await calls(page)).slice(installed.length);
  expect(forced.map(call => call.provider).sort()).toEqual([...installed].sort());
  expect(forced.every(call => call.refresh === true)).toBe(true);
  expect(await page.evaluate(() => (window as any).__usageFixture.ledgerCalls)).toEqual([{ refresh: false }, { refresh: true }]);
});

test('Agent usage isolates a failed IPC request and recovers on refresh', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await openApp(page, [], ['wolinet']);
  await openUsage(page);
  await tab(page, 'Wolinet AI').click();
  await expect(card(page, 'Wolinet AI')).toContainText('Could not read limits. Try Refresh.');
  await expect(card(page, 'Wolinet AI').getByRole('progressbar')).toHaveCount(0);
  await expect(refresh(page)).toBeEnabled();
  await page.evaluate(() => { (window as any).__usageFixture.failures = []; });
  await refresh(page).click();
  await expect(card(page, 'Wolinet AI').getByRole('progressbar').first()).toHaveAttribute('aria-valuenow', '35');
  await expect(card(page, 'Wolinet AI')).not.toContainText('Could not read limits. Try Refresh.');
  await expect(refresh(page)).toBeEnabled();
  expect(errors).toEqual([]);
});

test('Agent usage ignores responses from a closed panel after a new panel has loaded', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await openApp(page, installed);
  await openUsage(page);
  await expect(refresh(page)).toBeDisabled();
  await expect.poll(() => calls(page)).toHaveLength(1);
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  await page.evaluate(() => {
    const fixture = (window as any).__usageFixture;
    fixture.hold = [];
    fixture.responses.wolinet.windows[0].usedPercent = 72;
  });
  await openUsage(page);
  await expect(refresh(page)).toBeEnabled();
  await tab(page, 'Wolinet AI').click();
  await expect(card(page, 'Wolinet AI').getByRole('progressbar').first()).toHaveAttribute('aria-valuenow', '72');
  const current = await dialog(page).innerText();
  await release(page);
  await expect(dialog(page)).toHaveText(current, { useInnerText: true });
  await expect(card(page, 'Wolinet AI').getByRole('progressbar').first()).toHaveAttribute('aria-valuenow', '72');
  await expect(refresh(page)).toBeEnabled();
  expect(await calls(page)).toHaveLength(installed.length * 2);
  expect(errors).toEqual([]);
});

test('Agent usage remains reachable in the sidebar, collapsed header, and board at 140% text size', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 460, height: 740 });
  await page.addInitScript(() => localStorage.setItem('pandacode.uiScale', '1.4'));
  await openApp(page);
  for (const mode of ['sidebar', 'collapsed', 'board']) {
    if (mode === 'collapsed') await page.getByRole('button', { name: 'Hide sidebar', exact: true }).click();
    if (mode === 'board') await page.getByRole('button', { name: 'Board view', exact: true }).click();
    await expect(usageButton(page)).toHaveCount(1);
    await expect(usageButton(page)).toBeVisible();
    await expect(usageButton(page)).toHaveAttribute('id', 'agent-usage-button');
    const buttonBounds = (await usageButton(page).boundingBox())!;
    expect(buttonBounds.x).toBeGreaterThanOrEqual(0);
    expect(buttonBounds.x + buttonBounds.width).toBeLessThanOrEqual(460);
    expect(buttonBounds.y + buttonBounds.height).toBeLessThanOrEqual(740);
    await usageButton(page).focus();
    await page.keyboard.press('Enter');
    await expect(dialog(page)).toBeVisible();
    await expect(refresh(page)).toBeEnabled();
    const bounds = (await dialog(page).boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(460);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(740);
    expect(await dialog(page).evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
    const cards = await dialog(page).locator('.usage-panel:not([hidden]), .usage-toolbar, .usage-agent-row').evaluateAll(nodes => nodes.map(node => {
      const bounds = node.getBoundingClientRect();
      return { name: node.className, left: bounds.left, right: bounds.right, overflow: node.scrollWidth - node.clientWidth };
    }));
    expect(cards.length).toBeGreaterThanOrEqual(installed.length);
    for (const usage of cards) {
      expect(usage.left).toBeGreaterThanOrEqual(bounds.x - 1);
      expect(usage.right).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
      expect(usage.overflow, JSON.stringify(cards.filter(card => card.overflow > 1))).toBeLessThanOrEqual(1);
    }
    await page.screenshot({ path: testInfo.outputPath(`agent-usage-${mode}-140pct.png`), animations: 'disabled' });
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
  }
});

test('Agent usage estimates API cost by range, agent, model, and day from local logs', async ({ page }) => {
  await openApp(page);
  await openUsage(page);
  const overview = dialog(page).locator('.usage-overview');
  await expect(overview.locator('.usage-cost-hero')).toContainText('$5.75');
  await expect(overview.locator('.usage-cost-hero')).toContainText('2 sessions · past 30 days');
  await expect(overview.locator('.usage-cost-hero')).toContainText('unpriced tokens');
  const wolinetRow = overview.getByRole('button', { name: /^Wolinet AI\. \$5\.75 estimated/ });
  await expect(wolinetRow).toContainText('100% of cost');
  await expect(overview.locator('.usage-totals')).toContainText('Cache savings');
  await expect(overview.locator('.usage-totals')).toContainText('$3.50');
  const table = overview.locator('.usage-breakdown');
  await expect(table.locator('tbody tr')).toHaveCount(3);
  await expect(table.locator('tbody tr').first()).toContainText('wolinet-pro');
  await expect(table.locator('tbody tr').last()).toContainText('unpriced');
  // Re-rendering the table keeps keyboard focus on the switch that was used.
  await overview.getByRole('button', { name: 'Day', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(overview.getByRole('button', { name: 'Day', exact: true })).toBeFocused();
  await expect(table.locator('tbody tr')).toHaveCount(2);
  await overview.getByRole('button', { name: 'Week', exact: true }).click();
  await expect(overview.locator('.usage-cost-hero')).toContainText('past 7 days');
  await overview.getByRole('button', { name: 'Year', exact: true }).click();
  await expect(overview.locator('.usage-cost-hero')).toContainText('$25.75');
  await expect(overview.locator('.usage-chart-section h3')).toHaveText('Weekly cost');
  const chart = overview.getByRole('img', { name: /Estimated API cost over time/ });
  await chart.focus(); await page.keyboard.press('End');
  await expect(overview.locator('.cost-chart-readout')).toContainText('$5.75');
  await overview.getByRole('button', { name: /^Wolinet AI\. \$25\.75 estimated/ }).click();
  await expect(tab(page, 'Wolinet AI')).toHaveAttribute('aria-selected', 'true');
  await expect(tab(page, 'Wolinet AI')).toBeFocused();
  const wolinet = card(page, 'Wolinet AI');
  await expect(wolinet.locator('.usage-agent-cost-section')).toContainText('$25.75');
  await expect(wolinet.getByRole('listbox', { name: 'Wolinet AI daily tokens' })).toBeVisible();
});

test('Agent usage keeps limits working when local logs cannot be read', async ({ page }) => {
  await page.addInitScript(() => { const wait = setInterval(() => { const fixture = (window as any).__usageFixture; if (fixture) { fixture.ledgerError = 'Reading agent logs took too long. Try again later.'; clearInterval(wait); } }, 0); });
  await openApp(page);
  await openUsage(page);
  await expect(dialog(page).locator('.usage-cost-hero').getByRole('alert')).toHaveText('Reading agent logs took too long. Try again later.');
  await expect(dialog(page).locator('.usage-limit-hero')).toContainText('68%');
  await expect(dialog(page).locator('.cost-chart')).toHaveCount(0);
});
