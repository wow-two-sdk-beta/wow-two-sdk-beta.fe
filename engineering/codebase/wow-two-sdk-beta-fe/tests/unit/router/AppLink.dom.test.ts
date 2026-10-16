import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

import { AppLink, type AppLinkProps } from '@src/router';

const Blank = { template: '<div />' };
const wrappers: Array<ReturnType<typeof mount>> = [];

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
});

async function mountAt(path: string, props: AppLinkProps) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Blank },
      { path: '/projects', component: Blank, children: [{ path: ':id', component: Blank }] },
    ],
  });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(AppLink, {
    props,
    slots: { default: () => 'Projects' },
    attrs: { class: 'underline', 'aria-label': 'All projects' },
    global: { plugins: [router] },
  });
  wrappers.push(wrapper);
  return wrapper;
}

describe('AppLink', () => {
  it('renders a bare anchor to its destination with the caller attributes', async () => {
    const wrapper = await mountAt('/', { to: '/projects' });

    const anchor = wrapper.get('a');
    expect(anchor.attributes('href')).toBe('/projects');
    expect(anchor.attributes('class')).toBe('underline');
    expect(anchor.attributes('aria-label')).toBe('All projects');
    expect(anchor.attributes('data-active')).toBeUndefined();
  });

  it('marks itself active on its route and on nested routes unless end is set', async () => {
    const descendant = await mountAt('/projects/42', { to: '/projects' });
    const exact = await mountAt('/projects/42', { to: '/projects', end: true });

    expect(descendant.get('a').attributes('data-active')).toBe('');
    expect(exact.get('a').attributes('data-active')).toBeUndefined();
  });
});
