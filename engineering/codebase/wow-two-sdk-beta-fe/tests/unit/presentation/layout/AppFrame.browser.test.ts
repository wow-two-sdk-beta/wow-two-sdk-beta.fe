import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { computed, h } from 'vue';
import { page } from 'vitest/browser';
import { DeviceClass, DeviceClassKey, type DeviceClassState } from '@src/foundation/device';
import { getTheme, themeToCss } from '@src/foundation/themes';
import { AppFrame } from '@src/presentation/layout';
import { SidebarMenu, SidebarMenuItem, SidebarMenuSection } from '@src/presentation/nav';
import { canEmulateCoarsePointer, useCoarsePointer, useFinePointer } from '../../../support/CoarsePointer';
import { reachOf } from '../../../support/TouchReach';
import '@src/index.css';

const Cases = [
  { name: 'default light', theme: false, dark: false },
  { name: 'default dark', theme: false, dark: true },
  { name: 'ocharo light', theme: true, dark: false },
  { name: 'ocharo dark', theme: true, dark: true },
] as const;

/** A 28px square mark, inlined so the test loads no file. */
const LogoMark =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><rect width="28" height="28" fill="teal"/></svg>';

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
    /** Brands the frame as SCFD does: a flex link around a 28px mark, named by its label alone. */
    logo?: boolean;
    /** Adds a wordmark after the mark while the brand is not the rail's, as SCFD's lockup does. */
    wordmark?: boolean;
    /** Lays the sidebar out as SCFD does: labelled sections of links. */
    sections?: ReadonlyArray<ReadonlyArray<string>>;
    /** Leaves the first section without a label, as SCFD's home section is. */
    isHomeUnlabelled?: boolean;
    /** Puts the brand behind the app switcher, whose compact trigger is the rail's brand. */
    apps?: boolean;
  } = {},
): void {
  wrapper = mount(AppFrame, {
    props: {
      version: options.version ?? '0.4.2',
      ...(options.runningVersion === undefined ? {} : { runningVersion: options.runningVersion }),
      ...(options.apps
        ? {
            apps: [{ key: 'console', label: 'Console', href: 'https://console.example.com/', kind: 'app' as const }],
            currentApp: 'console',
          }
        : {}),
      crumbs: [{ label: 'Operations', href: '/ops' }, { label: 'Release 42' }],
    },
    global: options.effective ? { provide: { [DeviceClassKey as symbol]: deviceState(options.effective) } } : {},
    slots: {
      brand: ({ isRail }) =>
        options.logo
          ? h(
              'a',
              { href: '/', 'data-test': 'brand-mark', class: 'flex shrink-0 items-center', 'aria-label': 'SCFD home' },
              [
                h('img', { src: LogoMark, alt: '', width: 28, height: 28, class: 'size-7 rounded-md' }),
                options.wordmark && !isRail ? h('span', { class: 'ms-2 font-semibold' }, 'SCFD Console') : null,
              ],
            )
          : h(
              'a',
              { href: '/', 'data-test': 'brand-mark', class: 'whitespace-nowrap font-semibold' },
              options.brand ?? 'W',
            ),
      nav: ({ isRail }) =>
        h(SidebarMenu, { isCollapsed: isRail }, () =>
          options.sections
            ? options.sections.map((links, index) =>
                h(
                  SidebarMenuSection,
                  options.isHomeUnlabelled && index === 0 ? {} : { label: `Section ${index + 1}` },
                  () =>
                    links.map((link) =>
                      h(SidebarMenuItem, { href: `#/${link}` }, { default: () => link, icon: () => h('span', '•') }),
                    ),
                ),
              )
            : h(
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

describe('AppFrame rail', () => {
  /** SCFD's sidebar: a home section, then two more, each drawn as a divider in the rail. */
  const Sections = [['Home'], ['Orders', 'Returns'], ['Settings']] as const;

  afterAll(async () => {
    await page.viewport(414, 896);
  });

  const links = (): HTMLElement[] => Array.from(sidebar().querySelectorAll<HTMLElement>('a[href]'));
  const dividers = (): HTMLElement[] =>
    Array.from(sidebar().querySelectorAll<HTMLElement>('li > div > span[aria-hidden="true"]')).filter(
      (divider) => getComputedStyle(divider).display !== 'none',
    );
  const centreX = (element: Element): number => {
    const rect = element.getBoundingClientRect();
    return rect.left + rect.width / 2;
  };

  /** Collapses a desktop frame and waits until the rail and its section rows have settled. */
  async function collapse(): Promise<void> {
    await expect.poll(() => width(sidebar()), Settled).toBe(248);
    document.querySelector<HTMLButtonElement>('[data-app-frame-toggle]')!.click();
    await expect.poll(() => width(sidebar()), Settled).toBe(64);
    await expect.poll(() => width(brand()), Settled).toBe(64);
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  it('centres the brand mark over the rail at 1440px', { timeout: 30_000 }, async () => {
    await page.viewport(1440, 900);
    mountFrame({ logo: true, sections: Sections });
    await collapse();
    const mark = brand().querySelector('img')!;
    const icon = links()[0]!.querySelector('span')!;
    expect(Math.abs(centreX(mark) - 32)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(centreX(mark) - centreX(icon))).toBeLessThanOrEqual(0.5);
    expect(brand().scrollWidth).toBeLessThanOrEqual(brand().clientWidth);
  });

  it('holds the brand mark at the rail centre while the cell narrows', { timeout: 30_000 }, async () => {
    await page.viewport(1440, 900);
    mountFrame({ logo: true, sections: Sections });
    document.querySelector<HTMLElement>('[data-app-frame]')!.style.setProperty('--duration-base', '800ms');
    await expect.poll(() => width(sidebar()), Settled).toBe(248);
    document.querySelector<HTMLButtonElement>('[data-app-frame-toggle]')!.click();
    await expect
      .poll(() => {
        const current = width(brand());
        return current > 70 && current < 240;
      }, Settled)
      .toBe(true);
    expect(Math.abs(centreX(brand().querySelector('img')!) - 32)).toBeLessThanOrEqual(0.5);
  });

  it('centres the compact app switcher over the rail at 1440px', { timeout: 30_000 }, async () => {
    await page.viewport(1440, 900);
    mountFrame({ apps: true, sections: Sections });
    await collapse();
    const trigger = brand().querySelector('[data-app-switcher-mark]')!;
    expect(Math.abs(centreX(trigger) - 32)).toBeLessThanOrEqual(0.5);
  });

  it('starts the expanded brand mark at the rail-centred x', { timeout: 30_000 }, async () => {
    await page.viewport(1440, 900);
    mountFrame({ logo: true, sections: Sections });
    await expect.poll(() => width(sidebar()), Settled).toBe(248);
    expect(Math.round(brand().querySelector('img')!.getBoundingClientRect().left)).toBe(18);
  });

  it('keeps the brand symbol and every menu icon still across collapse and expand', { timeout: 30_000 }, async () => {
    await page.viewport(1440, 900);
    mountFrame({ logo: true, wordmark: true, sections: Sections, isHomeUnlabelled: true });
    /* The brand link's first child is its symbol; a menu link's first child is its leading icon box. */
    const marks = (): HTMLElement[] =>
      [brand().querySelector('a')!, ...links()].map((link) => link.firstElementChild as HTMLElement);
    const boxes = (): number[][] =>
      marks().map((mark) => {
        const rect = mark.getBoundingClientRect();
        return [rect.left, rect.top, rect.width, rect.height];
      });
    const largestShift = (from: number[][], to: number[][]): number =>
      Math.max(...from.flatMap((box, index) => box.map((value, side) => Math.abs(value - to[index]![side]!))));

    await expect.poll(() => width(sidebar()), Settled).toBe(248);
    await new Promise((resolve) => setTimeout(resolve, 400));
    const expanded = boxes();
    expect(expanded).toHaveLength(1 + Sections.flat().length);

    await collapse();
    expect(largestShift(expanded, boxes())).toBeLessThanOrEqual(0.5);

    document.querySelector<HTMLButtonElement>('[data-app-frame-toggle]')!.click();
    await expect.poll(() => width(sidebar()), Settled).toBe(248);
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(largestShift(expanded, boxes())).toBeLessThanOrEqual(0.5);
  });

  it('draws no heading row for a section without a label', { timeout: 30_000 }, async () => {
    await page.viewport(1440, 900);
    mountFrame({ logo: true, sections: Sections, isHomeUnlabelled: true });
    await expect.poll(() => width(sidebar()), Settled).toBe(248);
    const home = sidebar().querySelector<HTMLElement>('nav > ul > li')!;
    expect(home.querySelector(':scope > div')).toBeNull();
    expect(home.querySelector('ul')!.hasAttribute('aria-labelledby')).toBe(false);
    const barBottom = bar().getBoundingClientRect().bottom;
    expect(Math.round(links()[0]!.getBoundingClientRect().top - barBottom)).toBe(12);
    await collapse();
    expect(Math.round(links()[0]!.getBoundingClientRect().top - barBottom)).toBe(12);
  });

  it('sets the first rail link 12px under the bar and centres every divider', { timeout: 30_000 }, async () => {
    await page.viewport(1440, 900);
    mountFrame({ logo: true, sections: Sections });
    await expect.poll(() => width(sidebar()), Settled).toBe(248);
    const sections = Array.from(sidebar().querySelectorAll<HTMLElement>('nav > ul > li'));
    const expanded = sections.map((section) => section.getBoundingClientRect().height);
    await collapse();

    const barBottom = bar().getBoundingClientRect().bottom;
    expect(Math.round(links()[0]!.getBoundingClientRect().top - barBottom)).toBe(12);

    const rows = dividers();
    expect(rows).toHaveLength(Sections.length - 1);
    for (const divider of rows) {
      const line = divider.getBoundingClientRect();
      const below = divider.closest('li')!.querySelector('a[href]')!.getBoundingClientRect();
      const above = links()
        .map((link) => link.getBoundingClientRect())
        .filter((rect) => rect.bottom <= line.top)
        .at(-1)!;
      const gapAbove = line.top - above.bottom;
      const gapBelow = below.top - line.bottom;
      expect(Math.abs(gapAbove - gapBelow)).toBeLessThanOrEqual(1);
    }
    // Every section after the first keeps its height, so the toggle moves no link but the first section's.
    sections.slice(1).forEach((section, index) => {
      expect(Math.round(section.getBoundingClientRect().height)).toBe(Math.round(expanded[index + 1]!));
    });
  });
});

describe.skipIf(!canEmulateCoarsePointer)('AppFrame under a coarse pointer', () => {
  beforeEach(async () => {
    await useCoarsePointer();
  });
  afterEach(async () => {
    await useFinePointer();
  });

  it('gives the collapse control a 44 x 44px hit area on its 40px box at 1280px', { timeout: 30_000 }, async () => {
    await page.viewport(1280, 800);
    mountFrame();
    const toggle = document.querySelector<HTMLButtonElement>('[data-app-frame-toggle]')!;
    await expect.poll(() => reachOf(toggle).height, Settled).toBeGreaterThanOrEqual(43.5);
    expect(toggle.getAttribute('aria-label')).toBe('Collapse sidebar');
    expect(reachOf(toggle).width).toBeGreaterThanOrEqual(43.5);
    expect(Math.round(toggle.getBoundingClientRect().width)).toBe(40);
    expect(bar().getBoundingClientRect().height).toBe(56);
  });

  describe('brand link', () => {
    const brandLink = (): HTMLElement =>
      document.querySelector<HTMLElement>('[data-app-frame-brand] a[aria-label="SCFD home"]')!;

    afterAll(async () => {
      await page.viewport(414, 896);
    });

    it('gives the brand link a 44 x 44px hit area on a phone at 320px', { timeout: 30_000 }, async () => {
      await page.viewport(320, 640);
      mountFrame({ logo: true });
      await expect.poll(() => document.querySelector('[data-app-frame-brand] a'), Settled).not.toBeNull();
      const reach = reachOf(brandLink());
      expect(reach.height).toBeGreaterThanOrEqual(43.5);
      expect(reach.width).toBeGreaterThanOrEqual(43.5);
      expect(bar().getBoundingClientRect().height).toBe(56);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
    });

    it('gives the brand link a 44 x 44px hit area in the rail of a tablet', { timeout: 30_000 }, async () => {
      await page.viewport(800, 800);
      mountFrame({ logo: true });
      await expect.poll(() => width(brand()), Settled).toBe(64);
      const reach = reachOf(brandLink());
      expect(reach.height).toBeGreaterThanOrEqual(43.5);
      expect(reach.width).toBeGreaterThanOrEqual(43.5);
      expect(brand().scrollWidth).toBeLessThanOrEqual(brand().clientWidth);
    });

    it('keeps the brand mark at the rail centre in the rail of a tablet', { timeout: 30_000 }, async () => {
      await page.viewport(800, 800);
      mountFrame({ logo: true });
      await expect.poll(() => width(brand()), Settled).toBe(64);
      const mark = brandLink().querySelector('img')!.getBoundingClientRect();
      expect(Math.abs(mark.left + mark.width / 2 - 32)).toBeLessThanOrEqual(0.5);
      expect(Math.round(brandLink().getBoundingClientRect().width)).toBe(28);
    });

    it('keeps the mark itself at 28 x 28px', { timeout: 30_000 }, async () => {
      await page.viewport(320, 640);
      mountFrame({ logo: true });
      await expect.poll(() => document.querySelector('[data-app-frame-brand] a'), Settled).not.toBeNull();
      const mark = brandLink().querySelector('img')!.getBoundingClientRect();
      expect(Math.round(mark.width)).toBe(28);
      expect(Math.round(mark.height)).toBe(28);
    });
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

  it('keeps the brand link at the size of its mark on a phone', { timeout: 30_000 }, async () => {
    await page.viewport(320, 640);
    mountFrame({ logo: true });
    await expect.poll(() => document.querySelector('[data-app-frame-brand] a'), Settled).not.toBeNull();
    const rect = document.querySelector<HTMLElement>('[data-app-frame-brand] a')!.getBoundingClientRect();
    expect(Math.round(rect.width)).toBe(28);
    expect(Math.round(rect.height)).toBe(28);
    await page.viewport(414, 896);
  });
});
