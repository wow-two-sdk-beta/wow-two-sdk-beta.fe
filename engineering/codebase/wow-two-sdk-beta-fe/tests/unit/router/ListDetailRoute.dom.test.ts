import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter, createWebHistory, type Router, type RouterHistory } from 'vue-router';

import { useListDetailRoute, type ListDetailRoute } from '@src/router';

const wrappers: Array<ReturnType<typeof mount>> = [];

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
});

/** Mounts a probe on `path` and hands back the router and the hook it holds. */
async function mountAt(
  path: string,
  history: RouterHistory = createMemoryHistory(),
): Promise<{ router: Router; selection: ListDetailRoute }> {
  const router = createRouter({ history, routes: [{ path: '/secrets', component: { render: () => null } }] });
  await router.push(path);
  await router.isReady();
  let selection!: ListDetailRoute;
  const Probe = defineComponent({
    setup() {
      selection = useListDetailRoute(['vault', 'namespace']);
      return () => h('div');
    },
  });
  wrappers.push(mount(Probe, { global: { plugins: [router] } }));
  return { router, selection };
}

describe('useListDetailRoute', () => {
  it('reads the detail keys and opens while any of them is set', async () => {
    const { selection } = await mountAt('/secrets?tab=keys');
    expect(selection.isDetailOpen.value).toBe(false);
    expect(selection.read('tab')).toBe('keys');
    expect(selection.read('vault')).toBeNull();

    const open = await mountAt('/secrets?namespace=a&namespace=b');
    expect(open.selection.isDetailOpen.value).toBe(true);
    expect(open.selection.read('namespace')).toBe('a');
  });

  it('pushes on open, replaces on switch, and keeps unrelated parameters', async () => {
    const { router, selection } = await mountAt('/secrets?tab=keys');
    const push = vi.spyOn(router, 'push');
    const replace = vi.spyOn(router, 'replace');
    await selection.select({ namespace: 'shop-dev' });
    expect([push.mock.calls.length, replace.mock.calls.length]).toEqual([1, 0]);
    expect(router.currentRoute.value.fullPath).toBe('/secrets?tab=keys&namespace=shop-dev');
    expect(selection.isDetailOpen.value).toBe(true);
    await selection.select({ namespace: 'shop-prod', vault: 'main' });
    expect(router.currentRoute.value.query).toEqual({ tab: 'keys', namespace: 'shop-prod', vault: 'main' });
    await selection.select({ vault: null });
    expect(router.currentRoute.value.query).toEqual({ tab: 'keys', namespace: 'shop-prod' });
    expect([push.mock.calls.length, replace.mock.calls.length]).toEqual([1, 2]);
  });

  it('steps back to the list when the list is the previous entry', async () => {
    window.history.replaceState(null, '', '/');
    const { router, selection } = await mountAt('/secrets?tab=keys', createWebHistory());
    await selection.select({ namespace: 'shop-dev' });
    await selection.select({ namespace: 'shop-prod' });
    const go = vi.spyOn(router, 'back');
    selection.back();
    expect(go).toHaveBeenCalledTimes(1);
    await new Promise((resolve) => setTimeout(resolve, 20));
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe('/secrets?tab=keys');
  });

  it('navigates to the list after a deep link into a detail', async () => {
    const { router, selection } = await mountAt('/secrets?namespace=shop-dev&vault=main&tab=keys');
    selection.back();
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe('/secrets?tab=keys');
    expect(selection.isDetailOpen.value).toBe(false);
  });
});
