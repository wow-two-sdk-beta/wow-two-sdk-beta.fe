import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, toRaw } from 'vue';
import { Package } from 'lucide-vue-next';
import { LocaleProvider } from '@src/foundation/i18n';
import { AppSwitcherKind, AppSwitcherMenu, type AppSwitcherItem } from '@src/presentation/nav';
import { AppSwitcherMenuExtensions } from '@src/presentation/nav/appSwitcherMenu/AppSwitcherMenuExtensions';

interface Destination extends AppSwitcherItem {
  readonly team: string;
}

const Items: readonly Destination[] = [
  {
    key: 'desk',
    label: 'Desk',
    description: 'Events and orders',
    href: 'https://desk.example.com/',
    kind: 'app',
    team: 'ops',
  },
  {
    key: 'catalogue',
    label: 'Catalogue',
    description: 'Products and prices',
    href: 'https://catalogue.example.com/catalogues',
    icon: Package,
    kind: AppSwitcherKind.App,
    team: 'ops',
  },
  { key: 'studio', label: 'Studio', href: 'https://studio.example.com/', kind: AppSwitcherKind.App, team: 'craft' },
  { key: 'blog', label: 'Blog', href: 'https://blog.example.com/', kind: AppSwitcherKind.Site, team: 'marketing' },
];

const wrappers: VueWrapper[] = [];
const track = <T extends VueWrapper>(wrapper: T): T => {
  wrappers.push(wrapper);
  return wrapper;
};

beforeEach(() => {
  // happy-dom lays nothing out, so FocusScope would treat the tiles as hidden and focus nothing.
  vi.spyOn(HTMLElement.prototype, 'checkVisibility').mockReturnValue(true);
});

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

/** Answers every media query with `matches`, so the menu takes its phone or wide surface. */
function viewport(matches: boolean): void {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches,
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

/**
 * Settles the Portal teleport and mount focus, then lets the clock advance: Vue's event invoker skips
 * an event stamped in the millisecond its listener was attached.
 */
async function settle(): Promise<void> {
  for (let tick = 0; tick < 4; tick += 1) await nextTick();
  const mountedAt = Date.now();
  while (Date.now() === mountedAt) await Promise.resolve();
}

function menu(props: Record<string, unknown> = {}): VueWrapper {
  return track(
    mount(AppSwitcherMenu, {
      props: { items: Items, current: 'desk', subtitle: 'Northwind', ...props },
      attachTo: document.body,
    }),
  );
}

function trigger(): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>('button[aria-haspopup=dialog]')!;
}

function dialog(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role=dialog]');
}

/** Waits out the panel's exit: `Presence` unmounts two frames after a close that starts no animation. */
async function closed(): Promise<void> {
  await vi.waitFor(() => expect(dialog()).toBeNull());
}

async function open(): Promise<HTMLElement> {
  trigger().focus();
  trigger().click();
  await settle();
  return dialog()!;
}

function link(text: string): HTMLAnchorElement {
  const found = [...document.querySelectorAll<HTMLAnchorElement>('[role=dialog] a')].find((node) =>
    node.textContent?.includes(text),
  );
  if (!found) throw new Error(`No link labelled ${text}`);
  return found;
}

describe('AppSwitcherMenu trigger', () => {
  it('names the current app, its organisation and the popup it opens', async () => {
    viewport(true);
    menu();
    await settle();
    const button = trigger();
    expect(button.getAttribute('aria-label')).toBe('Desk — switch app');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.dataset.state).toBe('closed');
    expect(button.textContent).toContain('Desk');
    expect(button.querySelector('[data-app-switcher-subtitle]')?.textContent).toBe('Northwind');
    expect(button.querySelector('[data-app-switcher-subtitle]')?.className).toContain('max-md:hidden');
    expect(button.querySelector('[data-app-switcher-mark]')?.getAttribute('aria-hidden')).toBe('true');
    expect(button.querySelector('[data-app-switcher-chevron]')?.getAttribute('class')).toContain(
      'group-data-[state=open]/app-switcher:rotate-180',
    );
  });

  it('takes a brand mark, an explicit name and caller attributes', async () => {
    viewport(true);
    track(
      mount(AppSwitcherMenu, {
        props: { items: Items, current: 'desk', label: 'Front desk', class: 'ms-2', 'data-testid': 'switcher' },
        slots: {
          mark: ({ current }: { current: AppSwitcherItem | undefined }) =>
            h('b', (current as Destination | undefined)?.team),
        },
        attachTo: document.body,
      }),
    );
    await settle();
    const button = trigger();
    expect(button.getAttribute('aria-label')).toBe('Front desk — switch app');
    expect(button.querySelector('[data-app-switcher-mark] b')?.textContent).toBe('ops');
    expect(button.classList).toContain('ms-2');
    expect(button.dataset.testid).toBe('switcher');
  });
});

describe('AppSwitcherMenu from md up', () => {
  it('opens a labelled popover of app tiles and new-tab sites', async () => {
    viewport(true);
    const wrapper = menu();
    const panel = await open();
    expect(panel.getAttribute('aria-modal')).toBeNull();
    expect(document.getElementById(panel.getAttribute('aria-labelledby')!)?.textContent?.trim()).toBe('Apps');
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().dataset.state).toBe('open');
    expect(wrapper.emitted('update:open')).toEqual([[true]]);

    const tiles = panel.querySelector('ul')!;
    expect(tiles.getAttribute('role')).toBe('list');
    expect(tiles.className).toContain('sm:grid-cols-2');
    const current = tiles.querySelector<HTMLButtonElement>('button[aria-current="true"]')!;
    expect(current.textContent).toContain('Desk');
    expect(current.textContent).toContain('Events and orders');
    expect(document.activeElement).toBe(current);
    expect(link('Catalogue').getAttribute('href')).toBe('https://catalogue.example.com/catalogues');
    expect(link('Catalogue').target).toBe('');
    expect(link('Catalogue').querySelector('[data-app-switcher-icon] svg')).not.toBeNull();
    expect(link('Studio').querySelector('[data-app-switcher-icon]')?.textContent?.trim()).toBe('S');

    expect(panel.querySelector('[data-app-switcher-divider]')).not.toBeNull();
    const blog = link('Blog');
    expect(blog.target).toBe('_blank');
    expect(blog.rel).toBe('noopener noreferrer');
    expect(blog.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(blog.querySelector('.sr-only')?.textContent).toBe(' (opens in a new tab)');
    const sites = blog.closest('ul')!;
    expect(document.getElementById(sites.getAttribute('aria-labelledby')!)?.textContent?.trim()).toBe('Sites');
  });

  it('reports the caller item for a picked app and closes, leaving navigation to the listener', async () => {
    viewport(true);
    const picked: Array<{ item: Destination; prevented: boolean }> = [];
    const wrapper = menu({
      onSelect: (item: Destination, event: MouseEvent) => {
        event.preventDefault();
        picked.push({ item, prevented: event.defaultPrevented });
      },
    });
    await open();
    link('Studio').click();
    await settle();
    expect(picked).toEqual([{ item: Items[2], prevented: true }]);
    expect(toRaw(picked[0]!.item)).toBe(Items[2]);
    expect(wrapper.emitted('update:open')).toEqual([[true], [false]]);
    await closed();
  });

  it('closes from the current app without a selection and returns focus on Escape', async () => {
    viewport(true);
    const wrapper = menu();
    const panel = await open();
    panel.querySelector<HTMLButtonElement>('button[aria-current="true"]')!.click();
    await settle();
    expect(wrapper.emitted('select')).toBeUndefined();
    await closed();

    await open();
    document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await closed();
    expect(document.activeElement).toBe(trigger());
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('marks a current site and leaves the tiles as links', async () => {
    viewport(true);
    menu({ current: 'blog' });
    const panel = await open();
    const current = panel.querySelector<HTMLButtonElement>('button[aria-current="true"]')!;
    expect(current.textContent?.trim()).toBe('Blog');
    expect(link('Desk').getAttribute('href')).toBe('https://desk.example.com/');
    expect(trigger().getAttribute('aria-label')).toBe('Blog — switch app');
  });

  it('follows v-model:open', async () => {
    viewport(true);
    const wrapper = menu({ open: true });
    await settle();
    expect(dialog()).not.toBeNull();
    await wrapper.setProps({ open: false });
    await closed();
  });
});

describe('AppSwitcherMenu below md', () => {
  it('opens a full-screen dialog with a title and a close button', async () => {
    viewport(false);
    const wrapper = menu();
    const panel = await open();
    expect(panel.getAttribute('aria-modal')).toBe('true');
    expect(panel.dataset.phoneLayout).toBe('fullscreen');
    expect(document.getElementById(panel.getAttribute('aria-labelledby')!)?.textContent?.trim()).toBe('Apps');
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(panel.querySelector('button[aria-current="true"]')?.textContent).toContain('Desk');
    expect(link('Blog').target).toBe('_blank');

    const close = panel.querySelector<HTMLButtonElement>('button[aria-label="Close"]')!;
    expect(close.className).toContain('h-11');
    expect(document.activeElement).toBe(close);
    close.click();
    await settle();
    expect(wrapper.emitted('update:open')).toEqual([[true], [false]]);
    await closed();
    expect(document.activeElement).toBe(trigger());
  });

  it('closes on Escape and after a pick', async () => {
    viewport(false);
    const wrapper = menu({ onSelect: (_item: Destination, event: MouseEvent) => event.preventDefault() });
    await open();
    document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await closed();
    expect(document.activeElement).toBe(trigger());

    await open();
    link('Catalogue').click();
    await settle();
    expect(toRaw(wrapper.emitted('select')?.[0]?.[0])).toBe(Items[1]);
    await closed();
  });
});

describe('AppSwitcherMenu destinations', () => {
  it('drops hrefs that are not plain HTTPS URLs and keeps the current entry', async () => {
    viewport(true);
    const items: AppSwitcherItem[] = [
      { key: 'here', label: 'Here', href: 'not a url', kind: 'app' },
      { key: 'plain', label: 'Plain', href: 'http://plain.example.com/', kind: 'app' },
      { key: 'creds', label: 'Creds', href: 'https://user:pass@creds.example.com/', kind: 'app' },
      { key: 'query', label: 'Query', href: 'https://query.example.com/?token=1', kind: 'app' },
      { key: 'hash', label: 'Hash', href: 'https://hash.example.com/#token', kind: 'app' },
      { key: 'script', label: 'Script', href: 'javascript:alert(1)', kind: 'site' },
      { key: 'relative', label: 'Relative', href: '/relative', kind: 'site' },
      { key: 'kept', label: 'Kept', href: 'https://kept.example.com/a/b', kind: 'site' },
    ];
    menu({ items, current: 'here' });
    const panel = await open();
    expect(panel.querySelector('button[aria-current="true"]')?.textContent).toContain('Here');
    expect([...panel.querySelectorAll('a')].map((node) => node.getAttribute('href'))).toEqual([
      'https://kept.example.com/a/b',
    ]);
    expect(panel.querySelector('[data-app-switcher-divider]')).not.toBeNull();
  });

  it('leaves out the sites group and its divider when there are no sites', async () => {
    viewport(true);
    menu({ items: Items.filter((item) => item.kind === AppSwitcherKind.App) });
    const panel = await open();
    expect(panel.querySelector('[data-app-switcher-divider]')).toBeNull();
    expect(panel.querySelector('h3')).toBeNull();
  });

  it('normalizes a safe href to origin and path', () => {
    expect(AppSwitcherMenuExtensions.toSafeHref('https://Desk.Example.com/x?')).toBe('https://desk.example.com/x');
    expect(AppSwitcherMenuExtensions.toSafeHref('https://desk.example.com')).toBe('https://desk.example.com/');
    expect(AppSwitcherMenuExtensions.toSafeHref('ftp://desk.example.com/')).toBeNull();
  });
});

describe('AppSwitcherMenu labels', () => {
  const Uzbek = {
    'AppSwitcherMenu.title': 'Ilovalar',
    'AppSwitcherMenu.sitesLabel': 'Saytlar',
    'AppSwitcherMenu.closeLabel': 'Yopish',
    'AppSwitcherMenu.newTabLabel': '(yangi oynada ochiladi)',
    'AppSwitcherMenu.triggerLabel': '{app} — ilovani almashtirish',
  };

  function localized(messages: Record<string, string>, props: Record<string, unknown> = {}): VueWrapper {
    return track(
      mount(
        defineComponent({
          render: () =>
            h(LocaleProvider, { messages }, () => h(AppSwitcherMenu, { items: Items, current: 'desk', ...props })),
        }),
        { attachTo: document.body },
      ),
    );
  }

  it('resolves every string through the locale provider', async () => {
    viewport(false);
    localized(Uzbek);
    await settle();
    expect(trigger().getAttribute('aria-label')).toBe('Desk — ilovani almashtirish');
    const panel = await open();
    expect(document.getElementById(panel.getAttribute('aria-labelledby')!)?.textContent?.trim()).toBe('Ilovalar');
    expect(panel.querySelector('button[aria-label="Yopish"]')).not.toBeNull();
    expect(panel.querySelector('h3')?.textContent?.trim()).toBe('Saytlar');
    expect(link('Blog').querySelector('.sr-only')?.textContent).toBe(' (yangi oynada ochiladi)');
  });

  it('lets props win over the locale', async () => {
    viewport(true);
    localized(Uzbek, {
      title: 'Приложения',
      sitesLabel: 'Сайты',
      newTabLabel: '(в новой вкладке)',
      triggerLabel: 'Сменить приложение: {app}',
    });
    await settle();
    expect(trigger().getAttribute('aria-label')).toBe('Сменить приложение: Desk');
    const panel = await open();
    expect(panel.querySelector('h2')?.textContent?.trim()).toBe('Приложения');
    expect(panel.querySelector('h3')?.textContent?.trim()).toBe('Сайты');
    expect(link('Blog').querySelector('.sr-only')?.textContent).toBe(' (в новой вкладке)');
  });
});
