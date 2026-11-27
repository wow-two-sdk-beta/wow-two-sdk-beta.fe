import { flushPromises } from '@vue/test-utils';
import { shallowRef } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoadMoreState, loadMoreQueryKey, MaxKeptWindowItems } from '@src/foundation/virtualization';
import { frames, mountLoadMore, row, rows } from '../../../support/LoadMoreHarness';

/* Real layout: a 300 px scroller, 40 px rows (or a 3-column grid), the answers held or immediate as each case needs. */

const mounted: Array<{ unmount(): void }> = [];
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
  vi.restoreAllMocks();
});

function harness(options: Parameters<typeof mountLoadMore>[0] = {}) {
  const value = mountLoadMore(options);
  mounted.push(value.wrapper);
  return value;
}

/** A restored automatic view of `count` items, so a case starts deep in a collection without reading it. */
const restored = (count: number, hasMore: boolean) => ({
  queryKey: loadMoreQueryKey(undefined),
  items: rows(0, count),
  cursor: hasMore ? count : null,
  hasMore,
  state: LoadMoreState.Automatic,
  scrollOffset: 0,
});

describe('useLoadMore in a real layout', () => {
  it('shows tail stand-ins on a slow network and keeps one read in flight', async () => {
    const view = harness({ holds: true });
    await flushPromises();
    await frames();
    const pressing = view.loader().showMore();
    await frames();
    expect(view.wrapper.findAll('[data-stand-in]')).toHaveLength(3);
    expect(view.wrapper.text()).not.toMatch(/loading/i);
    view.release();
    await pressing;
    await frames();
    for (let top = 0; top <= 2400; top += 300) {
      await view.scrollTo(top, 2);
      view.release();
      await flushPromises();
    }
    expect(view.maxInFlight()).toBe(1);
    expect(view.requests.length).toBeGreaterThan(2);
  });

  it('never shows a page of the previous filter after a change mid-flight', async () => {
    const query = shallowRef<unknown>(1);
    const view = harness({ holds: true, queryRef: query });
    await flushPromises();
    void view.loader().showMore();
    await flushPromises();
    query.value = 2;
    await flushPromises();
    view.release();
    await flushPromises();
    await frames();
    const ids = view.loader().items.value.map((item) => item.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((id) => id >= 200_000)).toBe(true);
    expect(view.loader().state.value).toBe(LoadMoreState.Automatic);
  });

  it('reads the maximum on a fast fling, one at a time, with a bounded non-empty window', async () => {
    const view = harness({ total: 5000, initial: restored(100, true) });
    await frames();
    const counts: number[] = [];
    for (let step = 0; step < 18; step++) {
      view.scroller().scrollTop += 1100;
      await frames(1);
      await flushPromises();
      counts.push(view.wrapper.findAll('li').length);
    }
    expect(Math.min(...counts)).toBeGreaterThan(0);
    expect(Math.max(...counts)).toBeLessThanOrEqual(MaxKeptWindowItems);
    expect(Math.max(...view.requests.map((request) => request.limit))).toBe(100);
    expect(view.maxInFlight()).toBe(1);
  });

  it('holds a live item behind the pill while away and merges it back at the start', async () => {
    const view = harness();
    await flushPromises();
    await frames();
    await view.scrollTo(600);
    view.loader().insertAtStart([row(-1)]);
    await frames();
    expect(view.loader().pendingCount.value).toBe(1);
    expect(view.scroller().scrollTop).toBeCloseTo(600, 0);
    await view.scrollTo(0);
    expect(view.loader().pendingCount.value).toBe(0);
    expect(view.loader().items.value[0]!.id).toBe(-1);
  });

  it('keeps the first visible row in place when a row above it grows', async () => {
    const view = harness();
    await flushPromises();
    await frames();
    await view.scrollTo(400);
    const before = view.item(10).element.getBoundingClientRect().top;
    view.loader().upsert(row(2, 3));
    await frames();
    expect(Math.abs(view.item(10).element.getBoundingClientRect().top - before)).toBeLessThanOrEqual(1);
  });

  it('scrolls to the pending items at once under reduced motion', async () => {
    const original = window.matchMedia.bind(window);
    vi.spyOn(window, 'matchMedia').mockImplementation((query) =>
      query.includes('prefers-reduced-motion')
        ? ({
            matches: true,
            media: query,
            onchange: null,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
            addListener: () => undefined,
            removeListener: () => undefined,
            dispatchEvent: () => false,
          } as MediaQueryList)
        : original(query),
    );
    const view = harness();
    await flushPromises();
    await frames();
    await view.scrollTo(600);
    view.loader().insertAtStart([row(-1)]);
    const scrollBy = vi.spyOn(view.scroller(), 'scrollBy');
    await view.loader().showPending();
    expect(scrollBy.mock.calls.length).toBeGreaterThan(0);
    expect(scrollBy.mock.calls.every(([value]) => (value as ScrollToOptions).behavior === 'auto')).toBe(true);
  });
});

describe('useAdaptiveWindow in a real layout', () => {
  it('sizes a grid row by its tallest card plus the row gap', async () => {
    const view = harness({
      layout: 'grid',
      cardAspectRatio: 2,
      cardSize: (item) => [60, 100, 80][item.id % 3]!,
      initial: restored(300, false),
    });
    await frames();
    const range = view.loader().window.value;
    expect(range.paddingEnd).toBeCloseTo((100 - range.end / 3) * 108, 0);
    await view.scrollTo(3000);
    const scrolled = view.loader().window.value;
    expect(scrolled.start).toBeGreaterThan(0);
    expect(scrolled.start % 3).toBe(0);
    expect(scrolled.paddingStart).toBeCloseTo((scrolled.start / 3) * 108, 0);
    const first = view.item(scrolled.start).element.getBoundingClientRect().top;
    expect(first - view.list().getBoundingClientRect().top).toBeCloseTo(scrolled.paddingStart, 0);
  });

  it('keeps a focused row mounted, and past the cap moves focus to the list', async () => {
    const view = harness({ initial: restored(1000, false) });
    await frames();
    const link = view.item(5).element.querySelector('a')!;
    link.focus({ preventScroll: true });
    await view.scrollTo(4000);
    expect(view.item(5).exists()).toBe(true);
    expect(document.activeElement).toBe(link);
    await view.scrollTo(20_000);
    expect(view.item(5).exists()).toBe(false);
    expect(document.activeElement).toBe(view.list());
  });
});
