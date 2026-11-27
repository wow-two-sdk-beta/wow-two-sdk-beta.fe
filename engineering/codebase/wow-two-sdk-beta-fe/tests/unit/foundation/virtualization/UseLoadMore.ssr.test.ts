import { createSSRApp, defineComponent, h, shallowRef } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { describe, expect, it, vi } from 'vitest';
import { cursorPaging, LoadMoreState, useLoadMore, type LoadMore } from '@src/foundation/virtualization';

/* The ssr project has no DOM globals: a DOM read during setup or render would throw here. */

describe('useLoadMore — server render', () => {
  it('renders the first-load stand-ins and sends no request', async () => {
    const read = vi.fn(async () => ({ ok: true as const, value: { items: [{ id: 1 }], next: null as number | null } }));
    let loader!: LoadMore<{ id: number }, number>;
    const app = createSSRApp(
      defineComponent({
        setup() {
          const list = shallowRef<HTMLElement | null>(null);
          loader = useLoadMore<{ id: number }, number>({
            source: cursorPaging(read),
            key: (item) => item.id,
            list,
            firstPageSize: 4,
          });
          return () =>
            h(
              'ul',
              { ref: list, ...loader.listAttrs.value },
              loader.rows.value.map((row) => h('li', { key: row.key, ...loader.itemAttrs(row.index) })),
            );
        },
      }),
    );
    const html = await renderToString(app);
    expect(typeof document).toBe('undefined');
    expect(loader.state.value).toBe(LoadMoreState.FirstLoad);
    expect(loader.region.value.isFirstLoad).toBe(true);
    expect(html.match(/data-load-more-index/g)).toHaveLength(4);
    expect(read).not.toHaveBeenCalled();
  });
});
