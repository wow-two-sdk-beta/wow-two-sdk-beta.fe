import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import { StickyLayout, VirtualScrollArea } from '@src/presentation/layout';

const wrappers: VueWrapper[] = [];
const track = <T extends VueWrapper>(wrapper: T): T => {
  wrappers.push(wrapper);
  return wrapper;
};
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** An `IntersectionObserver` stand-in that records its options and lets a test deliver entries. */
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  readonly targets = new Set<Element>();

  constructor(
    readonly callback: IntersectionObserverCallback,
    readonly options: IntersectionObserverInit = {},
  ) {
    FakeIntersectionObserver.instances.push(this);
  }

  observe(target: Element): void {
    this.targets.add(target);
  }

  unobserve(target: Element): void {
    this.targets.delete(target);
  }

  disconnect(): void {
    this.targets.clear();
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  /** Delivers one entry for every observed target. */
  deliver(entry: { isIntersecting: boolean; top: number; bottom: number; rootTop: number; rootBottom: number }): void {
    for (const target of this.targets) {
      this.callback(
        [
          {
            target,
            isIntersecting: entry.isIntersecting,
            boundingClientRect: { top: entry.top, bottom: entry.bottom } as DOMRectReadOnly,
            rootBounds: { top: entry.rootTop, bottom: entry.rootBottom } as DOMRectReadOnly,
            intersectionRatio: entry.isIntersecting ? 1 : 0,
            intersectionRect: {} as DOMRectReadOnly,
            time: 0,
          },
        ],
        this as unknown as IntersectionObserver,
      );
    }
  }
}

function installIntersectionObserver(): typeof FakeIntersectionObserver {
  FakeIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  return FakeIntersectionObserver;
}

function latestObserver(): FakeIntersectionObserver {
  const observer = FakeIntersectionObserver.instances.at(-1);
  if (!observer) throw new Error('No IntersectionObserver was constructed');
  return observer;
}

describe('StickyLayout', () => {
  it('pins at the offset, reports pinning from its sentinel and ignores a sentinel still ahead', async () => {
    installIntersectionObserver();
    const wrapper = track(
      mount(StickyLayout, {
        props: { offset: 16 },
        slots: { default: ({ isStuck }: { isStuck: boolean }) => h('span', { 'data-slot': '' }, String(isStuck)) },
        attachTo: document.body,
      }),
    );
    await nextTick();
    const region = wrapper.get('.sticky');
    expect(region.attributes('style')).toContain('top: 16px');
    expect(region.classes()).toContain('z-sticky');
    expect(latestObserver().options.rootMargin).toBe('-17px 0px 0px 0px');
    // The sentinel is still below the viewport: not pinned.
    latestObserver().deliver({ isIntersecting: false, top: 900, bottom: 901, rootTop: 17, rootBottom: 800 });
    await nextTick();
    expect(region.attributes('data-stuck')).toBeUndefined();
    // The sentinel scrolled above the pinned edge: pinned.
    latestObserver().deliver({ isIntersecting: false, top: -40, bottom: -39, rootTop: 17, rootBottom: 800 });
    await nextTick();
    expect(region.attributes('data-stuck')).toBe('');
    expect(wrapper.get('[data-slot]').text()).toBe('true');
    latestObserver().deliver({ isIntersecting: true, top: 100, bottom: 101, rootTop: 17, rootBottom: 800 });
    await nextTick();
    expect(wrapper.emitted('stuck-change')).toEqual([[true], [false]]);
  });

  it('pins to the bottom edge with the sentinel after the region', async () => {
    installIntersectionObserver();
    const wrapper = track(
      mount(StickyLayout, { props: { side: 'bottom' }, slots: { default: () => 'Totals' }, attachTo: document.body }),
    );
    await nextTick();
    const region = wrapper.get('.sticky');
    expect(region.attributes('style')).toContain('bottom: 0px');
    expect(region.element.nextElementSibling?.getAttribute('aria-hidden')).toBe('true');
    expect(region.element.previousElementSibling?.getAttribute('aria-hidden') ?? null).toBeNull();
    expect(latestObserver().options.rootMargin).toBe('0px 0px -1px 0px');
    latestObserver().deliver({ isIntersecting: false, top: 820, bottom: 821, rootTop: 0, rootBottom: 799 });
    await nextTick();
    expect(region.attributes('data-stuck')).toBe('');
  });
});

describe('VirtualScrollArea', () => {
  const items = Array.from({ length: 1000 }, (_, index) => `Row ${index}`);

  /** Gives every element a 200px viewport and makes the area's scroll position writable. */
  function viewportOf(wrapper: VueWrapper): HTMLElement {
    const viewport = wrapper.get('[data-orientation]').element as HTMLElement;
    Object.defineProperty(viewport, 'scrollTop', { value: 0, writable: true, configurable: true });
    return viewport;
  }

  function renderedRows(wrapper: VueWrapper): number[] {
    return wrapper.findAll('[data-index]').map((row) => Number(row.attributes('data-index')));
  }

  async function scrollTo(viewport: HTMLElement, offset: number): Promise<void> {
    viewport.scrollTop = offset;
    viewport.dispatchEvent(new Event('scroll'));
    await nextTick();
    await nextTick();
  }

  it('renders only the rows near the viewport inside a full-size spacer', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(200);
    const wrapper = track(
      mount(VirtualScrollArea<string>, {
        props: { items, itemSize: 20 },
        slots: { default: ({ item, index }: { item: string; index: number }) => h('span', `${index}:${item}`) },
        attachTo: document.body,
      }),
    );
    viewportOf(wrapper);
    await nextTick();
    await nextTick();
    const rows = renderedRows(wrapper);
    expect(rows[0]).toBe(0);
    expect(rows.length).toBeLessThan(20);
    expect(wrapper.get('[data-index="3"]').text()).toBe('3:Row 3');
    expect(wrapper.get('[data-index="3"]').attributes('style')).toContain('translateY(60px)');
    expect(wrapper.get('[data-orientation] > div').attributes('style')).toContain('height: 20000px');
  });

  it('moves the window with the scroll position and reports the end once per length', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(200);
    const wrapper = track(
      mount(VirtualScrollArea<string>, {
        props: { items: items.slice(0, 100), itemSize: 20, endThreshold: 5 },
        slots: { default: ({ item }: { item: string }) => h('span', item) },
        attachTo: document.body,
      }),
    );
    const viewport = viewportOf(wrapper);
    await nextTick();
    await scrollTo(viewport, 400);
    expect(renderedRows(wrapper)[0]).toBeGreaterThanOrEqual(17);
    expect(wrapper.emitted('end-reached')).toBeUndefined();
    await scrollTo(viewport, 1800);
    await scrollTo(viewport, 1790);
    expect(wrapper.emitted('end-reached')).toHaveLength(1);
    await wrapper.setProps({ items: items.slice(0, 101) });
    await nextTick();
    await scrollTo(viewport, 1820);
    expect(wrapper.emitted('end-reached')).toHaveLength(2);
  });

  it('scrolls an item into view through its exposed handle', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(200);
    const wrapper = track(
      mount(VirtualScrollArea<string>, {
        props: { items, itemSize: 20 },
        slots: { default: ({ item }: { item: string }) => h('span', item) },
        attachTo: document.body,
      }),
    );
    const viewport = viewportOf(wrapper);
    await nextTick();
    (wrapper.vm as unknown as { scrollToIndex: (index: number, align: 'start') => void }).scrollToIndex(500, 'start');
    expect(viewport.scrollTop).toBe(10_000);
  });

  it('shows the empty slot for an empty list', () => {
    const wrapper = track(
      mount(VirtualScrollArea<string>, {
        props: { items: [], itemSize: 20 },
        slots: { default: () => 'row', empty: () => h('p', { 'data-empty': '' }, 'Nothing here') },
      }),
    );
    expect(wrapper.get('[data-empty]').text()).toBe('Nothing here');
    expect(wrapper.find('[data-index]').exists()).toBe(false);
  });

  it('settles variable rows to their measured size', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(200);
    let report: ResizeObserverCallback = () => undefined;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          report = callback;
        }
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
    const wrapper = track(
      mount(VirtualScrollArea<string>, {
        props: { items: items.slice(0, 10), itemSize: 20, hasVariableSize: true },
        slots: { default: ({ item }: { item: string }) => h('span', item) },
        attachTo: document.body,
      }),
    );
    viewportOf(wrapper);
    await nextTick();
    const first = wrapper.get('[data-index="0"]').element;
    expect(first.getAttribute('style')).not.toContain('height: 20px');
    report(
      [{ target: first, borderBoxSize: [{ blockSize: 50, inlineSize: 300 }] } as unknown as ResizeObserverEntry],
      {} as ResizeObserver,
    );
    await nextTick();
    expect(wrapper.get('[data-orientation] > div').attributes('style')).toContain('height: 230px');
    expect(wrapper.get('[data-index="1"]').attributes('style')).toContain('translateY(50px)');
  });
});
