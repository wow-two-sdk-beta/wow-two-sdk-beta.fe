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
    setup: () => () =>
      h('div', { style: 'height: 4000px; flex-shrink: 0', 'data-page': name }, [
        name,
        h('h2', { id: `${name}-deep`, style: 'margin-top: 2000px' }, 'Deep'),
      ]),
  });

/** Lets vue-router run its scroll behavior, which it calls a tick after the navigation settles. */
const frames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

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

it('keeps the region scroller when a navigation changes only the query or hash', async () => {
  const router = await mountShell('region');
  const main = document.querySelector<HTMLElement>('[data-scroll-region]')!;
  main.scrollTop = 900;
  await expect.poll(() => Math.round(main.scrollTop)).toBe(900);

  // A page writing its scroll offset or filters to the address must not lose its place.
  await router.replace({ path: '/a', query: { scroll: '900' } });
  await router.push({ path: '/a', query: { scroll: '900', q: 'shoes' } });
  await frames();
  expect(Math.round(main.scrollTop)).toBe(900);

  // A newly named hash still scrolls to its target; the same hash with a new query stays put.
  const deep = document.getElementById('A-deep')!;
  await router.push({ path: '/a', query: { q: 'shoes' }, hash: '#A-deep' });
  await expect
    .poll(() => Math.abs(Math.round(deep.getBoundingClientRect().top - main.getBoundingClientRect().top)))
    .toBeLessThanOrEqual(1);
  main.scrollTop = 500;
  await expect.poll(() => Math.round(main.scrollTop)).toBe(500);
  await router.replace({ path: '/a', query: { q: 'boots' }, hash: '#A-deep' });
  await frames();
  expect(Math.round(main.scrollTop)).toBe(500);

  await router.push('/b');
  await expect.poll(() => document.querySelector('[data-page=B]') !== null).toBe(true);
  await expect.poll(() => Math.round(main.scrollTop)).toBe(0);
});

it('resets the region scroller on a navigation to another path and restores it on back', async () => {
  const router = await mountShell('region');
  const main = document.querySelector<HTMLElement>('[data-scroll-region]')!;
  expect(main.tagName).toBe('MAIN');
  main.scrollTop = 800;
  await expect.poll(() => Math.round(main.scrollTop)).toBe(800);

  await router.push('/b');
  await expect.poll(() => document.querySelector('[data-page=B]') !== null).toBe(true);
  await expect.poll(() => Math.round(main.scrollTop)).toBe(0);

  main.scrollTop = 300;
  router.back();
  await expect.poll(() => document.querySelector('[data-page=A]') !== null).toBe(true);
  await expect.poll(() => Math.round(main.scrollTop)).toBe(800);

  router.forward();
  await expect.poll(() => document.querySelector('[data-page=B]') !== null).toBe(true);
  await expect.poll(() => Math.round(main.scrollTop)).toBe(300);
});

it('leaves a document shell unmarked', async () => {
  await mountShell('document');
  expect(document.querySelector('[data-scroll-region]')).toBeNull();
});
