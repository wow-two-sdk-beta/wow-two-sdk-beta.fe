import { afterEach, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { RouterView } from 'vue-router';
import { createAppRouter } from '@src/router';
import { AppShell, AppShellMain } from '@src/presentation/layout';
import '@src/index.css';

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

const Tall = (name: string) =>
  defineComponent({
    name,
    setup: () => () => h('div', { style: 'height: 4000px; flex-shrink: 0', 'data-page': name }, name),
  });

async function mountShell(scroll: 'region' | 'document') {
  const router = createAppRouter(
    [
      { path: '/a', component: Tall('A') },
      { path: '/b', component: Tall('B') },
    ],
    { history: 'memory', routePersistence: false },
  );
  await router.push('/a');
  await router.isReady();
  wrapper = mount(
    defineComponent({ setup: () => () => h(AppShell, { scroll }, () => h(AppShellMain, null, () => h(RouterView))) }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await expect.poll(() => document.querySelector('[data-page=A]') !== null).toBe(true);
  return router;
}

it('resets the region scroller on a new navigation and restores it on back', async () => {
  const router = await mountShell('region');
  const main = document.querySelector<HTMLElement>('[data-scroll-region]')!;
  expect(main.tagName).toBe('MAIN');
  main.scrollTop = 800;
  await expect.poll(() => main.scrollTop).toBe(800);

  await router.push('/b');
  await expect.poll(() => document.querySelector('[data-page=B]') !== null).toBe(true);
  await expect.poll(() => main.scrollTop).toBe(0);

  main.scrollTop = 300;
  router.back();
  await expect.poll(() => document.querySelector('[data-page=A]') !== null).toBe(true);
  await expect.poll(() => main.scrollTop).toBe(800);

  router.forward();
  await expect.poll(() => document.querySelector('[data-page=B]') !== null).toBe(true);
  await expect.poll(() => main.scrollTop).toBe(300);
});

it('leaves a document shell unmarked', async () => {
  await mountShell('document');
  expect(document.querySelector('[data-scroll-region]')).toBeNull();
});
