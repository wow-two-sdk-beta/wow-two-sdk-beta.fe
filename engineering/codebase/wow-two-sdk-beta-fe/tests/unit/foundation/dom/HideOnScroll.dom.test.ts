import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, shallowRef, type EffectScope } from 'vue';
import { useHideOnScroll, type HideOnScrollOptions } from '@src/foundation/dom';

const scopes: EffectScope[] = [];

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

/** The region's content and view heights, in px. */
interface Page {
  readonly scrollHeight: number;
  readonly clientHeight: number;
}

/** Taller than the view by far more than the 56px bar plus the 64px threshold. */
const TallPage: Page = { scrollHeight: 2000, clientHeight: 600 };
/** Taller than the view by 100px: under the 56px bar plus the 64px threshold. */
const ShortPage: Page = { scrollHeight: 700, clientHeight: 600 };
/** The settle window the hook waits out after every change. */
const SettleMs = 250;

/** Pins a layout measure happy-dom does not compute. */
function pin(element: HTMLElement, key: 'scrollHeight' | 'clientHeight' | 'offsetHeight', value: number): void {
  Object.defineProperty(element, key, { configurable: true, value });
}

/** A 56px bar over a scrolling region, the hook bound to both in a scope the test stops. */
async function frameOf(page: Page, options?: HideOnScrollOptions) {
  const bar = document.createElement('header');
  const button = document.createElement('button');
  bar.append(button);
  const region = document.createElement('main');
  document.body.append(bar, region);
  pin(bar, 'offsetHeight', 56);
  pin(region, 'scrollHeight', page.scrollHeight);
  pin(region, 'clientHeight', page.clientHeight);
  Object.defineProperty(region, 'scrollTop', { configurable: true, writable: true, value: 0 });
  const scope = effectScope();
  scopes.push(scope);
  const handle = scope.run(() => useHideOnScroll(region, bar, options))!;
  await nextTick();
  /** Moves the region to `top` and fires its scroll event. */
  function scrollTo(top: number): void {
    region.scrollTop = top;
    region.dispatchEvent(new Event('scroll'));
  }
  return { region, button, handle, scrollTo };
}

describe('useHideOnScroll', () => {
  it('never hides the bar on a page barely taller than its view', async () => {
    const { handle, scrollTo } = await frameOf(ShortPage);
    for (const top of [40, 80, 100]) scrollTo(top);
    expect(handle.isHidden.value).toBe(false);
  });

  it('hides a tall page’s bar once the reader travels the tolerance down past the threshold', async () => {
    const { handle, scrollTo } = await frameOf(TallPage);
    scrollTo(30);
    scrollTo(60);
    expect(handle.isHidden.value).toBe(false);
    scrollTo(65);
    expect(handle.isHidden.value).toBe(false);
    scrollTo(70);
    expect(handle.isHidden.value).toBe(true);
  });

  it('reveals the bar after the tolerance of travel up, restarting the sum when the direction flips', async () => {
    const { handle, scrollTo } = await frameOf(TallPage);
    scrollTo(200);
    expect(handle.isHidden.value).toBe(true);
    vi.advanceTimersByTime(SettleMs);
    scrollTo(196);
    scrollTo(200);
    scrollTo(195);
    expect(handle.isHidden.value).toBe(true);
    scrollTo(191);
    expect(handle.isHidden.value).toBe(false);
  });

  it('reveals the bar back within the threshold of the top', async () => {
    const { handle, scrollTo } = await frameOf(TallPage);
    scrollTo(200);
    vi.advanceTimersByTime(SettleMs);
    scrollTo(64);
    expect(handle.isHidden.value).toBe(false);
  });

  it('does not take a clamp inside the settle window for the reader scrolling up', async () => {
    const { region, handle, scrollTo } = await frameOf(TallPage);
    scrollTo(1400);
    expect(handle.isHidden.value).toBe(true);
    pin(region, 'clientHeight', TallPage.clientHeight + 56);
    scrollTo(1344);
    expect(handle.isHidden.value).toBe(true);
    vi.advanceTimersByTime(SettleMs);
    scrollTo(1340);
    expect(handle.isHidden.value).toBe(true);
  });

  it('keeps the bar hidden on a page that fits only once the bar has gone', async () => {
    const { region, handle, scrollTo } = await frameOf({ scrollHeight: 730, clientHeight: 600 });
    scrollTo(100);
    expect(handle.isHidden.value).toBe(true);
    pin(region, 'clientHeight', 656);
    scrollTo(74);
    vi.advanceTimersByTime(SettleMs);
    scrollTo(70);
    expect(handle.isHidden.value).toBe(true);
  });

  it('never hides while disabled, and reveals the bar when disabled', async () => {
    const isEnabled = shallowRef(false);
    const { handle, scrollTo } = await frameOf(TallPage, { isEnabled });
    scrollTo(200);
    scrollTo(400);
    expect(handle.isHidden.value).toBe(false);
    isEnabled.value = true;
    await nextTick();
    scrollTo(500);
    expect(handle.isHidden.value).toBe(true);
    isEnabled.value = false;
    await nextTick();
    expect(handle.isHidden.value).toBe(false);
  });

  it('reveals the bar when focus moves into it', async () => {
    const { button, handle, scrollTo } = await frameOf(TallPage);
    scrollTo(200);
    expect(handle.isHidden.value).toBe(true);
    button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(handle.isHidden.value).toBe(false);
  });

  it('reveal() shows the bar and forgets the travel so far', async () => {
    const { handle, scrollTo } = await frameOf(TallPage);
    scrollTo(200);
    handle.reveal();
    expect(handle.isHidden.value).toBe(false);
    vi.advanceTimersByTime(SettleMs);
    scrollTo(205);
    handle.reveal();
    scrollTo(210);
    expect(handle.isHidden.value).toBe(false);
    scrollTo(214);
    expect(handle.isHidden.value).toBe(true);
  });

  it('stops listening once its scope ends', async () => {
    const { handle, scrollTo } = await frameOf(TallPage);
    scopes.splice(0).forEach((scope) => scope.stop());
    scrollTo(200);
    expect(handle.isHidden.value).toBe(false);
  });
});
