import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { computed, h } from 'vue';
import { page } from 'vitest/browser';
import { DeviceClass, DeviceClassKey, type DeviceClassState } from '@src/foundation/device';
import { getTheme, themeToCss } from '@src/foundation/themes';
import { AppFrame } from '@src/presentation/layout';
import { SidebarMenu, SidebarMenuItem } from '@src/presentation/nav';
import { canEmulateCoarsePointer, useCoarsePointer, useFinePointer } from '../../../support/CoarsePointer';
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

/** What an app root's `provideDeviceTargets` would provide, with the effective class fixed. */
function deviceState(effective: DeviceClass): DeviceClassState {
  return {
    detected: computed(() => effective),
    effective: computed(() => effective),
    isShortHeight: computed(() => false),
    isCoarsePointer: computed(() => false),
  };
}

function mountFrame(
  options: {
    effective?: DeviceClass;
    hasPhoneNav?: boolean;
    version?: string;
    runningVersion?: string;
    brand?: string;
  } = {},
): void {
  wrapper = mount(AppFrame, {
    props: {
      version: options.version ?? '0.4.2',
      ...(options.runningVersion === undefined ? {} : { runningVersion: options.runningVersion }),
      crumbs: [{ label: 'Operations', href: '/ops' }, { label: 'Release 42' }],
    },
    global: options.effective ? { provide: { [DeviceClassKey as symbol]: deviceState(options.effective) } } : {},
    slots: {
      brand: () =>
        h(
          'a',
          { href: '/', 'data-test': 'brand-mark', class: 'whitespace-nowrap font-semibold' },
          options.brand ?? 'W',
        ),
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
      ...(options.hasPhoneNav
        ? { 'phone-nav': () => h('nav', { 'data-test': 'bottom-nav', class: 'flex h-14 items-center' }, 'Bottom') }
        : {}),
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

describe('AppFrame on a landscape phone', () => {
  afterAll(async () => {
    await page.viewport(414, 896);
  });

  /** Two animation frames: the frame adopts the viewport on mount, one render after it. */
  const frames = (): Promise<void> =>
    new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

  it('serves the phone layout at 844 x 390 when the provided class is phone', { timeout: 30_000 }, async () => {
    await page.viewport(844, 390);
    mountFrame({ effective: DeviceClass.Phone, hasPhoneNav: true });
    await expect.poll(() => matchMedia('(min-width: 768px)').matches, Settled).toBe(true);
    await frames();

    const shell = document.querySelector<HTMLElement>('[data-app-frame]')!;
    const bottom = document.querySelector<HTMLElement>('[data-app-frame-phone-nav] [data-test="bottom-nav"]');
    expect(bottom).not.toBeNull();
    expect(sidebar()).toBeNull();
    expect(document.querySelector('[data-app-frame-toggle]')).toBeNull();
    expect(brand().closest('[data-app-frame-row]')).not.toBeNull();
    expect(shell.hasAttribute('data-rail')).toBe(false);
    expect(shell.scrollWidth).toBeLessThanOrEqual(shell.clientWidth);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
    expect(Math.round(bottom!.getBoundingClientRect().bottom)).toBe(document.documentElement.clientHeight);
  });

  it('keeps the tablet rail at 844 x 390 when no class is provided', { timeout: 30_000 }, async () => {
    await page.viewport(844, 390);
    mountFrame({ hasPhoneNav: true });
    await expect.poll(() => width(sidebar()), Settled).toBe(64);
    expect(document.querySelector('[data-app-frame-phone-nav]')).toBeNull();
    expect(brand().closest('[data-app-frame-row]')).toBeNull();
  });
});

describe('AppFrame brand cell', () => {
  /* A dev build that is also stale: the longest badge the frame shows, beside a brand that cannot shrink. */
  const LoadedVersion = 'v0.2-local.47e6c6a';
  const RunningVersion = 'v0.3-local.1234567';
  const Widths = [1024, 1280, 1440] as const;

  const badge = (): HTMLElement => brand().querySelector<HTMLElement>('[data-version-badge]')!;

  /** Whether the badge's box lies inside the cell's box, edge to edge. */
  function badgeInsideCell(): boolean {
    const cell = brand().getBoundingClientRect();
    const box = badge().getBoundingClientRect();
    return box.left >= cell.left - 0.5 && box.right <= cell.right + 0.5;
  }

  for (const viewportWidth of Widths) {
    it(
      `clips nothing of a long stale version beside a fixed brand at ${viewportWidth}px`,
      { timeout: 30_000 },
      async () => {
        await page.viewport(viewportWidth, 800);
        mountFrame({ version: LoadedVersion, runningVersion: RunningVersion, brand: 'SCFD Console' });
        await expect.poll(() => width(brand()), Settled).toBe(248);

        expect(brand().scrollWidth).toBeLessThanOrEqual(brand().clientWidth);
        expect(badgeInsideCell()).toBe(true);
        // Shown in full, or cut by an ellipsis whose full text stays on the badge's title.
        const text = badge().querySelector<HTMLElement>('.truncate')!;
        expect(text.scrollWidth <= text.clientWidth || badge().getAttribute('title')?.includes('0.3-local')).toBe(true);
        expect(text.textContent).toBe(RunningVersion);
      },
    );
  }

  it('shows an ordinary version in full beside the brand at 1280px', { timeout: 30_000 }, async () => {
    await page.viewport(1280, 800);
    mountFrame({ version: '0.4.2', brand: 'SCFD Console' });
    await expect.poll(() => width(brand()), Settled).toBe(248);

    const text = badge().querySelector<HTMLElement>('.truncate')!;
    expect(brand().scrollWidth).toBeLessThanOrEqual(brand().clientWidth);
    expect(badgeInsideCell()).toBe(true);
    expect(text.scrollWidth).toBeLessThanOrEqual(text.clientWidth);
    expect(text.textContent).toBe('v0.4.2');
  });
});

describe.skipIf(!canEmulateCoarsePointer)('AppFrame under a coarse pointer', () => {
  beforeEach(async () => {
    await useCoarsePointer();
  });
  afterEach(async () => {
    await useFinePointer();
  });

  it('gives the collapse control a 44 x 44px hit area at 1280px', { timeout: 30_000 }, async () => {
    await page.viewport(1280, 800);
    mountFrame();
    const toggle = document.querySelector<HTMLButtonElement>('[data-app-frame-toggle]')!;
    await expect.poll(() => toggle.getBoundingClientRect().height, Settled).toBeGreaterThanOrEqual(44);
    expect(toggle.getAttribute('aria-label')).toBe('Collapse sidebar');
    expect(toggle.getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
    expect(bar().getBoundingClientRect().height).toBe(56);
  });
});

describe('AppFrame under a fine pointer', () => {
  it('keeps the collapse control at 40 x 40px at 1280px', { timeout: 30_000 }, async () => {
    await page.viewport(1280, 800);
    mountFrame();
    const toggle = document.querySelector<HTMLButtonElement>('[data-app-frame-toggle]')!;
    await expect.poll(() => Math.round(toggle.getBoundingClientRect().height), Settled).toBe(40);
    expect(Math.round(toggle.getBoundingClientRect().width)).toBe(40);
  });
});
