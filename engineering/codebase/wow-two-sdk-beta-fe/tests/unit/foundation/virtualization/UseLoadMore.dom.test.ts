import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, shallowRef } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cursorPaging,
  LoadMoreState,
  offsetPaging,
  useLoadMore,
  type LoadMore,
  type LoadMoreRequest,
  type UseLoadMoreOptions,
} from '@src/foundation/virtualization';

/*
 * happy-dom lays nothing out: the list reads as at the start of the viewport, so these cases prove the state machine,
 * the merge rules and the failure episodes. Geometry, lookahead and anchoring are proven in the window's own tests.
 */

interface Item {
  readonly id: number;
  readonly name: string;
}

type Failure = { readonly code: string; readonly message: string };
const item = (id: number, name = `item ${id}`): Item => ({ id, name });
const range = (from: number, count: number) => Array.from({ length: count }, (_, index) => item(from + index));

/** A cursor source over `rows`, recording each request; `fail` makes the next reads fail. */
function server(rows: () => Item[]) {
  const requests: LoadMoreRequest<number>[] = [];
  const control = { fail: 0, failure: { code: 'unknown', message: 'down' } as Failure };
  const source = cursorPaging<Item, number, undefined, Failure>(async (request) => {
    requests.push(request);
    if (control.fail > 0) {
      control.fail--;
      return { ok: false, failure: control.failure };
    }
    const all = rows();
    const start = request.cursor ?? 0;
    const items = all.slice(start, start + request.limit);
    const next = start + items.length < all.length ? start + items.length : null;
    return { ok: true, value: { items, next, total: all.length } };
  });
  return { source, requests, control };
}

const wrappers: { unmount(): void }[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
});

async function mountLoader(
  options: Partial<UseLoadMoreOptions<Item, number, undefined, Failure>> &
    Pick<UseLoadMoreOptions<Item, number, undefined, Failure>, 'source'>,
) {
  let loader!: LoadMore<Item, number, undefined>;
  const listRef = shallowRef<HTMLElement | null>(null);
  const wrapper = mount(
    defineComponent({
      setup() {
        loader = useLoadMore<Item, number, undefined, Failure>({
          key: (entry) => entry.id,
          list: listRef,
          pageSizes: { minimum: 10, maximum: 30 },
          isWindowed: false,
          refreshesOnFocus: false,
          ...options,
        });
        return () =>
          h(
            'ul',
            { ref: listRef },
            loader.rows.value.map((row) =>
              h('li', { key: row.key, ...loader.itemAttrs(row.index) }, [
                row.item ? h('a', { href: `#${row.item.id}` }, row.item.name) : null,
              ]),
            ),
          );
      },
    }),
    { attachTo: document.body },
  );
  wrappers.push(wrapper);
  return { loader, wrapper };
}

describe('useLoadMore states', () => {
  it('shows first-page stand-ins, then gates the next page behind Show more', async () => {
    const { source, requests } = server(() => range(0, 25));
    const { loader } = await mountLoader({ source });
    expect(loader.state.value).toBe(LoadMoreState.FirstLoad);
    expect(loader.rows.value.every((row) => row.item === undefined)).toBe(true);
    expect(loader.rows.value).toHaveLength(10);
    await flushPromises();
    expect(loader.state.value).toBe(LoadMoreState.Gated);
    expect(loader.items.value).toHaveLength(10);
    expect(requests).toHaveLength(1);
    expect(requests[0]!.limit).toBe(10);
  });

  it('ends at once when the first page has no next, and reports an empty collection', async () => {
    const { loader } = await mountLoader({ source: server(() => []).source });
    await flushPromises();
    expect(loader.state.value).toBe(LoadMoreState.End);
    expect(loader.region.value).toMatchObject({ isEmpty: true, hasData: false, isFirstLoad: false });
  });

  it('loads the minimum on Show more, turns automatic and focuses the first new item', async () => {
    const { source, requests } = server(() => range(0, 100));
    const { loader, wrapper } = await mountLoader({ source });
    await flushPromises();
    await loader.showMore();
    expect(requests[1]!.limit).toBe(10);
    expect(loader.items.value).toHaveLength(20);
    expect(loader.state.value).toBe(LoadMoreState.Automatic);
    expect(document.activeElement).toBe(wrapper.find('[data-load-more-index="10"] a').element);
  });

  it('stops at the end and removes duplicates the server repeats', async () => {
    const rows = [...range(0, 10), item(9), ...range(10, 4)];
    const { loader } = await mountLoader({ source: server(() => rows).source });
    await flushPromises();
    await loader.showMore();
    expect(loader.items.value.map((entry) => entry.id)).toEqual(range(0, 14).map((entry) => entry.id));
    expect(loader.state.value).toBe(LoadMoreState.End);
  });
});

describe('useLoadMore failures', () => {
  it('returns to the gate on a next-page failure and notifies once per episode', async () => {
    const { source, control } = server(() => range(0, 100));
    const onFailure = vi.fn();
    const { loader } = await mountLoader({ source, onFailure });
    await flushPromises();
    control.fail = 2;
    await loader.showMore();
    await loader.showMore();
    expect(loader.state.value).toBe(LoadMoreState.Gated);
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onFailure).toHaveBeenCalledWith(control.failure, 'next');
    await loader.showMore();
    expect(loader.state.value).toBe(LoadMoreState.Automatic);
    control.fail = 1;
    loader.reset();
    await flushPromises();
    expect(onFailure).toHaveBeenCalledTimes(2);
  });

  it('is unavailable when the first page fails, and refresh recovers', async () => {
    const { source, control } = server(() => range(0, 30));
    control.fail = 1;
    const onFailure = vi.fn();
    const { loader } = await mountLoader({ source, onFailure });
    await flushPromises();
    expect(loader.state.value).toBe(LoadMoreState.Unavailable);
    expect(loader.region.value.error).toEqual({ message: 'down' });
    expect(onFailure).toHaveBeenCalledWith(control.failure, 'first');
    await loader.refresh();
    expect(loader.state.value).toBe(LoadMoreState.Gated);
    expect(loader.region.value.error).toBeNull();
  });

  it('ignores a cancelled read', async () => {
    const { source, control } = server(() => range(0, 30));
    const onFailure = vi.fn();
    const { loader } = await mountLoader({ source, onFailure });
    await flushPromises();
    control.failure = { code: 'cancelled', message: 'cancelled' };
    control.fail = 1;
    await loader.showMore();
    expect(loader.state.value).toBe(LoadMoreState.Gated);
    expect(onFailure).not.toHaveBeenCalled();
  });
});

describe('useLoadMore query changes', () => {
  it('aborts the read in flight, drops its answer and keeps automatic once Show more was pressed', async () => {
    const query = shallowRef('a');
    const { source, requests } = server(() => range(query.value === 'a' ? 0 : 500, 40));
    const { loader } = await mountLoader({ source, query });
    await flushPromises();
    await loader.showMore();
    const late = loader.showMore();
    query.value = 'b';
    expect(requests.at(-2)!.signal.aborted).toBe(true);
    expect(loader.state.value).toBe(LoadMoreState.FirstLoad);
    expect(loader.rows.value).toHaveLength(10);
    await late;
    await flushPromises();
    expect(loader.items.value[0]!.id).toBe(500);
    expect(loader.items.value).toHaveLength(10);
    expect(loader.state.value).toBe(LoadMoreState.Automatic);
  });
});

describe('useLoadMore live data', () => {
  it('prepends head arrivals at the start, upserts in place and keeps identity for the same item', async () => {
    let rows = range(0, 30);
    const { loader } = await mountLoader({
      source: server(() => rows).source,
      isSameItem: (current, next) => current.name === next.name,
    });
    await flushPromises();
    const kept = loader.items.value[1];
    rows = [item(-1), item(0, 'renamed'), ...rows.slice(1)];
    await loader.refreshHead();
    expect(loader.items.value.slice(0, 2).map((entry) => entry.name)).toEqual(['item -1', 'renamed']);
    expect(loader.items.value[2]).toBe(kept);
  });

  it('holds a head with no overlap as pending, then resets on showPending', async () => {
    let rows = range(0, 30);
    const { loader } = await mountLoader({ source: server(() => rows).source });
    await flushPromises();
    rows = range(1000, 30);
    await loader.refreshHead();
    expect(loader.pendingCount.value).toBe(10);
    expect(loader.items.value[0]!.id).toBe(0);
    await loader.showPending();
    await flushPromises();
    expect(loader.items.value[0]!.id).toBe(1000);
    expect(loader.pendingCount.value).toBe(0);
  });

  it('keeps content and marks it stale when a head read fails', async () => {
    const { source, control } = server(() => range(0, 30));
    const onFailure = vi.fn();
    const { loader } = await mountLoader({ source, onFailure });
    await flushPromises();
    control.fail = 1;
    await loader.refreshHead();
    expect(loader.isStale.value).toBe(true);
    expect(loader.items.value).toHaveLength(10);
    expect(onFailure).toHaveBeenCalledWith(control.failure, 'head');
  });

  it('shifts the offset on arrivals and removals, so the next read neither repeats nor skips', async () => {
    let rows = range(0, 50);
    const offsets: number[] = [];
    const source = offsetPaging<Item, undefined, Failure>(async ({ offset, limit }) => {
      offsets.push(offset);
      return { ok: true, value: { items: rows.slice(offset, offset + limit), total: rows.length } };
    });
    const { loader } = await mountLoader({ source: source as never });
    await flushPromises();
    rows = [item(-2), item(-1), ...rows];
    loader.insertAtStart([item(-2), item(-1)]);
    rows = rows.filter((entry) => entry.id !== 3);
    loader.remove(3);
    await loader.showMore();
    expect(offsets.at(-1)).toBe(11);
    expect(loader.items.value.map((entry) => entry.id)).toEqual([
      -2,
      -1,
      ...range(0, 20)
        .map((e) => e.id)
        .filter((id) => id !== 3),
    ]);
  });
});

describe('useLoadMore snapshot', () => {
  it('restores items and mode for the same query and ignores another query', async () => {
    const { source, requests } = server(() => range(0, 100));
    const first = await mountLoader({ source, query: 'x' });
    await flushPromises();
    await first.loader.showMore();
    const snapshot = first.loader.snapshot();
    const restored = await mountLoader({ source, query: 'x', initial: snapshot });
    await flushPromises();
    expect(restored.loader.items.value).toHaveLength(20);
    expect(restored.loader.state.value).toBe(LoadMoreState.Automatic);
    const count = requests.length;
    const other = await mountLoader({ source, query: 'y', initial: snapshot });
    await flushPromises();
    expect(requests.length).toBe(count + 1);
    expect(other.loader.state.value).toBe(LoadMoreState.Gated);
  });

  it('aborts on unmount and drops the late answer', async () => {
    const signals: AbortSignal[] = [];
    let answer!: () => void;
    const source = cursorPaging<Item, number, undefined, Failure>(
      ({ signal }) =>
        new Promise((resolve) => {
          signals.push(signal);
          answer = () => resolve({ ok: true, value: { items: range(0, 10), next: null } });
        }),
    );
    const { loader, wrapper } = await mountLoader({ source });
    wrapper.unmount();
    wrappers.splice(wrappers.indexOf(wrapper), 1);
    expect(signals[0]!.aborted).toBe(true);
    answer();
    await flushPromises();
    expect(loader.items.value).toHaveLength(0);
  });
});

describe('useLoadMore surroundings', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'onLine');
    Reflect.deleteProperty(document, 'visibilityState');
  });

  function goOnline(isOnline: boolean) {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => isOnline });
    window.dispatchEvent(new Event(isOnline ? 'online' : 'offline'));
  }

  it('holds reads while offline and reads once when back online', async () => {
    const { source, requests } = server(() => range(0, 100));
    const { loader } = await mountLoader({ source });
    await flushPromises();
    goOnline(false);
    await loader.showMore();
    await loader.refreshHead();
    expect(requests).toHaveLength(1);
    goOnline(true);
    await loader.showMore();
    await flushPromises();
    expect(requests).toHaveLength(2);
    expect(loader.items.value).toHaveLength(20);
  });

  it('refreshes the head when the document becomes visible again', async () => {
    const { source, requests } = server(() => range(0, 30));
    await mountLoader({ source, refreshesOnFocus: true });
    await flushPromises();
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    await flushPromises();
    expect(requests).toHaveLength(2);
    expect(requests[1]!.cursor).toBeNull();
  });

  it('adds three tail stand-ins to a list only while the next page is in flight', async () => {
    let answer!: () => void;
    let reads = 0;
    const source = cursorPaging<Item, number, undefined, Failure>(async (request) => {
      reads++;
      if (reads === 1) return { ok: true, value: { items: range(0, 10), next: 10 } };
      await new Promise<void>((resolve) => (answer = resolve));
      return { ok: true, value: { items: range(request.cursor ?? 0, 10), next: null } };
    });
    const { loader } = await mountLoader({ source });
    await flushPromises();
    expect(loader.rows.value.filter((row) => row.item === undefined)).toHaveLength(0);
    const pressing = loader.showMore();
    await flushPromises();
    const standIns = loader.rows.value.filter((row) => row.item === undefined);
    expect(standIns.map((row) => row.index)).toEqual([10, 11, 12]);
    answer();
    await pressing;
    expect(loader.rows.value.filter((row) => row.item === undefined)).toHaveLength(0);
    expect(loader.state.value).toBe(LoadMoreState.End);
  });
});
