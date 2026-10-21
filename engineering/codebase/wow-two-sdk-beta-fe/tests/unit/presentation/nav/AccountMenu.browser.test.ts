import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h } from 'vue';
import { page, userEvent } from 'vitest/browser';
import { ColorModeProvider } from '@src/foundation/primitives';
import { AccountMenu, type AccountMenuOrganization } from '@src/presentation/nav';
import '@src/index.css';

const Phone = { width: 375, height: 667 } as const;
const Desktop = { width: 1280, height: 800 } as const;

/** Fifteen memberships — more than the organization band shows at once. */
const Organizations: readonly AccountMenuOrganization[] = Array.from({ length: 15 }, (_, index) => ({
  id: `org-${index}`,
  label: `Organization ${index + 1}`,
  description: index === 0 ? 'Owner' : 'Editor',
}));

let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

afterAll(async () => {
  await page.viewport(414, 896);
});

function trigger(): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>('button[aria-haspopup=menu]')!;
}

function surface(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role=menu]');
}

/** Renders the menu at the end of a top bar, as an app's frame places it. */
async function render(size: { width: number; height: number }): Promise<void> {
  await page.viewport(size.width, size.height);
  wrapper = mount(
    {
      render: () =>
        h(ColorModeProvider, { storageKey: null }, () =>
          h('header', { style: 'display: flex; justify-content: flex-end; padding: 8px 16px' }, [
            h(AccountMenu, {
              name: 'Jane Doe',
              description: 'jane.doe@example.com',
              organizations: Organizations,
              organization: 'org-0',
              locales: [
                { value: 'uz', label: 'O‘zbekcha' },
                { value: 'ru', label: 'Русский' },
                { value: 'en', label: 'English' },
              ],
              locale: 'en',
              versions: [
                { label: 'Catalogue', version: '0.1.3' },
                { label: 'API', version: '0.1.3', commit: '0123456789abcdef' },
              ],
              onSignOut: () => undefined,
            }),
          ]),
        ),
    },
    { attachTo: document.body },
  );
  await expect.poll(() => trigger()).not.toBeNull();
}

/**
 * Opens from the keyboard: WebKit never focuses a clicked button, so a click leaves nothing to return to. Firefox in CI
 * can drop the first key while another test frame holds focus, so press again until it opens.
 */
async function openWithKeyboard(): Promise<HTMLElement> {
  await expect
    .poll(async () => {
      if (surface() === null) {
        trigger().focus();
        await userEvent.keyboard('{Enter}');
      }
      return surface() !== null;
    })
    .toBe(true);
  await expect.poll(() => surface()!.getAttribute('data-state')).toBe('open');
  for (const animation of document.getAnimations()) animation.finish();
  return surface()!;
}

describe('AccountMenu on a phone', () => {
  it('fits the viewport, scrolls the memberships in their own band and keeps sign out last', async () => {
    await render(Phone);
    const element = await openWithKeyboard();

    await expect.poll(() => Math.round(element.getBoundingClientRect().top)).toBeGreaterThan(0);
    const box = element.getBoundingClientRect();
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(Phone.width);
    expect(box.bottom).toBeLessThanOrEqual(Phone.height);

    const band = element.querySelector<HTMLElement>('[data-account-menu-organization-list]')!;
    expect(band.clientHeight).toBeLessThanOrEqual(176);
    expect(band.scrollHeight).toBeGreaterThan(band.clientHeight);

    const rows = [...element.querySelectorAll<HTMLElement>('[role^=menuitem]')];
    expect(rows.at(-1)?.textContent?.trim()).toBe('Sign out');

    await userEvent.keyboard('{Escape}');
    await expect.poll(() => surface()).toBeNull();
    expect(document.activeElement).toBe(trigger());
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });
});

describe('AccountMenu panel width', () => {
  it.each([
    ['phone', Phone],
    ['desktop', Desktop],
  ] as const)('never scrolls sideways on a %s, and its separators still meet the surface edges', async (_, size) => {
    await render(size);
    const element = await openWithKeyboard();
    const panel = element.firstElementChild as HTMLElement;
    expect(getComputedStyle(panel).overflowY).toBe('auto');
    expect(panel.scrollWidth).toBeLessThanOrEqual(panel.clientWidth);

    const surfaceBox = element.getBoundingClientRect();
    const border = Number.parseFloat(getComputedStyle(element).borderLeftWidth);
    const separators = [...panel.querySelectorAll<HTMLElement>(':scope > [role=separator]')];
    expect(separators.length).toBeGreaterThan(0);
    for (const separator of separators) {
      const box = separator.getBoundingClientRect();
      expect(Math.round(box.left)).toBe(Math.round(surfaceBox.left + border));
      expect(Math.round(box.right)).toBeLessThanOrEqual(Math.round(surfaceBox.right - border));
    }
  });
});

describe('AccountMenu on a desktop', () => {
  it('drops under the trigger, aligned to its end edge', async () => {
    await render(Desktop);
    const element = await openWithKeyboard();
    const triggerBox = trigger().getBoundingClientRect();
    await expect
      .poll(() => Math.round(element.getBoundingClientRect().top))
      .toBeGreaterThanOrEqual(Math.round(triggerBox.bottom));
    expect(Math.round(element.getBoundingClientRect().right)).toBe(Math.round(triggerBox.right));

    const chevron = trigger().querySelector('[data-account-menu-chevron]')!;
    await expect.poll(() => getComputedStyle(chevron).rotate).toBe('180deg');

    await userEvent.keyboard('{Escape}');
    await expect.poll(() => surface()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });
});
