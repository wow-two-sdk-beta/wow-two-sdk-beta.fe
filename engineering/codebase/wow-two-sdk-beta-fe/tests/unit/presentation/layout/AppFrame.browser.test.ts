import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h } from 'vue';
import { page } from 'vitest/browser';
import { getTheme, themeToCss } from '@src/foundation/themes';
import { AppFrame } from '@src/presentation/layout';
import { SidebarMenu, SidebarMenuItem } from '@src/presentation/nav';
import '@src/index.css';

const Cases = [
  { name: 'default light', theme: false, dark: false },
  { name: 'default dark', theme: false, dark: true },
  { name: 'ocharo light', theme: true, dark: false },
  { name: 'ocharo dark', theme: true, dark: true },
] as const;

let wrapper: VueWrapper | null = null;
let style: HTMLStyleElement | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  style?.remove();
  style = null;
  document.body.innerHTML = '';
  document.documentElement.className = '';
  localStorage.clear();
});

function setup(options: { theme: boolean; dark: boolean }): void {
  if (options.theme) {
    const ocharo = getTheme('ocharo');
    if (!ocharo) throw new Error('The ocharo theme is not registered.');
    style = document.createElement('style');
    style.textContent = themeToCss(ocharo);
    document.head.append(style);
    document.documentElement.classList.add('theme-ocharo');
  }
  document.documentElement.classList.toggle('dark', options.dark);
}

function mountFrame(): void {
  wrapper = mount(AppFrame, {
    props: { version: '0.4.2', crumbs: [{ label: 'Operations', href: '/ops' }, { label: 'Release 42' }] },
    slots: {
      brand: () => h('a', { href: '/', 'data-test': 'brand-mark' }, 'W'),
      nav: ({ isRail }) =>
        h(SidebarMenu, { isCollapsed: isRail }, () =>
          h(
            SidebarMenuItem,
            { href: '#/one' },
            {
              default: () => 'One',
              icon: () => h('span', { 'data-test': 'nav-mark' }, '1'),
            },
          ),
        ),
      default: () => 'Page',
    },
    attachTo: document.body,
  });
}

const bar = (): HTMLElement => document.querySelector<HTMLElement>('[data-app-frame-bar]')!;
const brand = (): HTMLElement => document.querySelector<HTMLElement>('[data-app-frame-brand]')!;
const sidebar = (): HTMLElement => document.querySelector<HTMLElement>('aside')!;
const width = (element: HTMLElement): number => Math.round(element.getBoundingClientRect().width);

/* The sidebar eases between its widths over 200ms; a loaded runner can stretch that well past a second. */
const Settled = { timeout: 8000 };

describe('AppFrame dimensions', () => {
  for (const { name, ...options } of Cases) {
    it(`holds the frame tokens on a desktop, ${name}`, { timeout: 30_000 }, async () => {
      await page.viewport(1280, 800);
      setup(options);
      mountFrame();
      await expect.poll(() => getComputedStyle(bar()).height, Settled).toBe('56px');
      await expect.poll(() => width(brand()), Settled).toBe(248);
      await expect.poll(() => width(sidebar()), Settled).toBe(248);

      document.querySelector<HTMLButtonElement>('[data-app-frame-toggle]')!.click();
      await expect.poll(() => width(brand()), Settled).toBe(64);
      await expect.poll(() => width(sidebar()), Settled).toBe(64);
      expect(getComputedStyle(bar()).height).toBe('56px');
    });
  }

  it('moves the header and sidebar together while their marks stay anchored', { timeout: 30_000 }, async () => {
    await page.viewport(1280, 800);
    mountFrame();
    const shell = document.querySelector<HTMLElement>('[data-app-frame]')!;
    const toggle = document.querySelector<HTMLButtonElement>('[data-app-frame-toggle]')!;
    const marks = Array.from(shell.querySelectorAll<HTMLElement>('[data-test="brand-mark"], [data-test="nav-mark"]'));
    shell.style.setProperty('--duration-base', '800ms');
    await expect.poll(() => width(sidebar()), Settled).toBe(248);
    const lefts = marks.map((mark) => mark.getBoundingClientRect().left);

    for (const settledWidth of [64, 248]) {
      toggle.click();
      await expect
        .poll(() => {
          const current = width(sidebar());
          return current > 70 && current < 240 && current === width(brand());
        }, Settled)
        .toBe(true);
      expect(marks.map((mark) => mark.getBoundingClientRect().left)).toEqual(lefts);
      await expect.poll(() => width(sidebar()), Settled).toBe(settledWidth);
    }
  });

  it('holds the bar and the rail on a tablet', { timeout: 30_000 }, async () => {
    await page.viewport(800, 800);
    setup({ theme: false, dark: false });
    mountFrame();
    await expect.poll(() => getComputedStyle(bar()).height, Settled).toBe('56px');
    await expect.poll(() => width(sidebar()), Settled).toBe(64);
    await expect.poll(() => width(brand()), Settled).toBe(64);
  });
});
