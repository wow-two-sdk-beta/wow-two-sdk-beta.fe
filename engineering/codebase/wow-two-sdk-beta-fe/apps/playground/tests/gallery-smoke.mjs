#!/usr/bin/env node
/** Build first: pnpm -C apps/playground build. Runs against that exact dist snapshot. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
await stat(resolve(dist, 'index.html')).catch(() => {
  throw new Error('Playground dist is missing. Run pnpm -C apps/playground build first.');
});
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname === '/favicon.ico') {
      response.writeHead(204).end();
      return;
    }
    const file = resolve(dist, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(`${dist}${sep}`)) {
      response.writeHead(403).end();
      return;
    }
    const data = await readFile(file);
    response.writeHead(200, { 'content-type': contentTypes[extname(file)] ?? 'application/octet-stream' }).end(data);
  } catch {
    response.writeHead(404).end();
  }
});
const findings = { groups: [], warnings: [], expectedResourceErrors: [], errors: [], failedRequests: [] };
let browser;
let origin;

try {
  await new Promise((accept, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', accept);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(15_000);
  page.on('pageerror', (error) => findings.errors.push({ type: 'pageerror', message: error.message }));
  page.on('console', (message) => {
    const entry = { message: message.text(), url: message.location().url };
    if (message.type() === 'warning') findings.warnings.push(entry);
    if (message.type() === 'error') {
      // DisplayGroup intentionally demonstrates Avatar's broken-image fallback.
      if (entry.url === 'https://example.invalid/nope.png') findings.expectedResourceErrors.push(entry);
      else findings.errors.push({ type: 'console', ...entry });
    }
  });
  page.on('requestfailed', (request) => {
    const entry = { url: request.url(), reason: request.failure()?.errorText };
    if (entry.url === 'https://example.invalid/nope.png') findings.expectedResourceErrors.push(entry);
    else findings.failedRequests.push(entry);
  });
  // Preserve the documented broken-image behavior without depending on external DNS or networking.
  await page.route('https://example.invalid/nope.png', (route) => route.abort('failed'));

  async function settleGroup(group) {
    await page
      .locator('main h2')
      .filter({ hasText: new RegExp(`^${group}$`) })
      .waitFor({ state: 'visible' });
    // The family and its fixture chunk must resolve before an empty placeholder could pass this check.
    await page.getByText(/exported components use contextual examples below/).waitFor({ state: 'visible' });
    await page.evaluate(() => new Promise((accept) => requestAnimationFrame(() => requestAnimationFrame(accept))));
    const link = page.locator(`a[data-group="${group}"]`);
    assert.equal(await link.getAttribute('aria-current'), 'page', `${group}: selected link`);
    const boundaries = await page.locator('[data-demo-error]').allTextContents();
    assert.deepEqual(boundaries, [], `${group}: demo boundaries must remain clear`);
    assert.match(await page.getByTestId('diagnostics-toggle').innerText(), /^0 err \/ \d+ warn$/, `${group}: errors`);
  }

  async function checkTheme(id, dark) {
    await page.waitForFunction(
      ({ id, dark }) => {
        const root = document.documentElement;
        return root.classList.contains(`theme-${id}`) && root.classList.contains('dark') === dark;
      },
      { id, dark },
    );
    const state = await page.evaluate(() => {
      const style = document.getElementById('wow-two-themes');
      return {
        styleCount: document.querySelectorAll('#wow-two-themes').length,
        selectors: [...style.sheet.cssRules].map((rule) => rule.selectorText),
        css: style.textContent,
        primary: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim(),
        scheme: document.documentElement.style.colorScheme,
        storedTheme: localStorage.getItem('pg:theme'),
        storedDark: localStorage.getItem('pg:dark'),
      };
    });
    assert.equal(state.styleCount, 1);
    assert.deepEqual(state.selectors, [`.theme-${id}`, `.dark.theme-${id}, .dark .theme-${id}`], 'Only selected palette CSS is installed');
    assert.ok(state.primary, 'The selected palette exposes primary tokens');
    assert.equal(state.scheme, dark ? 'dark' : 'light');
    assert.equal(state.storedTheme, id);
    assert.equal(state.storedDark, String(dark));
    return state;
  }

  await page.goto(`${origin}/?g=layout&smoke=1#gallery`, { waitUntil: 'domcontentloaded' });
  await settleGroup('layout');
  const documentMarker = await page.evaluate(() => {
    window.__gallerySmokeDocument = crypto.randomUUID();
    return window.__gallerySmokeDocument;
  });
  assert.equal(await page.getByTestId('theme-select').inputValue(), 'smart-qr');
  await checkTheme('smart-qr', false);
  await page.getByTestId('theme-select').selectOption('wow');
  const light = await checkTheme('wow', false);
  await page.getByTestId('dark-toggle').click();
  const dark = await checkTheme('wow', true);
  assert.equal(dark.css, light.css, 'Dark mode reuses the selected palette stylesheet');
  await page.getByTestId('theme-select').selectOption('smart-qr');
  await checkTheme('smart-qr', true);
  await page.getByTestId('dark-toggle').click();
  await checkTheme('smart-qr', false);

  // Include the initially selected group, then exercise all seven real links without forced clicks.
  for (const group of ['layout', 'actions', 'forms', 'display', 'feedback', 'nav', 'overlays']) {
    await page.locator(`a[data-group="${group}"]`).click();
    await settleGroup(group);
    const url = new URL(page.url());
    assert.equal(url.searchParams.get('g'), group);
    assert.equal(url.searchParams.get('smoke'), '1');
    assert.equal(url.hash, '#gallery');
    assert.equal(await page.evaluate(() => window.__gallerySmokeDocument), documentMarker, 'Links must not reload');
    findings.groups.push(group);
  }
  await page.goBack();
  await settleGroup('nav');
  assert.equal(new URL(page.url()).searchParams.get('g'), 'nav');
  assert.equal(await page.evaluate(() => window.__gallerySmokeDocument), documentMarker, 'Back retains the document');

  assert.deepEqual(findings.failedRequests, [], 'Unexpected request failures');
  assert.deepEqual(findings.errors, [], 'Unexpected browser/console errors');
  console.log(JSON.stringify({ status: 'passed', ...findings }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ status: 'failed', origin, ...findings, failure: String(error) }, null, 2));
  process.exitCode = 1;
} finally {
  try {
    await browser?.close();
  } finally {
    server.closeAllConnections();
    await new Promise((accept) => server.close(accept));
  }
}
