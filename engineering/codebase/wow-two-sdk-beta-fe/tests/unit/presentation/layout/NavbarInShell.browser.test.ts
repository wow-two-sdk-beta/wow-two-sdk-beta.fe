import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import { page } from 'vitest/browser';
import { AppShell, AppShellHeader, AppShellMain, Navbar } from '@src/presentation/layout';
import '@src/index.css';

let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

describe('Navbar inside AppShellHeader', () => {
  it('leaves the shell header the only banner landmark', async () => {
    wrapper = mount(AppShell, {
      slots: {
        default: () => [
          h(AppShellHeader, { class: 'shell-header' }, () =>
            h(Navbar, null, { start: () => 'Brand', end: () => h('button', { type: 'button' }, 'Account') }),
          ),
          h(AppShellMain, null, () => 'Body'),
        ],
      },
      attachTo: document.body,
    });
    await nextTick();
    expect(page.getByRole('banner').elements()).toEqual([document.querySelector('.shell-header')]);
    expect(page.getByRole('button', { name: 'Account' }).elements()).toHaveLength(1);
    /* The bar fills the host's row inside its box and draws no second bottom border. */
    const host = document.querySelector('.shell-header')!.getBoundingClientRect();
    const bar = document.querySelector<HTMLElement>('.shell-header > div')!;
    const rect = bar.getBoundingClientRect();
    expect(Math.round(rect.height)).toBeLessThanOrEqual(Math.round(host.height));
    expect(Math.round(rect.right)).toBeLessThanOrEqual(Math.round(host.right));
    expect(getComputedStyle(bar).borderBottomWidth).toBe('0px');
  });

  it('stays a banner on its own', async () => {
    wrapper = mount(Navbar, { slots: { start: () => 'Brand' }, attachTo: document.body });
    await nextTick();
    expect(page.getByRole('banner').elements()).toHaveLength(1);
  });
});
