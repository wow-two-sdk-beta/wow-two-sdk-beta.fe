import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import { page } from 'vitest/browser';
import { AppShell, AppShellHeader, AppShellMain, AppShellSidebar } from '@src/presentation/layout';
import '@src/index.css';

let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

afterAll(async () => {
  await page.viewport(414, 896);
});

/* A row of unbreakable links: its min-content is far wider than a phone. */
const wideNav = (): unknown =>
  h(
    'nav',
    { 'data-wide-nav': '', style: 'display: flex; gap: 16px' },
    Array.from({ length: 12 }, (_, index) =>
      h('a', { href: '#', style: 'white-space: nowrap' }, `Section number ${index + 1}`),
    ),
  );

const width = (selector: string): number => Math.round(document.querySelector(selector)!.getBoundingClientRect().width);

describe('app shell column', () => {
  it('keeps a wide header nav from widening the shell on a phone', async () => {
    await page.viewport(375, 812);
    wrapper = mount(AppShell, {
      slots: {
        default: () => [
          h(AppShellHeader, { class: 'shell-header' }, () => wideNav()),
          h(AppShellMain, { class: 'shell-main' }, () => 'Body'),
        ],
      },
      attachTo: document.body,
    });
    await nextTick();
    expect(width('[data-wide-nav]')).toBeGreaterThan(375);
    expect(width('.shell-header')).toBeLessThanOrEqual(375);
    expect(width('.shell-main')).toBeLessThanOrEqual(375);
  });

  it('keeps a wide header and wide page content from widening the column beside the sidebar', async () => {
    await page.viewport(1280, 800);
    wrapper = mount(AppShell, {
      props: { navigation: 'vertical', scroll: 'document' },
      slots: {
        default: () => [
          h(AppShellHeader, { class: 'shell-header' }, () => [wideNav(), wideNav()]),
          h(AppShellSidebar, null, () => 'Nav'),
          h(AppShellMain, { class: 'shell-main' }, () =>
            h('div', { style: 'width: 2400px; height: 20px' }, 'Wide table'),
          ),
        ],
      },
      attachTo: document.body,
    });
    await nextTick();
    expect(width('.shell-header')).toBeLessThanOrEqual(1280);
    expect(width('.shell-main')).toBeLessThanOrEqual(1280 - 240);
  });
});
