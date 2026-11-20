import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, shallowRef } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  useAdaptiveList,
  type AdaptiveList,
  type AdaptiveListPage,
  type UseAdaptiveListOptions,
} from '@src/foundation/virtualization';

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

  /** Reports the sentinel as inside or outside the root. */
  deliver(isIntersecting: boolean): void {
    for (const target of this.targets) {
      this.callback(
        [{ target, isIntersecting, intersectionRatio: isIntersecting ? 1 : 0 } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    }
  }
}

/** The observer still watching the sentinel — each landed page replaces it. */
function liveObserver(): FakeIntersectionObserver | undefined {
  return [...FakeIntersectionObserver.instances].reverse().find((observer) => observer.targets.size > 0);
}

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  vi.unstubAllGlobals();
});

type Cursor = 'p2' | 'p3';

const Pages: Record<string, AdaptiveListPage<number, Cursor>> = {
  first: { items: [1, 2, 3], next: 'p2', hasMore: true },
  p2: { items: [4, 5, 6], next: 'p3', hasMore: true },
  p3: { items: [7], next: null, hasMore: false },
};

/** Serves `Pages` by cursor. */
function pageLoader() {
  return vi.fn(async (cursor: Cursor | null) => Pages[cursor ?? 'first']!);
}

function mountList(options: UseAdaptiveListOptions<number, Cursor>): AdaptiveList<number> {
  FakeIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  let list!: AdaptiveList<number>;
  const wrapper = mount(
    defineComponent({
      setup() {
        list = useAdaptiveList(options);
        return () =>
          h('div', [
            h(
              'ul',
              list.items.value.map((item) => h('li', { key: item }, String(item))),
            ),
            h('div', { ref: list.sentinel, 'data-sentinel': '' }),
          ]);
      },
    }),
    { attachTo: document.body },
  );
  wrappers.push(wrapper);
  return list;
}

describe('useAdaptiveList', () => {
  it('loads the first page on mount, then the next page with the cursor before the end is reached', async () => {
    const load = pageLoader();
    const list = mountList({ load, rootMargin: '0px 0px 300px 0px' });
    await flushPromises();

    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenLastCalledWith(null, expect.any(AbortSignal));
    expect(list.items.value).toEqual([1, 2, 3]);

    /* The sentinel is observed with the margin, so the browser reports it while it is still 300px below the fold. */
    expect(liveObserver()?.options.rootMargin).toBe('0px 0px 300px 0px');

    liveObserver()!.deliver(true);
    await flushPromises();
    expect(load).toHaveBeenCalledTimes(2);
    expect(load).toHaveBeenLastCalledWith('p2', expect.any(AbortSignal));
    expect(list.items.value).toEqual([1, 2, 3, 4, 5, 6]);
    expect(list.isLoading.value).toBe(false);
  });

  it('loads nothing while the sentinel is outside the margin', async () => {
    const load = pageLoader();
    mountList({ load });
    await flushPromises();
    liveObserver()!.deliver(false);
    await flushPromises();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('keeps loading after a page lands while the sentinel is still inside the margin', async () => {
    const load = pageLoader();
    const list = mountList({ load });
    await flushPromises();
    liveObserver()!.deliver(true);
    await flushPromises();
    /* The page landed, so a fresh observer reports the sentinel again; a tall viewport reports it inside once more. */
    liveObserver()!.deliver(true);
    await flushPromises();
    expect(load).toHaveBeenCalledTimes(3);
    expect(list.items.value).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('stops when hasMore is false, and drops the observer', async () => {
    const load = pageLoader();
    const list = mountList({ load });
    await flushPromises();
    liveObserver()!.deliver(true);
    await flushPromises();
    liveObserver()!.deliver(true);
    await flushPromises();
    expect(list.hasMore.value).toBe(false);
    expect(liveObserver()).toBeUndefined();

    await list.loadMore();
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('starts over on reset: aborts the load in flight, ignores its late page and loads the first page again', async () => {
    const pending: Array<(page: AdaptiveListPage<number, Cursor>) => void> = [];
    const signals: AbortSignal[] = [];
    const load = vi.fn(
      (_cursor: Cursor | null, signal: AbortSignal) =>
        new Promise<AdaptiveListPage<number, Cursor>>((resolve) => {
          signals.push(signal);
          pending.push(resolve);
        }),
    );
    const list = mountList({ load });
    await flushPromises();
    expect(list.isLoading.value).toBe(true);

    const restarted = list.reset();
    expect(signals[0]!.aborted).toBe(true);
    expect(load).toHaveBeenCalledTimes(2);
    expect(load).toHaveBeenLastCalledWith(null, expect.any(AbortSignal));

    /* The first request answers after the reset: its page belongs to the old list. */
    pending[0]!({ items: [99], next: 'p2', hasMore: true });
    pending[1]!(Pages.first!);
    await restarted;
    await flushPromises();
    expect(list.items.value).toEqual([1, 2, 3]);
    expect(list.isLoading.value).toBe(false);
  });

  it('reset after the end restarts from the first page', async () => {
    const load = pageLoader();
    const list = mountList({ load });
    await flushPromises();
    liveObserver()!.deliver(true);
    await flushPromises();
    liveObserver()!.deliver(true);
    await flushPromises();
    expect(list.hasMore.value).toBe(false);

    await list.reset();
    await flushPromises();
    expect(load).toHaveBeenLastCalledWith(null, expect.any(AbortSignal));
    expect(list.items.value).toEqual([1, 2, 3]);
    expect(list.hasMore.value).toBe(true);
    expect(liveObserver()).toBeDefined();
  });

  it('stops on an error, keeps the loaded items and retries through loadMore', async () => {
    const failure = new Error('offline');
    const load = vi
      .fn<(cursor: Cursor | null, signal: AbortSignal) => Promise<AdaptiveListPage<number, Cursor>>>()
      .mockResolvedValueOnce(Pages.first!)
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(Pages.p2!);
    const list = mountList({ load });
    await flushPromises();
    liveObserver()!.deliver(true);
    await flushPromises();

    expect(list.error.value).toBe(failure);
    expect(list.items.value).toEqual([1, 2, 3]);
    expect(list.hasMore.value).toBe(true);
    expect(liveObserver()).toBeUndefined();

    await list.loadMore();
    await flushPromises();
    expect(list.error.value).toBeNull();
    expect(load).toHaveBeenLastCalledWith('p2', expect.any(AbortSignal));
    expect(list.items.value).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('waits while disabled, then loads the first page once enabled', async () => {
    const load = pageLoader();
    const enabled = shallowRef(false);
    const list = mountList({ load, isEnabled: enabled });
    await flushPromises();
    expect(load).not.toHaveBeenCalled();

    enabled.value = true;
    await flushPromises();
    expect(load).toHaveBeenCalledTimes(1);
    expect(list.items.value).toEqual([1, 2, 3]);
  });
});
