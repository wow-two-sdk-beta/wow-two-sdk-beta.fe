import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { describe, expect, it, vi } from 'vitest';

import { lazyPage } from '@src/router';

const Page = defineComponent({
  props: { codeId: { type: String, required: true }, onBack: { type: Function, required: true } },
  setup: (props) => () => h('button', { onClick: () => props.onBack() }, props.codeId),
});

describe('lazyPage', () => {
  it('renders the page with props decoded from the route and callbacks that navigate', async () => {
    const importer = vi.fn(async () => ({ default: Page }));
    const component = lazyPage(importer, (route, router) => ({
      codeId: String(route.params['id']),
      onBack: () => void router.push('/'),
    }));
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<p>home</p>' } },
        { path: '/codes/:id', component: async () => (await component()) as never },
      ],
    });
    await router.push('/codes/c1');
    await router.isReady();
    const wrapper = mount({ render: () => h(RouterView) }, { global: { plugins: [router] } });
    await flushPromises();

    expect(wrapper.text()).toBe('c1');
    await router.push('/codes/c2');
    await flushPromises();
    expect(wrapper.text()).toBe('c2');

    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/');
    expect(importer).toHaveBeenCalledTimes(1);
  });
});
