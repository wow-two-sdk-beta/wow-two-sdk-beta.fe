/* Mounts `useLoadMore` over a real scroller for the browser tier: a cursor server with held or immediate answers. */

import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, shallowRef, type Ref } from 'vue';
import {
  cursorPaging,
  useLoadMore,
  type LoadMore,
  type LoadMoreRequest,
  type UseLoadMoreOptions,
} from '@src/foundation/virtualization';
import LoadMoreButton from '@src/presentation/actions/loadMoreButton/LoadMoreButton.vue';
import NewItemsButton from '@src/presentation/actions/newItemsButton/NewItemsButton.vue';

export interface Row {
  readonly id: number;
  /** Height in 40 px lines (list) or the card height in px (grid). */
  readonly size: number;
}

export type Failure = { readonly code: string; readonly message: string };
export const row = (id: number, size = 1): Row => ({ id, size });
export const rows = (from: number, count: number) => Array.from({ length: count }, (_, index) => row(from + index));

export interface HarnessOptions extends Partial<UseLoadMoreOptions<Row, number, undefined, Failure>> {
  readonly total?: number;
  /** `true` holds every read after the first until `release()`. */
  readonly holds?: boolean;
  readonly cardSize?: (row: Row) => number;
  readonly withButtons?: boolean;
  readonly queryRef?: Ref<unknown>;
}

/** Waits for `count` animation frames and the Vue flush after each. */
export async function frames(count = 3): Promise<void> {
  for (let index = 0; index < count; index++) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await nextTick();
  }
}

export function mountLoadMore(options: HarnessOptions = {}) {
  const { total = 1000, holds = false, cardSize, withButtons = false, queryRef, ...hook } = options;
  const requests: LoadMoreRequest<number>[] = [];
  const held: Array<() => void> = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const source = cursorPaging<Row, number, undefined, Failure>(async (request) => {
    requests.push(request);
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    try {
      if (holds && request.cursor !== null) await new Promise<void>((resolve) => held.push(resolve));
      const start = request.cursor ?? 0;
      const tag = queryRef ? Number(queryRef.value) * 100_000 : 0;
      const items = rows(tag + start, Math.max(0, Math.min(request.limit, total - start)));
      const next = start + items.length < total ? start + items.length : null;
      return { ok: true, value: { items, next, total } };
    } finally {
      inFlight--;
    }
  });
  let loader!: LoadMore<Row, number>;
  const list = shallowRef<HTMLElement | null>(null);
  const isGrid = hook.layout === 'grid';
  const wrapper: VueWrapper = mount(
    defineComponent({
      setup() {
        loader = useLoadMore<Row, number, undefined, Failure>({
          source,
          key: (item) => item.id,
          list,
          pageSizes: { minimum: 30, maximum: 100 },
          estimatedRowHeight: 40,
          refreshesOnFocus: false,
          ...(queryRef ? { query: queryRef } : {}),
          ...hook,
        });
        return () => {
          const attrs = loader.listAttrs.value;
          const items = loader.rows.value.map((entry) =>
            h(
              'li',
              {
                key: entry.key,
                ...loader.itemAttrs(entry.index),
                'data-stand-in': entry.item ? undefined : '',
                style: {
                  height: `${entry.item ? (cardSize?.(entry.item) ?? entry.item.size * 40) : 40}px`,
                  margin: 0,
                },
              },
              entry.item ? [h('a', { href: `#${entry.item.id}` }, `item ${entry.item.id}`)] : [],
            ),
          );
          const listStyle = {
            ...attrs.style,
            margin: 0,
            paddingInline: 0,
            listStyle: 'none',
            ...(isGrid
              ? { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', alignItems: 'start' }
              : {}),
          };
          return h('div', [
            h('div', { 'data-scroller': '', style: 'height: 300px; overflow-y: auto; position: relative' }, [
              withButtons ? h(NewItemsButton, { loader }) : null,
              h('ul', { ref: list, 'aria-busy': attrs['aria-busy'], style: listStyle }, items),
            ]),
            withButtons ? h(LoadMoreButton, { loader }) : null,
          ]);
        };
      },
    }),
    { attachTo: document.body },
  );
  const scroller = () => wrapper.get('[data-scroller]').element as HTMLElement;
  return {
    wrapper,
    loader: () => loader,
    requests,
    maxInFlight: () => maxInFlight,
    release: () => held.splice(0).forEach((resolve) => resolve()),
    scroller,
    list: () => wrapper.get('ul').element as HTMLElement,
    item: (index: number) => wrapper.find(`[data-load-more-index="${index}"]`),
    async scrollTo(top: number, settleFrames = 3) {
      scroller().scrollTop = top;
      await frames(settleFrames);
    },
  };
}
