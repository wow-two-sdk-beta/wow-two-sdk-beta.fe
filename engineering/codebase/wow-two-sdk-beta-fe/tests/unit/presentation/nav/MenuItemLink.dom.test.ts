import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type VNode } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { LocaleProvider } from '@src/foundation/i18n';
import { Menu, MenuItem } from '@src/presentation/nav/menu';
import { AppLink } from '@src/router';

const wrappers: VueWrapper[] = [];

/** Every anchor click that reached the document — prevented there, so happy-dom never navigates the test page. */
let followed: string[] = [];

function stopNavigation(event: MouseEvent): void {
  const anchor = (event.target as Element | null)?.closest('a');
  if (!anchor) return;
  followed.push(anchor.getAttribute('href') ?? '');
  event.preventDefault();
}

beforeEach(() => {
  // happy-dom lays nothing out, so FocusScope would treat every row as hidden and focus nothing.
  vi.spyOn(HTMLElement.prototype, 'checkVisibility').mockReturnValue(true);
  followed = [];
  document.addEventListener('click', stopNavigation);
});

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.removeEventListener('click', stopNavigation);
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

/** Settles Portal, Presence and FocusScope, then waits for the clock so Vue's invoker accepts the next event. */
async function settle(): Promise<void> {
  for (let tick = 0; tick < 4; tick += 1) await nextTick();
  const mountedAt = Date.now();
  while (Date.now() === mountedAt) await Promise.resolve();
}

/** Mounts an open menu around `rows`; `events` records every `update:open`. */
function mountMenu(rows: () => VNode[], messages?: Record<string, string>): { events: boolean[] } {
  const anchor = document.createElement('button');
  document.body.append(anchor);
  const open = ref(true);
  const events: boolean[] = [];
  const menu = (): VNode =>
    h(
      Menu,
      {
        open: open.value,
        anchor,
        'onUpdate:open': (next: boolean) => {
          events.push(next);
          open.value = next;
        },
      },
      rows,
    );
  wrappers.push(
    mount(
      defineComponent({
        setup: () => () => (messages ? h(LocaleProvider, { messages }, menu) : menu()),
      }),
      { attachTo: document.body },
    ),
  );
  return { events };
}

function row(text: string): HTMLElement {
  const found = [...document.querySelectorAll<HTMLElement>('[role=menuitem]')].find((node) =>
    node.textContent?.trim().startsWith(text),
  );
  if (!found) throw new Error(`No menu row labelled ${text}`);
  return found;
}

function key(target: HTMLElement, name: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

describe('a MenuItem with an href', () => {
  it('renders an anchor menu row with the link attributes', async () => {
    mountMenu(() => [
      h(MenuItem, { href: '/settings' }, () => 'Settings'),
      h(MenuItem, { href: 'https://desk.example.com/account' }, () => 'Account'),
      h(MenuItem, { href: '/help', target: '_blank' }, () => 'Help'),
      h(MenuItem, { href: 'https://example.com', rel: 'me' }, () => 'Profile'),
      h(MenuItem, { href: 'https://example.com', rel: '' }, () => 'Plain'),
    ]);
    await settle();

    const settings = row('Settings');
    expect(settings.tagName).toBe('A');
    expect(settings.getAttribute('role')).toBe('menuitem');
    expect(settings.getAttribute('href')).toBe('/settings');
    expect(settings.hasAttribute('type')).toBe(false);
    expect(settings.hasAttribute('rel')).toBe(false);
    expect(settings.hasAttribute('target')).toBe(false);

    expect(row('Account').getAttribute('rel')).toBe('noopener noreferrer');
    expect(row('Profile').getAttribute('rel')).toBe('me');
    expect(row('Plain').hasAttribute('rel')).toBe(false);

    const help = row('Help');
    expect(help.getAttribute('target')).toBe('_blank');
    expect(help.getAttribute('rel')).toBe('noopener noreferrer');
    const label = help.querySelector('.sr-only');
    expect(label?.textContent).toBe(' (opens in a new tab)');
    expect(settings.querySelector('.sr-only')).toBeNull();
  });

  it('follows the link once on Enter and on Space, emits select and closes the menu', async () => {
    for (const name of ['Enter', ' ']) {
      followed = [];
      const selected: string[] = [];
      const { events } = mountMenu(() => [
        h(MenuItem, { href: '/settings', onSelect: () => selected.push('Settings') }, () => 'Settings'),
      ]);
      await settle();
      const link = row('Settings');
      const event = key(link, name);
      expect(event.defaultPrevented).toBe(true);
      expect(followed).toEqual(['/settings']);
      expect(selected).toEqual(['Settings']);
      expect(events).toEqual([false]);
      for (const wrapper of wrappers.splice(0)) wrapper.unmount();
      document.body.innerHTML = '';
    }
  });

  it('closes on a click a router prevented, and stays open when asked to', async () => {
    const { events } = mountMenu(() => [
      h(MenuItem, { href: '/a', onClick: (event: MouseEvent) => event.preventDefault() }, () => 'Routed'),
      h(MenuItem, { href: '/b', canCloseOnSelect: false }, () => 'Kept'),
    ]);
    await settle();
    row('Kept').click();
    expect(events).toEqual([]);
    expect(followed).toEqual(['/b']);
    row('Routed').click();
    expect(events).toEqual([false]);
  });

  it('joins the arrow walk with the button rows', async () => {
    mountMenu(() => [
      h(MenuItem, null, () => 'New'),
      h(MenuItem, { href: '/settings' }, () => 'Settings'),
      h(MenuItem, { href: '/off', isDisabled: true }, () => 'Off'),
      h(MenuItem, null, () => 'Delete'),
    ]);
    await settle();
    row('New').focus();
    key(row('New'), 'ArrowDown');
    expect(document.activeElement).toBe(row('Settings'));
    key(row('Settings'), 'ArrowDown');
    expect(document.activeElement).toBe(row('Delete'));
  });

  it('keeps a disabled link inert', async () => {
    const selected: string[] = [];
    const { events } = mountMenu(() => [
      h(MenuItem, { href: '/off', isDisabled: true, onSelect: () => selected.push('Off') }, () => 'Off'),
    ]);
    await settle();
    const link = row('Off');
    expect(link.tagName).toBe('A');
    expect(link.hasAttribute('href')).toBe(false);
    expect(link.getAttribute('aria-disabled')).toBe('true');
    key(link, 'Enter');
    link.click();
    expect(selected).toEqual([]);
    expect(events).toEqual([]);
  });

  it('renders the button row for a scheme it cannot navigate to', async () => {
    mountMenu(() => [h(MenuItem, { href: 'javascript:alert(1)' }, () => 'Unsafe')]);
    await settle();
    const unsafe = row('Unsafe');
    expect(unsafe.tagName).toBe('BUTTON');
    expect(unsafe.hasAttribute('href')).toBe(false);
  });

  it('reads the new-tab label from the locale, and omits it when empty', async () => {
    mountMenu(
      () => [
        h(MenuItem, { href: '/help', target: '_blank' }, () => 'Help'),
        h(MenuItem, { href: '/docs', target: '_blank', newTabLabel: '' }, () => 'Docs'),
      ],
      { 'MenuItem.newTabLabel': '(yangi oynada ochiladi)' },
    );
    await settle();
    expect(row('Help').querySelector('.sr-only')?.textContent).toBe(' (yangi oynada ochiladi)');
    expect(row('Docs').querySelector('.sr-only')).toBeNull();
  });
});

describe('a MenuItem as a child link', () => {
  it('makes the caller element the row and closes after a router-style click', async () => {
    const navigated: string[] = [];
    const { events } = mountMenu(() => [
      h(MenuItem, { asChild: true }, () =>
        h(
          'a',
          {
            href: '/projects',
            onClick: (event: MouseEvent) => {
              event.preventDefault();
              navigated.push('/projects');
            },
          },
          'Projects',
        ),
      ),
    ]);
    await settle();
    const link = row('Projects');
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('/projects');
    expect(link.getAttribute('role')).toBe('menuitem');
    key(link, 'Enter');
    expect(navigated).toEqual(['/projects']);
    expect(events).toEqual([false]);
  });
  it('navigates through the router with AppLink as the child, then closes', async () => {
    const Blank = { template: '<div />' };
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: Blank },
        { path: '/settings', component: Blank },
      ],
    });
    await router.push('/');
    await router.isReady();
    const anchor = document.createElement('button');
    document.body.append(anchor);
    const open = ref(true);
    const events: boolean[] = [];
    wrappers.push(
      mount(
        defineComponent({
          setup: () => () =>
            h(
              Menu,
              {
                open: open.value,
                anchor,
                'onUpdate:open': (next: boolean) => {
                  events.push(next);
                  open.value = next;
                },
              },
              () => [h(MenuItem, { asChild: true }, () => h(AppLink, { to: '/settings' }, () => 'Settings'))],
            ),
        }),
        { attachTo: document.body, global: { plugins: [router] } },
      ),
    );
    await settle();
    const link = row('Settings');
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('/settings');
    expect(link.getAttribute('role')).toBe('menuitem');
    key(link, 'Enter');
    await expect.poll(() => router.currentRoute.value.path).toBe('/settings');
    expect(events).toEqual([false]);
    expect(followed).toEqual(['/settings']);
  });
});
