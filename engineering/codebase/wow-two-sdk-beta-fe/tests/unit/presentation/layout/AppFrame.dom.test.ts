import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick, type VNode } from 'vue';
import { AppFrame, type AppFrameNavSlotProps } from '@src/presentation/layout';
import { AccountMenu, type AppSwitcherItem } from '@src/presentation/nav';

const DefaultKey = 'wow-two.app-frame.sidebar-collapsed';

const Apps: readonly AppSwitcherItem[] = [
  { key: 'desk', label: 'Desk', href: 'https://desk.example.com/', kind: 'app' },
  { key: 'blog', label: 'Blog', href: 'https://blog.example.com/', kind: 'site' },
];

const wrappers: VueWrapper[] = [];

beforeEach(() => {
  // happy-dom lays nothing out, so FocusScope would treat the drawer's links as hidden.
  vi.spyOn(HTMLElement.prototype, 'checkVisibility').mockReturnValue(true);
});

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
  localStorage.clear();
  vi.restoreAllMocks();
});

/** Answers the `md` and `lg` min-width queries, so the frame takes its phone, tablet or desktop surface. */
function viewport({ md, lg }: { md: boolean; lg: boolean }): void {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: query.includes('768px') ? md : query.includes('1024px') ? lg : false,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

const Desktop = { md: true, lg: true };
const Tablet = { md: true, lg: false };
const Phone = { md: false, lg: false };

/**
 * Settles the Portal teleport and mount focus, then lets the clock advance: Vue's event invoker skips
 * an event stamped in the millisecond its listener was attached.
 */
async function settle(): Promise<void> {
  for (let tick = 0; tick < 4; tick += 1) await nextTick();
  const mountedAt = Date.now();
  while (Date.now() === mountedAt) await Promise.resolve();
}

interface Mounted {
  readonly wrapper: VueWrapper;
  readonly nav: AppFrameNavSlotProps[];
  readonly brand: boolean[];
}

async function frame(
  props: Record<string, unknown> = {},
  slots: Record<string, (() => VNode | VNode[] | string) | undefined> = {},
  options: { nav?: boolean } = {},
): Promise<Mounted> {
  const nav: AppFrameNavSlotProps[] = [];
  const brand: boolean[] = [];
  const wrapper = mount(AppFrame, {
    props,
    slots: {
      brand: (slot: { isRail: boolean }) => {
        brand.push(slot.isRail);
        return h('a', { href: '/', 'data-brand-link': '' }, slot.isRail ? 'W' : 'Console');
      },
      ...(options.nav === false
        ? {}
        : {
            nav: (slot: AppFrameNavSlotProps) => {
              nav.push({ ...slot });
              return h('a', { href: '#/one', 'data-nav-link': '' }, 'One');
            },
          }),
      default: () => 'Page',
      ...slots,
    },
    attachTo: document.body,
  });
  wrappers.push(wrapper);
  await settle();
  return { wrapper, nav, brand };
}

const root = (): HTMLElement => document.querySelector<HTMLElement>('[data-app-frame]')!;
const brandCell = (): HTMLElement => document.querySelector<HTMLElement>('[data-app-frame-brand]')!;
const toggle = (): HTMLButtonElement => document.querySelector<HTMLButtonElement>('[data-app-frame-toggle]')!;
const dialog = (): HTMLElement | null => document.querySelector<HTMLElement>('[role=dialog]');

describe('AppFrame desktop', () => {
  it('renders the brand cell, toggle, trail and account trigger', async () => {
    viewport(Desktop);
    await frame({ crumbs: [{ label: 'Operations', href: '/ops' }, { label: 'Release' }], account: { name: 'Dana' } });
    expect(brandCell().style.width).toBe('var(--frame-sidebar-width)');
    expect(toggle()).not.toBeNull();
    expect(document.querySelector('nav[aria-label=Breadcrumb]')).not.toBeNull();
    expect(document.querySelector('button[aria-haspopup=menu]')).not.toBeNull();
    expect(root().hasAttribute('data-rail')).toBe(false);
    expect(document.querySelector('aside')).not.toBeNull();
  });

  it('collapses to the rail and remembers the choice', async () => {
    viewport(Desktop);
    const { wrapper, nav } = await frame();
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    toggle().click();
    await settle();
    expect(root().hasAttribute('data-rail')).toBe(true);
    expect(brandCell().style.width).toBe('var(--frame-rail-width)');
    expect(nav.at(-1)?.isRail).toBe(true);
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(wrapper.emitted('collapse')).toEqual([[true]]);
    expect(localStorage.getItem(DefaultKey)).toBe('true');

    await frame();
    expect(document.querySelectorAll('[data-app-frame]')[1]!.hasAttribute('data-rail')).toBe(true);
  });

  it('honours a custom storage key', async () => {
    viewport(Desktop);
    await frame({ collapseStorageKey: 'my.key' });
    toggle().click();
    await settle();
    expect(localStorage.getItem('my.key')).toBe('true');
    expect(localStorage.getItem(DefaultKey)).toBeNull();
  });

  it('starts as the rail with is-collapsed-by-default and stores nothing', async () => {
    viewport(Desktop);
    await frame({ isCollapsedByDefault: true });
    expect(root().hasAttribute('data-rail')).toBe(true);
    expect(brandCell().style.width).toBe('var(--frame-rail-width)');
    expect(localStorage.length).toBe(0);
  });

  it('shows the content container at the shared width, and none at full width', async () => {
    viewport(Desktop);
    await frame();
    const container = document.querySelector<HTMLElement>('[data-content-container]');
    expect(container?.style.maxWidth).toBe('var(--frame-content-max)');
    document.body.innerHTML = '';
    await frame({ contentWidth: 'full' });
    expect(document.querySelector('[data-content-container]')).toBeNull();
  });

  it('lists the bar slots in DOM order', async () => {
    viewport(Desktop);
    await frame(
      { account: { name: 'Dana' } },
      {
        'bar-start': () => h('i', { 'data-slot': 'bar-start' }),
        trail: () => h('i', { 'data-slot': 'trail' }),
        'bar-end': () => h('i', { 'data-slot': 'bar-end' }),
        notice: () => h('i', { 'data-slot': 'notice' }),
      },
    );
    const order = [...document.querySelectorAll('[data-app-frame-row] > *')].map((node) =>
      node.hasAttribute('data-app-frame-toggle')
        ? 'toggle'
        : node.getAttribute('data-slot') || (node.matches('button[aria-haspopup=menu]') ? 'account' : ''),
    );
    expect(order.filter(Boolean)).toEqual(['toggle', 'bar-start', 'trail', 'bar-end', 'account']);
    expect(document.querySelector('[data-slot=notice]')).not.toBeNull();
  });
});

describe('AppFrame tablet', () => {
  it('forces the rail and opens the full navigation in a drawer', async () => {
    viewport(Tablet);
    const { nav } = await frame();
    expect(root().hasAttribute('data-rail')).toBe(true);
    expect(toggle().getAttribute('aria-label')).toBe('Open navigation');
    expect(dialog()).toBeNull();
    toggle().click();
    await settle();
    expect(dialog()).not.toBeNull();
    expect(dialog()!.querySelector('[data-nav-link]')).not.toBeNull();
    expect(nav.at(-1)?.isRail).toBe(false);
  });

  it('closes the drawer when a link inside it is clicked', async () => {
    viewport(Tablet);
    await frame();
    toggle().click();
    await settle();
    dialog()!.querySelector<HTMLAnchorElement>('[data-nav-link]')!.click();
    await vi.waitFor(() => expect(dialog()).toBeNull());
  });
});

describe('AppFrame phone', () => {
  it('carries the brand inline as the mark and keeps the toggle without a bottom bar', async () => {
    viewport(Phone);
    const { brand } = await frame({ version: '0.4.2' });
    expect(brandCell().closest('[data-app-frame-row]')).not.toBeNull();
    expect(brand.at(-1)).toBe(true);
    expect(toggle()).not.toBeNull();
    expect(document.querySelector('[data-app-frame-phone-nav]')).toBeNull();
  });

  it('drops the toggle and renders the bottom bar with a phone-nav slot', async () => {
    viewport(Phone);
    await frame({}, { 'phone-nav': () => h('nav', { 'data-bottom': '' }) });
    expect(toggle()).toBeNull();
    expect(document.querySelector('[data-app-frame-phone-nav] [data-bottom]')).not.toBeNull();
  });
});

describe('AppFrame without navigation', () => {
  it('has no sidebar, toggle or brand cell above it without a nav slot', async () => {
    viewport(Desktop);
    const { brand } = await frame({}, {}, { nav: false });
    expect(document.querySelector('aside')).toBeNull();
    expect(toggle()).toBeNull();
    expect(brandCell().closest('[data-app-frame-row]')).not.toBeNull();
    expect(brand.at(-1)).toBe(false);
  });

  it('treats has-navigation false like a missing slot', async () => {
    viewport(Desktop);
    await frame({ hasNavigation: false });
    expect(document.querySelector('aside')).toBeNull();
    expect(toggle()).toBeNull();
    expect(brandCell().closest('[data-app-frame-row]')).not.toBeNull();
  });
});

describe('AppFrame brand, trail and account', () => {
  it('renders the app switcher, compact in the rail', async () => {
    viewport(Desktop);
    await frame({ apps: Apps, currentApp: 'desk', isCollapsedByDefault: true });
    const trigger = document.querySelector<HTMLElement>('button[aria-haspopup=dialog]');
    expect(trigger).not.toBeNull();
    expect(trigger!.hasAttribute('data-compact')).toBe(true);
  });

  it('keeps the switcher full in the open sidebar', async () => {
    viewport(Desktop);
    await frame({ apps: Apps, currentApp: 'desk' });
    expect(document.querySelector('button[aria-haspopup=dialog]')!.hasAttribute('data-compact')).toBe(false);
  });

  it('hands a plain click on a same-origin crumb to onNavigate', async () => {
    viewport(Desktop);
    const onNavigate = vi.fn();
    await frame({ crumbs: [{ label: 'Deployments', href: '/deployments' }, { label: 'Release' }], onNavigate });
    const link = document.querySelector<HTMLAnchorElement>('nav[aria-label=Breadcrumb] a')!;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(event);
    expect(onNavigate).toHaveBeenCalledWith('/deployments', expect.any(MouseEvent));
    expect(event.defaultPrevented).toBe(true);
  });

  it('leaves a ctrl-click and an absolute href to the browser', async () => {
    viewport(Desktop);
    const onNavigate = vi.fn();
    await frame({
      crumbs: [
        { label: 'Local', href: '/local' },
        { label: 'Remote', href: 'https://example.com/remote' },
        { label: 'Release' },
      ],
      onNavigate,
    });
    const [local, remote] = document.querySelectorAll<HTMLAnchorElement>('nav[aria-label=Breadcrumb] a');
    const ctrl = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true });
    local!.dispatchEvent(ctrl);
    const absolute = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    remote!.dispatchEvent(absolute);
    expect(onNavigate).not.toHaveBeenCalled();
    expect(ctrl.defaultPrevented).toBe(false);
    expect(absolute.defaultPrevented).toBe(false);
  });

  it('re-emits the account menu language change', async () => {
    viewport(Desktop);
    const { wrapper } = await frame({ account: { name: 'Dana', showAppearance: false } });
    wrapper.findComponent(AccountMenu).vm.$emit('update:locale', 'ru');
    expect(wrapper.emitted('update:locale')).toEqual([['ru']]);
  });

  it('replaces the account menu with the account slot', async () => {
    viewport(Desktop);
    await frame({ account: { name: 'Dana' } }, { account: () => h('i', { 'data-own-account': '' }) });
    expect(document.querySelector('[data-own-account]')).not.toBeNull();
    expect(document.querySelector('button[aria-haspopup=menu]')).toBeNull();
  });
});

describe('AppFrame version', () => {
  it('offers a reload while the running version differs', async () => {
    viewport(Desktop);
    const onReload = vi.fn();
    await frame({ version: '0.4.2', runningVersion: '0.4.3', onReload });
    const badge = document.querySelector<HTMLButtonElement>('[data-version-badge]')!;
    expect(badge.tagName).toBe('BUTTON');
    expect(badge.hasAttribute('data-stale')).toBe(true);
    badge.click();
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('shows a plain badge while the versions match', async () => {
    viewport(Desktop);
    await frame({ version: '0.4.2', runningVersion: '0.4.2' });
    expect(document.querySelector('[data-version-badge]')!.tagName).toBe('SPAN');
  });
});
