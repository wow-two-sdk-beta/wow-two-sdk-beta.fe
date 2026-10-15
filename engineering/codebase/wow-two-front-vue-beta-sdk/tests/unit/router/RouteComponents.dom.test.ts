import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppErrorBoundary, RouteAnnouncer, RoutePageHeader } from '@src/router';

const Blank = { template: '<div />' };

function testRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Blank, meta: { title: 'Home' } },
      { path: '/codes', component: Blank, meta: { title: 'Codes' } },
    ],
  });
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('router root components', () => {
  it('announces path changes and focuses the app-shell main content', async () => {
    const router = testRouter();
    await router.push('/');
    await router.isReady();
    const main = document.createElement('main');
    main.id = 'app-shell-main';
    document.body.append(main);
    const focus = vi.spyOn(main, 'focus');
    const wrapper = mount(RouteAnnouncer, {
      attachTo: document.body,
      props: { canAnnounceInitial: true },
      global: { plugins: [router] },
    });
    await nextTick();
    await flushPromises();

    expect(wrapper.text()).toBe('Home');
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });

    focus.mockClear();
    await router.push('/codes');
    await nextTick();
    await flushPromises();

    expect(wrapper.text()).toBe('Codes');
    expect(focus).toHaveBeenCalledTimes(1);
    expect(wrapper.attributes()).toMatchObject({ 'aria-live': 'polite', 'aria-atomic': 'true' });
  });

  it('focuses the new route main after RouterView replaces its DOM', async () => {
    const Page = defineComponent({
      props: ['name'],
      setup: (props) => () => h('main', { id: 'app-shell-main', tabindex: -1 }, props.name),
    });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: Page, props: { name: 'old' }, meta: { title: 'Same title' } },
        {
          path: '/new',
          component: defineComponent({ setup: () => () => h(Page, { name: 'new' }) }),
          meta: { title: 'Same title' },
        },
      ],
    });
    await router.push('/');
    await router.isReady();
    const wrapper = mount(defineComponent({ setup: () => () => [h(RouteAnnouncer), h(RouterView)] }), {
      attachTo: document.body,
      global: { plugins: [router] },
    });
    const old = document.querySelector('main')!;
    const oldFocus = vi.spyOn(old, 'focus');
    await router.push('/new');
    await flushPromises();
    const current = document.querySelector('main')!;
    expect(current).not.toBe(old);
    expect(document.activeElement).toBe(current);
    expect(oldFocus).not.toHaveBeenCalled();
    expect(wrapper.findComponent(RouteAnnouncer).text()).toBe('Same title');
    wrapper.unmount();
  });

  it('renders a captured error through the built-in fallback', async () => {
    const router = testRouter();
    await router.push('/');
    await router.isReady();
    const thrown = Object.assign(new Error('Preview unavailable'), { status: 503 });
    const Broken = defineComponent({
      name: 'BrokenFixture',
      setup() {
        throw thrown;
      },
    });
    const wrapper = mount(AppErrorBoundary, {
      props: { homePath: '/codes' },
      slots: { default: () => h(Broken) },
      global: { plugins: [router] },
    });
    await nextTick();
    await flushPromises();

    expect(wrapper.text()).toContain('503');
    expect(wrapper.text()).toContain('Preview unavailable');
    expect(wrapper.get('a').attributes('href')).toBe('/codes');
  });

  it('heads the page with the route title and description, letting props override', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: Blank, meta: { title: 'Home' } },
        {
          path: '/codes/:id',
          component: Blank,
          meta: { title: (route: { params: { id?: string } }) => `Code ${route.params.id}`, description: 'One code.' },
        },
        { path: '/seo', component: Blank, meta: { title: 'Seo', meta: { description: 'From the head meta.' } } },
      ],
    });
    await router.push('/codes/7');
    await router.isReady();
    const wrapper = mount(RoutePageHeader, { global: { plugins: [router] } });
    expect(wrapper.get('h1').text()).toBe('Code 7');
    expect(wrapper.text()).toContain('One code.');

    await router.push('/seo');
    await nextTick();
    expect(wrapper.get('h1').text()).toBe('Seo');
    expect(wrapper.text()).toContain('From the head meta.');

    await wrapper.setProps({ title: 'Override' });
    expect(wrapper.get('h1').text()).toBe('Override');
    wrapper.unmount();
  });
});
