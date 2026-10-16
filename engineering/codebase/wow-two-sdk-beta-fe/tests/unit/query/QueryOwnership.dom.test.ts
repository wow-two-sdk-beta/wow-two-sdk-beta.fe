import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { QueryClient, useQueryClient } from '@tanstack/vue-query';
import { QueryProvider, useAppPaginatedQuery } from '@src/query';
import { ResultExtensions } from '@src/foundation/results';

describe('query ownership', () => {
  it('unmounts the same client that was provided and mounted', async () => {
    const original = new QueryClient();
    const replacement = new QueryClient();
    const mountOriginal = vi.spyOn(original, 'mount');
    const unmountOriginal = vi.spyOn(original, 'unmount');
    const unmountReplacement = vi.spyOn(replacement, 'unmount');
    let injected!: QueryClient;
    const Child = defineComponent({
      setup() {
        injected = useQueryClient();
        return () => null;
      },
    });
    const wrapper = mount(QueryProvider, { props: { client: original }, slots: { default: () => h(Child) } });
    expect(mountOriginal).toHaveBeenCalledOnce();
    await wrapper.setProps({ client: replacement });
    expect(injected).toBe(original);
    wrapper.unmount();
    expect(unmountOriginal).toHaveBeenCalledOnce();
    expect(unmountReplacement).not.toHaveBeenCalled();
    original.clear();
    replacement.clear();
  });

  it('keeps cached page fetchers bound to their own page', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const page = ref(1);
    const fetch = vi.fn(async ({ page: current }: { page: number }) => ResultExtensions.ok([current]));
    const Child = defineComponent({
      setup() {
        useAppPaginatedQuery({ key: ['rows'], page, queryFn: fetch });
        return () => null;
      },
    });
    const wrapper = mount(QueryProvider, { props: { client }, slots: { default: () => h(Child) } });
    await flushPromises();
    page.value = 2;
    await flushPromises();
    await client.refetchQueries({ queryKey: ['rows', 1], exact: true, type: 'all' });
    expect(client.getQueryData(['rows', 1])).toEqual([1]);
    expect(client.getQueryData(['rows', 2])).toEqual([2]);
    wrapper.unmount();
    client.clear();
  });
});
