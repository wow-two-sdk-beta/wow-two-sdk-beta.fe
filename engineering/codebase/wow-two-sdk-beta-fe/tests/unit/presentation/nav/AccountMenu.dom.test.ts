import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import { LocaleProvider } from '@src/foundation/i18n';
import { ColorModeProvider } from '@src/foundation/primitives';
import {
  AccountMenu,
  MenuItem,
  type AccountMenuLocale,
  type AccountMenuOrganization,
  type AccountMenuVersion,
} from '@src/presentation/nav';

const Locales: readonly AccountMenuLocale[] = [
  { value: 'uz', label: 'O‘zbekcha' },
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
];

const Organizations: readonly AccountMenuOrganization[] = [
  { id: 'northwind', label: 'Northwind', description: 'Owner' },
  { id: 'contoso', label: 'Contoso', description: 'Editor' },
  { id: 'fabrikam', label: 'Fabrikam' },
];

const Versions: readonly AccountMenuVersion[] = [
  { label: 'Catalogue', version: '0.1.3' },
  { label: 'API', version: '0.1.4', commit: 'abc1234def5678' },
];

const wrappers: VueWrapper[] = [];
const track = <T extends VueWrapper>(wrapper: T): T => {
  wrappers.push(wrapper);
  return wrapper;
};

beforeEach(() => {
  // happy-dom lays nothing out, so FocusScope would treat every row as hidden and focus nothing.
  vi.spyOn(HTMLElement.prototype, 'checkVisibility').mockReturnValue(true);
});

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
  document.documentElement.classList.remove('dark');
  document.documentElement.style.removeProperty('color-scheme');
  vi.restoreAllMocks();
});

/**
 * Settles the Portal teleport and mount focus, then lets the clock advance: Vue's event invoker skips
 * an event stamped in the millisecond its listener was attached.
 */
async function settle(): Promise<void> {
  for (let tick = 0; tick < 4; tick += 1) await nextTick();
  const mountedAt = Date.now();
  while (Date.now() === mountedAt) await Promise.resolve();
}

/** Mounts the menu inside a colour-mode provider that persists nothing. */
function menu(props: Record<string, unknown> = {}, slots: Record<string, () => unknown> = {}): VueWrapper {
  return track(
    mount(
      defineComponent({
        render: () => h(ColorModeProvider, { storageKey: null }, () => h(AccountMenu, props, slots)),
      }),
      { attachTo: document.body },
    ),
  );
}

/** The account menu's own wrapper, for its emits. */
function account(wrapper: VueWrapper): VueWrapper {
  return wrapper.findComponent(AccountMenu) as VueWrapper;
}

function trigger(): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>('button[aria-haspopup=menu]')!;
}

function surface(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role=menu]');
}

function key(target: Element, name: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

async function open(): Promise<HTMLElement> {
  trigger().focus();
  trigger().click();
  await settle();
  return surface()!;
}

/** Waits out the panel's exit: `Presence` unmounts after a close that starts no animation. */
async function closed(): Promise<void> {
  await vi.waitFor(() => expect(surface()).toBeNull());
}

function rows(): HTMLButtonElement[] {
  return [...document.querySelectorAll<HTMLButtonElement>('[role=menu] [role^=menuitem]')];
}

function row(text: string): HTMLButtonElement {
  const found = rows().find((node) => node.textContent?.includes(text));
  if (!found) throw new Error(`No menu row labelled ${text}`);
  return found;
}

/** The labelled group whose heading reads `label`. */
function group(label: string): HTMLElement | null {
  const groups = [...document.querySelectorAll<HTMLElement>('[role=menu] [role=group]')];
  return (
    groups.find(
      (node) => document.getElementById(node.getAttribute('aria-labelledby') ?? '')?.textContent?.trim() === label,
    ) ?? null
  );
}

describe('AccountMenu trigger', () => {
  it('names the signed-in person and shows their initials as a decorative avatar', async () => {
    menu({ name: 'Jane Doe' });
    await settle();
    const button = trigger();
    expect(button.getAttribute('aria-label')).toBe('Account menu for Jane Doe');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.dataset.state).toBe('closed');
    const avatar = button.querySelector<HTMLElement>('[data-account-menu-avatar]')!;
    expect(avatar.textContent?.trim()).toBe('JD');
    expect(avatar.getAttribute('aria-hidden')).toBe('true');
    expect(button.querySelector('[data-account-menu-chevron]')?.getAttribute('class')).toContain(
      'group-data-[state=open]/account-menu:rotate-180',
    );
  });

  it('falls back to a person glyph and a plain name when nobody is named', async () => {
    menu({ name: '  ' });
    await settle();
    const avatar = trigger().querySelector<HTMLElement>('[data-account-menu-avatar]')!;
    expect(trigger().getAttribute('aria-label')).toBe('Account menu');
    expect(avatar.getAttribute('aria-hidden')).toBe('true');
    expect(avatar.querySelector('svg')).not.toBeNull();
  });

  it('lands caller attributes and classes on the trigger', async () => {
    menu({ name: 'Jane Doe', class: 'ms-2', 'data-testid': 'account' });
    await settle();
    expect(trigger().classList).toContain('ms-2');
    expect(trigger().dataset.testid).toBe('account');
  });

  it('refuses to open while disabled or busy, and closes an open menu that turns busy', async () => {
    const isBusy = ref(false);
    const isDisabled = ref(true);
    track(
      mount(
        defineComponent({
          render: () =>
            h(AccountMenu, {
              name: 'Jane Doe',
              isBusy: isBusy.value,
              isDisabled: isDisabled.value,
              versions: Versions,
            }),
        }),
        { attachTo: document.body },
      ),
    );
    await settle();
    expect(trigger().disabled).toBe(true);
    expect(trigger().getAttribute('aria-busy')).toBeNull();
    trigger().click();
    await settle();
    expect(surface()).toBeNull();

    isDisabled.value = false;
    await settle();
    await open();
    expect(surface()).not.toBeNull();

    isBusy.value = true;
    await settle();
    await closed();
    expect(trigger().disabled).toBe(true);
    expect(trigger().getAttribute('aria-busy')).toBe('true');
    expect(trigger().dataset.busy).toBe('');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });
});

describe('AccountMenu keyboard', () => {
  it('opens on ArrowDown at the first row, on ArrowUp at sign out, and returns focus on Escape', async () => {
    menu({ name: 'Jane Doe', onSignOut: () => undefined });
    await settle();
    trigger().focus();
    key(trigger(), 'ArrowDown');
    await settle();
    expect(surface()).not.toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(row('System'));

    key(document.activeElement!, 'ArrowDown');
    expect(document.activeElement).toBe(row('Light'));

    key(document.activeElement!, 'Escape');
    await closed();
    expect(document.activeElement).toBe(trigger());

    key(trigger(), 'ArrowUp');
    await settle();
    await vi.waitFor(() => expect(document.activeElement).toBe(row('Sign out')));
    key(document.activeElement!, 'Escape');
    await closed();
    expect(document.activeElement).toBe(trigger());
  });

  it('opens on Enter and closes on Tab', async () => {
    menu({ name: 'Jane Doe' });
    await settle();
    trigger().focus();
    key(trigger(), 'Enter');
    await settle();
    expect(surface()).not.toBeNull();
    key(document.activeElement!, 'Tab');
    await closed();
  });

  it('follows v-model:open', async () => {
    const wrapper = track(
      mount(AccountMenu, { props: { name: 'Jane Doe', versions: Versions, open: true }, attachTo: document.body }),
    );
    await settle();
    expect(surface()).not.toBeNull();
    await wrapper.setProps({ open: false });
    await closed();
    trigger().click();
    await settle();
    expect(wrapper.emitted('update:open')).toEqual([[true]]);
    expect(surface()).toBeNull();
  });
});

describe('AccountMenu identity', () => {
  it('heads the menu with the name and the second line, and describes the menu by them', async () => {
    menu({ name: 'Jane Doe', description: 'jane@example.com' });
    const panel = await open();
    expect(panel.getAttribute('aria-label')).toBe('Account');
    const identity = panel.querySelector<HTMLElement>('[data-account-menu-identity]')!;
    expect(panel.getAttribute('aria-describedby')).toBe(identity.id);
    expect([...identity.querySelectorAll('p')].map((node) => node.textContent?.trim())).toEqual([
      'Jane Doe',
      'jane@example.com',
    ]);
  });

  it('names a sole organization in the header instead of a one-row switcher', async () => {
    menu({ name: 'Jane Doe', organizations: [Organizations[0]], organization: 'northwind' });
    const panel = await open();
    expect(panel.querySelector('[data-account-menu-organization]')?.textContent?.trim()).toBe('Northwind · Owner');
    expect(group('Organization')).toBeNull();
  });

  it('leaves the header and its description out without a name', async () => {
    menu({});
    const panel = await open();
    expect(panel.querySelector('[data-account-menu-identity]')).toBeNull();
    expect(panel.getAttribute('aria-describedby')).toBeNull();
  });
});

describe('AccountMenu appearance', () => {
  it('marks the ambient mode and switches between dark, light and the system setting', async () => {
    menu({ name: 'Jane Doe' });
    let panel = await open();
    const appearance = group('Appearance')!;
    expect(appearance).not.toBeNull();
    expect([...appearance.querySelectorAll('[role=menuitemradio]')].map((node) => node.textContent?.trim())).toEqual([
      'System',
      'Light',
      'Dark',
    ]);
    expect(row('System').getAttribute('aria-checked')).toBe('true');

    row('Dark').click();
    await closed();
    expect(document.documentElement.classList).toContain('dark');

    panel = await open();
    expect(panel).not.toBeNull();
    expect(row('Dark').getAttribute('aria-checked')).toBe('true');
    expect(row('System').getAttribute('aria-checked')).toBe('false');
    row('Light').click();
    await closed();
    expect(document.documentElement.classList).not.toContain('dark');

    await open();
    expect(row('Light').getAttribute('aria-checked')).toBe('true');
    row('System').click();
    await closed();
    await open();
    expect(row('System').getAttribute('aria-checked')).toBe('true');
  });

  it('hides with showAppearance off, and without a colour-mode provider', async () => {
    menu({ name: 'Jane Doe', showAppearance: false, versions: Versions });
    await open();
    expect(group('Appearance')).toBeNull();
    for (const wrapper of wrappers.splice(0)) wrapper.unmount();
    document.body.innerHTML = '';

    track(mount(AccountMenu, { props: { name: 'Jane Doe', versions: Versions }, attachTo: document.body }));
    await settle();
    await open();
    expect(group('Appearance')).toBeNull();
    expect(group('Versions')).not.toBeNull();
  });
});

describe('AccountMenu language', () => {
  it('marks the current language, tags each row with it and emits another pick', async () => {
    const wrapper = menu({ name: 'Jane Doe', locales: Locales, locale: 'en' });
    await open();
    const languages = group('Language')!;
    expect([...languages.querySelectorAll('[role=menuitemradio]')].map((node) => node.getAttribute('lang'))).toEqual([
      'uz',
      'ru',
      'en',
    ]);
    expect(row('English').getAttribute('aria-checked')).toBe('true');
    row('Русский').click();
    await closed();
    expect(account(wrapper).emitted('update:locale')).toEqual([['ru']]);

    await open();
    row('English').click();
    await closed();
    expect(account(wrapper).emitted('update:locale')).toEqual([['ru']]);
  });

  it('hides without at least two languages', async () => {
    menu({ name: 'Jane Doe', locales: [Locales[0]], locale: 'uz' });
    await open();
    expect(group('Language')).toBeNull();
    expect(rows().some((node) => node.textContent?.includes('O‘zbekcha'))).toBe(false);
  });
});

describe('AccountMenu organizations', () => {
  it('switches organizations from a scrolling band and emits the picked id', async () => {
    const wrapper = menu({ name: 'Jane Doe', organizations: Organizations, organization: 'northwind' });
    const panel = await open();
    const organizations = group('Organization')!;
    const list = organizations.querySelector<HTMLElement>('[data-account-menu-organization-list]')!;
    expect(list.className).toContain('max-h-44');
    expect(list.className).toContain('overflow-y-auto');
    expect(list.querySelectorAll('[role=menuitemradio]')).toHaveLength(3);
    expect(row('Northwind').getAttribute('aria-checked')).toBe('true');
    expect(row('Contoso').textContent).toContain('Editor');
    expect(panel.querySelector('[data-account-menu-organization]')).toBeNull();

    row('Contoso').click();
    await closed();
    expect(account(wrapper).emitted('update:organization')).toEqual([['contoso']]);

    await open();
    row('Northwind').click();
    await closed();
    expect(account(wrapper).emitted('update:organization')).toEqual([['contoso']]);
  });

  it('keeps sign out reachable below a long membership list', async () => {
    const many = Array.from({ length: 15 }, (_, index) => ({ id: `org-${index}`, label: `Organization ${index}` }));
    menu({ name: 'Jane Doe', organizations: many, organization: 'org-0', onSignOut: () => undefined });
    const panel = await open();
    expect(panel.querySelectorAll('[data-account-menu-organization-list] [role=menuitemradio]')).toHaveLength(15);
    expect(rows().at(-1)?.textContent?.trim()).toBe('Sign out');
  });
});

describe('AccountMenu versions and sign out', () => {
  it('lists every service version read-only, with a shortened commit', async () => {
    menu({ name: 'Jane Doe', versions: Versions });
    await open();
    const versions = group('Versions')!;
    const lines = [...versions.querySelectorAll('[data-account-menu-version]')].map((node) =>
      [...node.children].map((part) => part.textContent?.trim()),
    );
    expect(lines).toEqual([
      ['Catalogue', '0.1.3'],
      ['API', '0.1.4 · abc1234'],
    ]);
    expect(versions.querySelector('[role^=menuitem]')).toBeNull();
  });

  it('places caller items before appearance and sign out last, and signs out once', async () => {
    const signOut = vi.fn();
    const settings = vi.fn();
    menu(
      {
        name: 'Jane Doe',
        organizations: Organizations,
        organization: 'northwind',
        locales: Locales,
        locale: 'uz',
        versions: Versions,
        onSignOut: signOut,
      },
      { items: () => h(MenuItem, { onSelect: settings }, () => 'Account settings') },
    );
    const panel = await open();
    const labels = rows().map((node) => node.textContent?.trim());
    expect(labels.indexOf('Account settings')).toBeGreaterThan(labels.indexOf('Fabrikam'));
    expect(labels.indexOf('Account settings')).toBeLessThan(labels.indexOf('System'));
    expect(labels.at(-1)).toBe('Sign out');

    expect(panel.querySelectorAll('[data-account-menu-sign-out]')).toHaveLength(1);
    const ordered = [...panel.querySelectorAll('[data-account-menu-versions], [data-account-menu-sign-out]')];
    expect(ordered.map((node) => node.hasAttribute('data-account-menu-sign-out'))).toEqual([false, true]);

    row('Account settings').click();
    await closed();
    expect(settings).toHaveBeenCalledTimes(1);

    await open();
    row('Sign out').click();
    await closed();
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('draws one separator between each pair of present sections and none at the edges', async () => {
    menu({ name: 'Jane Doe', versions: Versions, onSignOut: () => undefined });
    const panel = await open();
    const content = panel.querySelector<HTMLElement>('[data-account-menu-identity]')!.parentElement!;
    const kinds = [...content.children].map((node) =>
      node.getAttribute('role') === 'separator' ? 'separator' : 'section',
    );
    expect(kinds).toEqual(['section', 'separator', 'section', 'separator', 'section', 'separator', 'section']);
  });

  it('leaves sign out, versions, languages and organizations out when nothing asks for them', async () => {
    menu({ name: 'Jane Doe' });
    const panel = await open();
    expect(panel.querySelector('[data-account-menu-sign-out]')).toBeNull();
    expect(group('Versions')).toBeNull();
    expect(group('Language')).toBeNull();
    expect(group('Organization')).toBeNull();
    expect(panel.querySelectorAll('[role=separator]')).toHaveLength(1);
  });
});

describe('AccountMenu labels', () => {
  const Uzbek = {
    'AccountMenu.menuLabel': 'Hisob',
    'AccountMenu.triggerLabel': '{name} hisobi menyusi',
    'AccountMenu.anonymousTriggerLabel': 'Hisob menyusi',
    'AccountMenu.appearanceLabel': 'Ko‘rinish',
    'AccountMenu.systemModeLabel': 'Tizim',
    'AccountMenu.lightModeLabel': 'Yorug‘',
    'AccountMenu.darkModeLabel': 'Qorong‘i',
    'AccountMenu.languageLabel': 'Til',
    'AccountMenu.organizationLabel': 'Tashkilot',
    'AccountMenu.versionsLabel': 'Versiyalar',
    'AccountMenu.signOutLabel': 'Chiqish',
  };

  function localized(props: Record<string, unknown>): VueWrapper {
    return track(
      mount(
        defineComponent({
          render: () =>
            h(LocaleProvider, { messages: Uzbek }, () =>
              h(ColorModeProvider, { storageKey: null }, () =>
                h(AccountMenu, {
                  organizations: Organizations,
                  organization: 'northwind',
                  locales: Locales,
                  locale: 'uz',
                  versions: Versions,
                  onSignOut: () => undefined,
                  ...props,
                }),
              ),
            ),
        }),
        { attachTo: document.body },
      ),
    );
  }

  it('resolves every string through the locale provider', async () => {
    localized({ name: 'Jane Doe' });
    await settle();
    expect(trigger().getAttribute('aria-label')).toBe('Jane Doe hisobi menyusi');
    const panel = await open();
    expect(panel.getAttribute('aria-label')).toBe('Hisob');
    for (const label of ['Ko‘rinish', 'Til', 'Tashkilot', 'Versiyalar']) expect(group(label)).not.toBeNull();
    for (const label of ['Tizim', 'Yorug‘', 'Qorong‘i', 'Chiqish']) expect(row(label)).toBeDefined();
  });

  it('localizes the anonymous trigger name', async () => {
    localized({});
    await settle();
    expect(trigger().getAttribute('aria-label')).toBe('Hisob menyusi');
  });

  it('lets props win over the locale', async () => {
    localized({
      name: 'Jane Doe',
      menuLabel: 'Профиль',
      triggerLabel: 'Меню {name}',
      appearanceLabel: 'Тема',
      signOutLabel: 'Выйти',
    });
    await settle();
    expect(trigger().getAttribute('aria-label')).toBe('Меню Jane Doe');
    const panel = await open();
    expect(panel.getAttribute('aria-label')).toBe('Профиль');
    expect(group('Тема')).not.toBeNull();
    expect(row('Выйти')).toBeDefined();
  });
});
