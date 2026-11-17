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

  await page.locator('a[data-group="toast-lab"]').click();
  await page.getByRole('heading', { name: 'Toast motion lab' }).waitFor();
  const preview = page.frameLocator('iframe[title="Toast notification preview"]');
  const viewport = preview.locator('.toast-preview-viewport');
  const openCards = viewport.locator(':scope > [data-state="open"]');
  const history = preview.getByRole('region', { name: 'Notification history' });
  const historyButton = preview.getByRole('button', { name: /^History/ });
  const unreadBadge = historyButton.locator('[data-notification-unread]');
  const queueBatch = page.getByRole('button', { name: 'Queue batch' });
  const clearToasts = page.getByRole('button', { name: 'Clear toasts' });
  const placement = page.getByLabel('Placement', { exact: true });
  assert.equal(await placement.inputValue(), 'top-right');

  await preview.getByRole('tab', { name: /^Posts/ }).waitFor();
  assert.equal(await preview.getByRole('tab', { name: /^Posts/ }).getAttribute('aria-selected'), 'true');
  assert.equal(await preview.getByRole('list', { name: 'Posts', exact: true }).getByRole('listitem').count(), 4);
  await preview.getByRole('button', { name: 'Rows', exact: true }).click();
  await preview.getByRole('list', { name: 'Posts', exact: true }).getByText('Chamber quartet: winter programme', { exact: true }).waitFor();
  await preview.getByRole('button', { name: 'Cards', exact: true }).click();
  await preview.getByRole('heading', { name: 'Chamber quartet: winter programme', exact: true }).waitFor();
  assert.equal(await preview.locator('a[href^="http"]').count(), 0, 'The public sample links to no external site');
  assert.match(await preview.getByRole('link', { name: 'Console home' }).first().innerText(), /Console/);

  await queueBatch.click();
  await openCards.filter({ hasText: '2 harvests queued.' }).waitFor();
  const reducedMotion = await openCards.first().evaluate((el) => {
    const style = getComputedStyle(el);
    return [style.animationName, style.transitionDuration];
  });
  assert.equal(reducedMotion[0], 'none');
  assert.ok(Number.parseFloat(reducedMotion[1]) < 0.001, 'Reduced motion skips the slide');
  await viewport.getByRole('button', { name: 'Dismiss' }).click();
  await viewport.waitFor({ state: 'hidden' });
  await unreadBadge.waitFor();
  assert.equal((await unreadBadge.textContent()).trim(), '1');
  await historyButton.click();
  await history.waitFor();
  await history.getByText('2 harvests queued.').waitFor();
  assert.equal(await history.getByRole('button', { name: 'View activity' }).count(), 1);
  await unreadBadge.waitFor({ state: 'detached' });
  await history.getByRole('button', { name: 'Delete notification' }).click();
  await history.getByText('2 harvests queued.').waitFor({ state: 'detached' });
  await historyButton.click();

  await page.getByLabel('Keep confirmations').uncheck();
  await queueBatch.click();
  await viewport.getByRole('button', { name: 'Dismiss' }).click();
  await viewport.waitFor({ state: 'hidden' });
  await historyButton.click();
  assert.equal(await history.getByText('2 harvests queued.').count(), 0, 'Retention can be turned off for confirmations');
  const popups = history.getByLabel('Toast pop-ups');
  await popups.selectOption('15m');
  await popups.locator('option[value="timed"]').waitFor({ state: 'attached' });
  assert.equal(await popups.inputValue(), 'timed');
  await popups.selectOption('manual');
  await historyButton.click();
  await queueBatch.click();
  assert.equal(await unreadBadge.count(), 0, 'A transient notice does not increase the unread badge');
  const mutedSignal = () => historyButton.locator('[data-notification-cue]').evaluate((el) => el.getAnimations().length > 0);
  await historyButton.evaluate((el) => new Promise((resolve) => el.ownerDocument.defaultView.requestAnimationFrame(resolve)));
  assert.ok(await mutedSignal(), 'A muted transient notice highlights the bell');
  assert.equal(await openCards.count(), 0);

  await page.getByLabel('Keep confirmations').check();
  await queueBatch.click();
  await unreadBadge.waitFor();
  assert.equal((await unreadBadge.textContent()).trim(), '1');
  assert.equal(await openCards.count(), 0, 'Paused notices appear in History without pop-ups');
  await historyButton.click();
  await history.getByText('2 harvests queued.').waitFor();
  await page.getByRole('button', { name: 'Urgent Undo', exact: true }).click();
  await history.getByRole('button', { name: 'Undo', exact: true }).click();
  await history.getByText('Post restored.', { exact: true }).waitFor();
  assert.equal(await history.getByText('Post removed.', { exact: true }).count(), 0);
  await popups.selectOption('on');
  assert.equal(await openCards.count(), 0, 'Resuming does not replay paused pop-ups');
  await historyButton.click();
  await page.getByLabel('Keep confirmations').uncheck();
  await page.getByLabel('Enable history').uncheck();
  await historyButton.waitFor({ state: 'detached' });
  await page.getByLabel('Enable history').check();

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const barEdge of ['bar', 'top']) {
    await page.getByLabel('Timer', { exact: true }).selectOption(barEdge);
    await queueBatch.click();
    const card = openCards.first();
    await card.waitFor();
    const draw = await card.evaluate((el) => {
      const toast = el.querySelector('[role=status]');
      const progress = el.querySelector('[data-toast-progress]');
      const toastStyle = getComputedStyle(toast);
      const progressStyle = getComputedStyle(progress);
      return {
        filter: toastStyle.backdropFilter,
        top: progressStyle.insetBlockStart,
        bottom: progressStyle.insetBlockEnd,
        height: progressStyle.blockSize,
      };
    });
    assert.match(draw.filter, /blur\(16px\)/);
    assert.equal(draw.height, '2px');
    assert.equal(barEdge === 'top' ? draw.top : draw.bottom, '6px');
    await clearToasts.click();
    await viewport.waitFor({ state: 'hidden' });
  }
  await page.getByLabel('Toast surface').selectOption('solid');
  await queueBatch.click();
  await openCards.first().waitFor();
  assert.equal(await openCards.first().locator('[role=status]').evaluate((el) => getComputedStyle(el).backdropFilter), 'none');
  await clearToasts.click();
  await viewport.waitFor({ state: 'hidden' });
  await page.getByLabel('Toast surface').selectOption('glass');

  await page.getByLabel('Timer', { exact: true }).selectOption('seconds');
  for (const [preset, width, sideInset, bottomInset] of [
    ['Desktop', 1440, 16, 16],
    ['Tablet', 768, 16, 16],
    ['Phone', 390, 12, 68],
  ]) {
    await page.getByRole('button', { name: preset, exact: true }).click();
    for (const corner of ['top-right', 'top-left', 'bottom-right', 'bottom-left']) {
      await placement.selectOption(corner);
      await queueBatch.click();
      const card = openCards.filter({ hasText: '2 harvests queued.' });
      await card.waitFor();
      const layout = await card.evaluate(async (el) => {
        const style = getComputedStyle(el);
        const timing = [style.transitionProperty, style.transitionDuration];
        await Promise.all(el.getAnimations().map((animation) => animation.finished));
        const box = el.getBoundingClientRect();
        const bar = el.ownerDocument.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
        return { width: innerWidth, top: box.top, bottom: innerHeight - box.bottom, left: box.left, right: innerWidth - box.right, bar, timing };
      });
      assert.equal(layout.width, width);
      assert.deepEqual(layout.timing, ['opacity, transform', '0.2s']);
      assert.ok(layout.left >= 11 && layout.right >= 11, `${preset} stays inside the viewport`);
      const [vertical, horizontal] = corner.split('-');
      const expectedVertical = vertical === 'top' ? layout.bar + 16 : bottomInset;
      assert.ok(
        Math.abs(layout[vertical] - expectedVertical) <= 1,
        `${preset} ${corner} vertical inset (expected ${expectedVertical}, got ${layout[vertical]})`,
      );
      assert.ok(Math.abs(layout[horizontal] - sideInset) <= 1, `${preset} ${corner} side inset`);
      if (preset === 'Phone') {
        assert.equal(layout.left, sideInset, `${corner} fills the phone width with a left gutter`);
        assert.equal(layout.right, sideInset, `${corner} fills the phone width with a right gutter`);
      }
      assert.match(await card.locator('[data-toast-timer="seconds"]').innerText(), /^\d+s$/);
      await clearToasts.click();
      await viewport.waitFor({ state: 'hidden' });
    }
  }

  await placement.selectOption('top-right');
  await page.getByRole('button', { name: 'Motion settings' }).click();
  for (const [preset, animation, transition, scale] of [
    [/^Side slide/, 'slide-in-right', '0s', 1],
    [/^Edge slide/, 'none', '0.26s', 1],
    [/^Slide and settle/, 'none', '0.24s', 0.97],
  ]) {
    await page.getByRole('button', { name: preset }).click();
    await queueBatch.click();
    await openCards.first().waitFor();
    const motion = await openCards.first().evaluate((card) => {
      const style = getComputedStyle(card);
      const transform = style.getPropertyValue('--toast-motion-transform');
      return [style.animationName, style.transitionDuration, transform.match(/scale\(([\d.]+)\)$/)?.[1] ?? '1'];
    });
    assert.equal(motion[0], animation);
    assert.equal(Number(motion[2]), scale);
    if (animation === 'none') assert.equal(motion[1], transition);
    await clearToasts.click();
    await viewport.waitFor({ state: 'hidden' });
  }
  await page.getByRole('button', { name: /^Short slide/ }).click();
  await page.getByRole('button', { name: 'Motion settings' }).click();

  await page.getByLabel('Timer', { exact: true }).selectOption('close');
  const speed = page.getByLabel('Motion speed', { exact: true });
  await speed.selectOption('0.25');
  const priority = page.getByRole('button', { name: 'Priority stack', exact: true });
  for (const corner of ['top-right', 'bottom-left']) {
    await placement.selectOption(corner);
    await priority.click();
    const task = openCards.filter({ hasText: 'Harvest running.' });
    const refresh = openCards.filter({ hasText: 'Source list refreshed.' });
    const confirmation = openCards.filter({ hasText: 'Changes saved.' });
    const pin = task.getByRole('button', { name: 'Pin notification' });
    const dismiss = task.getByRole('button', { name: 'Dismiss' });
    const ring = dismiss.locator('[data-toast-timer="closeRing"]');
    await confirmation.waitFor();
    const entryOffset = await task.evaluate((card) => {
      const entry = card.getAnimations().find((animation) => animation.transitionProperty === 'transform');
      const transform = entry?.effect?.getKeyframes()[0]?.transform;
      return transform ? new DOMMatrixReadOnly(transform).m42 : null;
    });
    assert.equal(entryOffset, corner.startsWith('top') ? 12 : -12, `${corner} enters toward the anchor`);
    assert.ok(
      await dismiss.evaluate((button) => {
        const radius = getComputedStyle(button).borderRadius;
        return radius.endsWith('%') ? Number.parseFloat(radius) >= 50 : Number.parseFloat(radius) >= button.offsetWidth / 2;
      }),
      'Dismiss uses the SDK circular button radius',
    );
    if (corner === 'top-right') {
      assert.deepEqual(
        await openCards.evaluateAll((cards) =>
          cards.map((card) => card.querySelector('[data-toast-timer] circle:last-child').getAnimations()[0].effect.getTiming().duration),
        ),
        [10000, 4000, 8000],
      );
      await pin.click();
      assert.equal(await pin.getAttribute('aria-pressed'), 'true');
      await page.mouse.move(1, 1);
      assert.equal(await ring.count(), 0, 'Pin removes the countdown ring');
    }
    await confirmation.evaluate((card) => Promise.all(card.getAnimations().map((animation) => animation.finished)));
    const oldTaskTop = (await task.boundingBox()).y;
    const oldRefreshSlot = await refresh.evaluate((card) => card.offsetTop);
    const oldConfirmationTop = (await confirmation.boundingBox()).y;
    assert.equal(Math.sign(oldConfirmationTop - oldTaskTop), corner === 'top-right' ? 1 : -1);
    if (corner === 'bottom-left') {
      await refresh.getByRole('button', { name: 'Dismiss' }).click();
      await page.mouse.move(1, 1);
    }
    const exitingRefresh = viewport.locator('[data-toast-exiting]').filter({ hasText: 'Source list refreshed.' });
    await exitingRefresh.waitFor();
    assert.equal(await exitingRefresh.evaluate((card) => card.offsetTop), oldRefreshSlot);
    await exitingRefresh.waitFor({ state: 'detached' });
    const move = await confirmation.evaluate(async (card) => {
      const reflow = card.getAnimations().find((animation) => animation.effect.getKeyframes()[0]?.translate);
      if (!reflow) return null;
      const from = reflow.effect.getKeyframes()[0].translate;
      await reflow.finished;
      return from;
    });
    assert.ok(move, 'A survivor slides into the vacated slot');
    const advance = corner === 'top-right' ? -1 : 1;
    assert.equal(Math.sign(Number.parseFloat(move.split(' ')[1])), -advance);
    assert.equal(Math.sign((await confirmation.boundingBox()).y - oldConfirmationTop), advance);
    assert.ok(Math.abs((await task.boundingBox()).y - oldTaskTop) < 1, 'The anchored card stays in place');
    if (corner === 'top-right') {
      await pin.click();
      assert.equal(await pin.getAttribute('aria-pressed'), 'false');
      await ring.waitFor();
      const restarted = await ring.locator('circle:last-child').evaluate(async (circle) => {
        const animation = circle.getAnimations()[0];
        await animation.ready;
        return { time: animation.currentTime, duration: animation.effect.getTiming().duration };
      });
      assert.equal(restarted.duration, 10000, 'Unpin restores the full original duration');
      assert.ok(restarted.time < 250, 'Unpin starts a new ring at full');
    }
    await clearToasts.click();
    await viewport.waitFor({ state: 'hidden' });
  }

  await speed.selectOption('1');
  await placement.selectOption('top-right');

  await page.getByRole('button', { name: 'Desktop', exact: true }).click();
  await speed.selectOption('0.25');
  await priority.click();
  const running = openCards.filter({ hasText: 'Harvest running.' });
  const runningArc = running.locator('[data-toast-timer] circle:last-child');
  const currentTime = () => runningArc.evaluate((el) => Number(el.getAnimations()[0].currentTime));
  await running.evaluate((card) => Promise.all(card.getAnimations().map((animation) => animation.finished)));
  const beforeUrgent = await currentTime();
  await page.getByRole('button', { name: 'Urgent Undo', exact: true }).click();
  const urgent = openCards.filter({ hasText: 'Post removed.' });
  await urgent.waitFor();
  assert.equal(await openCards.first().getAttribute('data-toast-id'), await urgent.getAttribute('data-toast-id'));
  const promotion = await urgent.evaluate((card) => {
    const move = card.getAnimations().find((animation) => animation.effect.getKeyframes()[0]?.translate);
    return Number.parseFloat(move?.effect.getKeyframes()[0]?.translate?.split(' ')[1] ?? '');
  });
  assert.ok(promotion > 12, 'Urgent card travels past earlier cards');
  assert.ok(await currentTime() >= beforeUrgent, 'Priority insertion preserves the running countdown');
  assert.equal(await urgent.getByRole('button', { name: 'Pin notification' }).count(), 0);
  await urgent.getByRole('button', { name: 'Undo' }).click();
  await openCards.getByText('Post restored.', { exact: true }).waitFor();
  await clearToasts.click();
  await viewport.waitFor({ state: 'hidden' });
  await speed.selectOption('1');

  const touchPage = await browser.newPage({
    viewport: { width: 430, height: 900 },
    hasTouch: true,
    isMobile: true,
  });
  try {
    await touchPage.goto(`${origin}/?g=toast-lab`);
    await touchPage.getByRole('button', { name: 'Priority stack' }).tap();
    const touchPreview = touchPage.frameLocator('iframe[title="Toast notification preview"]');
    const touchTask = touchPreview.locator('.toast-preview-viewport > [data-state="open"]').filter({ hasText: 'Harvest running.' });
    const touchPin = touchTask.getByRole('button', { name: 'Pin notification' });
    await touchPin.tap();
    const refresh = touchPreview.getByText('Source list refreshed.', { exact: true });
    await refresh.waitFor();
    await refresh.waitFor({ state: 'detached', timeout: 6500 });
    assert.equal(await touchPin.getAttribute('aria-pressed'), 'true', 'A touch pin holds only that card');
    assert.equal(await touchTask.locator('[data-toast-timer]').count(), 0, 'Touch pin removes the countdown');
  } finally {
    await touchPage.close();
  }

  await page.getByRole('button', { name: 'Desktop', exact: true }).click();
  await page.getByRole('button', { name: 'Burst' }).click();
  await openCards.filter({ hasText: 'Three entries need review.' }).waitFor();
  assert.equal(await openCards.count(), 3);
  assert.equal(await viewport.getByText('Source list refreshed.').count(), 0, 'Overflow waits for a visible slot');
  const more = viewport.getByRole('button', { name: 'Show 5 more notifications', exact: true });
  await more.waitFor();
  assert.equal((await more.textContent()).trim(), 'Show 5 more notifications');
  assert.ok(await more.evaluate((button) => {
    const first = button.parentElement.querySelector('[data-toast-id]');
    return first && Math.abs(first.getBoundingClientRect().width - button.getBoundingClientRect().width) < 1;
  }), 'The overflow control aligns with the toast width');
  const firstId = await openCards.first().getAttribute('data-toast-id');
  const earlierIds = await openCards.evaluateAll((cards) => cards.map((card) => card.dataset.toastId));
  await more.click();
  await openCards.filter({ hasText: 'Connection checked.' }).waitFor();
  assert.equal(await openCards.count(), 8);
  assert.equal(await openCards.locator('[data-toast-compact]').count(), 8);
  assert.equal(await openCards.first().getAttribute('data-toast-id'), firstId, 'Opening overflow keeps the earlier card');
  assert.ok(await openCards.evaluateAll(
    (cards, earlier) => cards.find((card) => !earlier.includes(card.dataset.toastId)) === document.activeElement,
    earlierIds,
  ), 'Opening overflow focuses the first previously hidden card');
  const fewer = viewport.getByRole('button', { name: 'Show fewer notifications' });
  assert.equal(await fewer.getAttribute('aria-expanded'), 'true');
  await page.getByRole('button', { name: 'Urgent Undo', exact: true }).click();
  const overflowUndo = openCards.filter({ hasText: 'Post removed.' });
  await overflowUndo.waitFor();
  assert.equal(await openCards.first().getAttribute('data-toast-id'), await overflowUndo.getAttribute('data-toast-id'));
  await overflowUndo.getByRole('button', { name: 'Undo', exact: true }).waitFor();
  await overflowUndo.waitFor({ state: 'detached', timeout: 8500 });
  assert.equal(await openCards.count(), 8, 'The urgent deadline runs while ordinary overflow clocks are paused');
  await fewer.press('Escape');
  await more.waitFor();
  assert.ok(await more.evaluate((button) => document.activeElement === button));
  assert.equal(await openCards.locator('[data-toast-compact]').count(), 0, 'Collapse restores the default cards');
  assert.equal(await openCards.count(), 3);
  await openCards.first().getByRole('button', { name: 'Dismiss' }).click();
  await openCards.filter({ hasText: 'Source list refreshed.' }).waitFor();
  await clearToasts.click();
  await viewport.waitFor({ state: 'hidden' });

  const queueOne = page.getByRole('button', { name: 'Queue one' });
  const groupMotion = page.getByLabel('Group arrival');
  await speed.selectOption('0.25');
  const arrival = openCards.locator('[data-toast-group-arrival]');
  const expandedFlight = async (el, bottom) => {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const flight = el.getAnimations().find((animation) => animation.effect.getKeyframes()[0]?.translate);
    const frames = flight?.effect.getKeyframes();
    const start = Number.parseFloat(frames?.[0].translate?.split(' ')[1] ?? '');
    const end = Number.parseFloat(frames?.at(-1).translate?.split(' ')[1] ?? '');
    const details = el.parentElement.querySelector('[data-toast-details]');
    const divider = details.getBoundingClientRect().top - el.parentElement.getBoundingClientRect().top;
    return Math.abs(divider - end) <= 1 && (bottom ? end - start : start - end) >= 16;
  };
  for (const corner of ['top-right', 'bottom-left']) {
    await placement.selectOption(corner);
    await queueOne.click();
    await openCards.getByText('Harvest queued.', { exact: true }).waitFor();
    const targetId = await openCards.first().getAttribute('data-toast-id');
    await priority.click();
    await openCards.filter({ hasText: 'Source list refreshed.' }).waitFor();
    const ids = await openCards.evaluateAll((cards) => cards.map((card) => card.dataset.toastId));
    assert.equal(ids.length, 3);
    assert.equal(ids[0], targetId, 'Priority stack preserves the earlier run at its anchor');
    await queueOne.click();
    await openCards.getByText('2 notifications', { exact: true }).waitFor();
    assert.deepEqual(await openCards.evaluateAll((cards) => cards.map((card) => card.dataset.toastId)), ids);
    const flight = await arrival.evaluate(async (el, bottom) => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const group = el.parentElement;
      const siblings = [...group.parentElement.querySelectorAll(':scope > [data-state="open"]')].filter(
        (card) => card !== group,
      );
      const frames = el.getAnimations().find((animation) => animation.effect.getKeyframes()[0]?.translate)
        ?.effect.getKeyframes();
      const origin = group.offsetTop + Number.parseFloat(frames?.[0].translate?.split(' ')[1] ?? '');
      const pastTail = bottom
        ? origin + el.offsetHeight <= Math.min(...siblings.map((card) => card.offsetTop)) + 1
        : origin >= Math.max(...siblings.map((card) => card.offsetTop + card.offsetHeight)) - 1;
      const aboveStack = group.getAnimations().some((animation) => Number(animation.effect.getKeyframes()[0]?.zIndex) > 1);
      return {
        startsPastTail: pastTail,
        aboveStack,
        fullWidth: el.offsetWidth === group.offsetWidth,
        merges: frames?.at(-1).translate === 'none',
        inert: el.hasAttribute('aria-hidden') && el.hasAttribute('inert'),
      };
    }, corner.startsWith('bottom'));
    assert.deepEqual(
      flight,
      { startsPastTail: true, aboveStack: true, fullWidth: true, merges: true, inert: true },
      `The merge preview crosses the stack in ${corner}`,
    );
    await openCards.getByRole('button', { name: 'Show details' }).click();
    await queueOne.click();
    await openCards.getByText('3 notifications', { exact: true }).waitFor();
    assert.ok(await arrival.evaluate(expandedFlight, corner.startsWith('bottom')), `An open group merges in ${corner}`);
    await clearToasts.click();
    await viewport.waitFor({ state: 'hidden' });
  }
  await placement.selectOption('top-right');

  await groupMotion.selectOption('highlight');
  await queueOne.click();
  await openCards.getByText('Harvest queued.', { exact: true }).waitFor();
  await openCards.getByRole('button', { name: 'Pin notification' }).waitFor();
  await queueOne.click();
  await openCards.getByText('2 notifications', { exact: true }).waitFor();
  await queueOne.click();
  await openCards.getByText('3 notifications', { exact: true }).waitFor();
  const cardHighlight = openCards.locator('[data-toast-update-highlight]');
  const countHighlight = openCards.locator('[data-toast-group-count-highlight]');
  const highlightIsPlaying = (el) => el.getAnimations().some((animation) => animation.effect.getKeyframes().at(-1).opacity === '0');
  const countIsGlowing = (el) => el.getAnimations().some((animation) => {
    const frames = animation.effect.getKeyframes();
    return frames[1]?.textShadow?.includes('color-mix') &&
      frames[1].computedOffset < 0.1 && frames[2].textShadow === frames[1].textShadow &&
      frames[2].computedOffset - frames[1].computedOffset >= 0.15 &&
      frames[2].computedOffset <= 0.35 && frames.at(-1).textShadow === 'none';
  });
  assert.ok(await countHighlight.evaluate(countIsGlowing), 'Grouping animates the count text itself');
  assert.equal(await cardHighlight.evaluate(highlightIsPlaying), false, 'Grouping leaves the card highlight idle');
  assert.equal(await arrival.count(), 0);

  await openCards.getByRole('button', { name: 'Show details' }).click();
  const morphsInPlace = await openCards.locator(':scope > [role="status"]').evaluate(async (el) => {
    const growth = el.getAnimations().find((animation) => {
      const frames = animation.effect.getKeyframes();
      return Number.parseFloat(frames.at(-1).height) > Number.parseFloat(frames[0].height);
    });
    if (growth) await growth.finished;
    return Boolean(growth);
  });
  assert.ok(morphsInPlace, 'The existing surface grows from its previous height');
  const groupDetails = openCards.locator('[data-toast-details]');
  const dividerLayout = (el) => {
    const row = el.querySelector('[data-toast-group-row]');
    const details = el.getBoundingClientRect();
    const lines = row.getBoundingClientRect();
    const content = row.querySelector('[data-toast-summary]').getBoundingClientRect();
    return {
      fullWidth: el.offsetWidth === el.parentElement.clientWidth && getComputedStyle(el).borderTopWidth === '1px',
      inset: lines.left - details.left >= 8 && details.right - lines.right >= 8,
      aligned: lines.left === content.left && lines.right === content.right && getComputedStyle(row).borderBottomWidth === '1px',
    };
  };
  assert.deepEqual(await groupDetails.evaluate(dividerLayout), { fullWidth: true, inset: true, aligned: true });
  const rows = groupDetails.locator('[data-toast-group-row]');
  const wholeRowsInView = (el) => Array.from(el.querySelectorAll('[data-toast-group-row]')).filter(
    (row) => row.offsetTop >= el.scrollTop && row.offsetTop + row.offsetHeight <= el.scrollTop + el.clientHeight + 1,
  ).length;
  await groupMotion.selectOption('card');
  await queueOne.click();
  await openCards.getByText('4 notifications', { exact: true }).waitFor();
  assert.equal(await openCards.count(), 1, 'Explicit grouping works below the capacity limit');
  assert.ok(await countHighlight.evaluate(countIsGlowing), 'The count glows as the preview merges');
  assert.equal(await cardHighlight.evaluate(highlightIsPlaying), false);
  assert.ok(await arrival.evaluate(expandedFlight, false), 'The preview folds into the top of the open list');
  assert.equal(await groupDetails.evaluate(wholeRowsInView), 3, 'An open group shows at most three whole rows');
  const newGroupRow = rows.first();
  const newestId = await newGroupRow.getAttribute('data-toast-group-row');
  const slidesInsideList = await newGroupRow.evaluate(async (el) => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return el.getAnimations().some((animation) => animation.transitionProperty === 'translate');
  });
  assert.ok(slidesInsideList, 'A new run slides into the top of the open group');
  await newGroupRow.evaluate((row) => Promise.allSettled(row.getAnimations().map((animation) => animation.finished)));
  const focusedRowId = await rows.nth(2).getAttribute('data-toast-group-row');
  const focusedAction = groupDetails
    .locator('[data-toast-group-row="' + focusedRowId + '"]')
    .getByRole('button', { name: 'Open run', exact: true });
  await focusedAction.focus();
  const readingOffset = await groupDetails.evaluate((el) => {
    el.scrollTop = 60;
    return el.querySelector('[data-toast-group-row]').getBoundingClientRect().top - el.getBoundingClientRect().top;
  });
  await queueOne.dispatchEvent('click');
  await openCards.getByText('5 notifications', { exact: true }).waitFor();
  assert.notEqual(await rows.first().getAttribute('data-toast-group-row'), newestId);
  const keptReadingOffset = await groupDetails.locator('[data-toast-group-row="' + newestId + '"]').evaluate(
    (row) => row.getBoundingClientRect().top - row.offsetParent.getBoundingClientRect().top,
  );
  assert.ok(Math.abs(keptReadingOffset - readingOffset) <= 1, 'A scrolled group keeps the visible row in place');
  assert.ok(await focusedAction.evaluate((el) => document.activeElement === el), 'An arrival keeps the focused row action');
  const runActions = groupDetails.getByRole('button', { name: 'Open run' });
  assert.equal(await runActions.count(), 5, 'Every grouped run keeps its own action');
  assert.equal(await rows.locator('[data-toast-compact]').count(), 5);
  assert.equal(await groupDetails.getByText('Harvest queued.', { exact: true }).count(), 0);
  assert.ok(await groupDetails.getByRole('button', { name: 'Open source posts', exact: true }).count() >= 1);
  await runActions.nth(1).click();
  await preview.getByRole('heading', { name: 'Activity', exact: true }).waitFor();
  await preview.getByText('Queued', { exact: true }).first().waitFor();
  await clearToasts.click();
  await viewport.waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Task update', exact: true }).click();
  await openCards.getByText('Harvest running.', { exact: true }).waitFor();
  const taskUpdateId = await openCards.first().getAttribute('data-toast-id');
  await openCards.getByText('Harvest complete.', { exact: true }).waitFor();
  assert.equal(await openCards.first().getAttribute('data-toast-id'), taskUpdateId);
  const highlightTiming = await cardHighlight.evaluate((el) => {
    const frames = el.getAnimations().find((animation) => animation.effect.getKeyframes().at(-1).opacity === '0')
      ?.effect.getKeyframes();
    return {
      quickPeak: frames?.[1].opacity === '1' && frames[1].computedOffset < 0.1,
      holds: frames?.[2].opacity === '1' && frames[2].computedOffset - frames[1].computedOffset >= 0.15,
      slowReturn: frames?.[2].computedOffset <= 0.35 && frames.at(-1).opacity === '0',
    };
  });
  assert.deepEqual(highlightTiming, { quickPeak: true, holds: true, slowReturn: true });
  assert.equal(await countHighlight.count(), 0);
  await clearToasts.click();
  await viewport.waitFor({ state: 'hidden' });
  await speed.selectOption('1');

  await page.getByRole('button', { name: 'Phone', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 440 });
  for (let i = 0; i < 4; i += 1) await queueOne.click();
  await openCards.getByText('4 notifications', { exact: true }).waitFor();
  await page.locator('iframe[title="Toast notification preview"]').scrollIntoViewIfNeeded();
  await openCards.getByRole('button', { name: 'Show details' }).click();
  await rows.first().waitFor();
  await openCards.locator(':scope > [role="status"]').evaluate(async (el) => {
    await Promise.all(el.getAnimations().map((animation) => animation.finished));
  });
  assert.ok(await groupDetails.evaluate(wholeRowsInView) < 3, 'A short phone viewport shows fewer full rows');
  assert.deepEqual(await groupDetails.evaluate(dividerLayout), { fullWidth: true, inset: true, aligned: true });
  assert.equal(await rows.count(), 4, 'All rows stay accessible by scrolling');
  await queueOne.click();
  await openCards.getByText('5 notifications', { exact: true }).waitFor();
  assert.ok(await arrival.evaluate(expandedFlight, false), 'A short phone preview still merges into open details');
  await groupMotion.selectOption('highlight');
  await queueOne.click();
  await openCards.getByText('6 notifications', { exact: true }).waitFor();
  assert.ok(await countHighlight.evaluate(countIsGlowing), 'Count highlight also works with details open');
  assert.equal(await arrival.count(), 0);
  await clearToasts.click();
  await viewport.waitFor({ state: 'hidden' });

  const longMessage = page.getByRole('button', { name: 'Long message' });
  await longMessage.click();
  await longMessage.click();
  await longMessage.click();
  const heightOverflow = viewport.getByRole('button', { name: 'Show 2 more notifications' });
  await heightOverflow.waitFor();
  assert.equal(await openCards.count(), 1, 'Height folds cards before the max count');
  await page.locator('iframe[title="Toast notification preview"]').scrollIntoViewIfNeeded();
  await heightOverflow.click();
  await openCards.nth(2).waitFor();
  assert.ok(await viewport.evaluate((el) => el.scrollHeight > el.clientHeight), 'The expanded list scrolls in the frame');
  await viewport.getByRole('button', { name: 'Show fewer notifications' }).click();
  await heightOverflow.waitFor();
  await clearToasts.click();
  await viewport.waitFor({ state: 'hidden' });
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.getByLabel('App context').selectOption('catalogue');
  await preview.getByRole('heading', { name: 'Products', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Create product' }).click();
  await viewport.getByRole('button', { name: 'Open product' }).click();
  await preview.getByRole('main').getByRole('listitem').filter({ hasText: 'Ivory silk scarf' }).waitFor();
  await page.getByRole('button', { name: 'Reminder', exact: true }).click();
  await openCards.getByRole('button', { name: 'Remind later' }).click();
  await viewport.getByText('Reminder scheduled.').waitFor();
  await openCards.getByRole('button', { name: 'Open review' }).waitFor({ state: 'detached' });
  await viewport.getByRole('button', { name: 'Open review' }).waitFor({ timeout: 10000 });
  await clearToasts.click();
  await viewport.waitFor({ state: 'hidden' });

  // The Features panel lists what ships and what is next; settings-only rows carry no Replay.
  const implemented = page.getByRole('list', { name: 'Implemented', exact: true }).getByRole('listitem');
  assert.ok((await implemented.count()) >= 20, 'The Features panel lists the implemented capabilities');
  assert.equal(await page.getByRole('list', { name: 'Upcoming', exact: true }).getByRole('listitem').count(), 7);
  assert.equal(await page.getByRole('list', { name: 'Upcoming', exact: true }).getByRole('button').count(), 0);
  await page.getByRole('button', { name: 'Replay Details', exact: true }).click();
  await openCards.getByText('The product draft needs review.', { exact: true }).waitFor();
  await clearToasts.click();
  await viewport.waitFor({ state: 'hidden' });

  await page.getByLabel('App context').selectOption('console');
  await preview.getByRole('tab', { name: /^Posts/ }).waitFor();
  const screenReader = page.getByRole('list', { name: 'Screen reader', exact: true }).getByRole('listitem');
  await queueOne.click();
  await openCards.getByText('Harvest queued.', { exact: true }).waitFor();
  if ((await preview.locator('[data-toast-announcer]').count()) > 0) {
    await screenReader.first().waitFor();
    assert.match(await screenReader.first().innerText(), /polite|assertive/);
    await page.getByRole('button', { name: 'Clear announcements', exact: true }).click();
    await screenReader.first().waitFor({ state: 'detached' });
  } else {
    findings.warnings.push({ message: 'Toast announcer regions are absent; the Screen reader panel was not checked.' });
  }
  await clearToasts.click();
  await viewport.waitFor({ state: 'hidden' });

  await page.getByRole('button', { name: 'Track progress', exact: true }).click();
  const tracked = openCards.filter({ hasText: 'Harvest in progress.' });
  await tracked.getByRole('progressbar').waitFor();
  await openCards.getByText('Harvest finished.', { exact: true }).waitFor({ timeout: 8000 });
  assert.equal(await openCards.getByRole('progressbar').count(), 0, 'Completion removes the running bar');
  await clearToasts.click();
  await viewport.waitFor({ state: 'hidden' });

  const cancelTask = page.getByRole('button', { name: 'Cancel task', exact: true });
  await cancelTask.click();
  await openCards.getByText('Re-harvest running.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Cancel running task', exact: true }).click();
  await viewport.waitFor({ state: 'hidden' });
  await cancelTask.waitFor();
  await historyButton.click();
  assert.equal(await history.getByText('Re-harvest running.').count(), 0, 'A cancelled transient task leaves no History');
  await historyButton.click();
  findings.groups.push('toast-lab');

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
