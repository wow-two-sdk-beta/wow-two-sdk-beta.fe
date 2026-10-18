import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h } from 'vue';
import { page, userEvent } from 'vitest/browser';
import { AppSwitcherKind, AppSwitcherMenu, type AppSwitcherItem } from '@src/presentation/nav';
import '@src/index.css';

const Phone = { width: 375, height: 812 } as const;
const Desktop = { width: 1280, height: 800 } as const;

const Items: readonly AppSwitcherItem[] = [
  { key: 'desk', label: 'Desk', description: 'Events and orders', href: 'https://desk.example.com/', kind: 'app' },
  { key: 'catalogue', label: 'Catalogue', description: 'Products', href: 'https://c.example.com/', kind: 'app' },
  {
    key: 'studio',
    label: 'Studio',
    description: 'Garments',
    href: 'https://s.example.com/',
    kind: AppSwitcherKind.App,
  },
  { key: 'blog', label: 'Blog', href: 'https://blog.example.com/', kind: AppSwitcherKind.Site },
];

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
  return document.querySelector<HTMLButtonElement>('button[aria-haspopup=dialog]')!;
}

function panel(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role=dialog]');
}

function tile(text: string): HTMLElement {
  const found = [...document.querySelectorAll<HTMLElement>('[role=dialog] li > :is(a, button)')].find((node) =>
    node.textContent?.includes(text),
  );
  if (!found) throw new Error(`No tile labelled ${text}`);
  return found;
}

async function render(size: { width: number; height: number }): Promise<void> {
  await page.viewport(size.width, size.height);
  wrapper = mount(
    {
      render: () =>
        h(
          'div',
          { style: 'padding: 16px' },
          h(AppSwitcherMenu, { items: Items, current: 'desk', subtitle: 'Northwind' }),
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
      if (panel() === null) {
        trigger().focus();
        await userEvent.keyboard('{Enter}');
      }
      return panel() !== null;
    })
    .toBe(true);
  await expect.poll(() => panel()!.closest('[data-state]')?.getAttribute('data-state')).toBe('open');
  for (const animation of document.getAnimations()) animation.finish();
  return panel()!;
}

describe('AppSwitcherMenu on a desktop', () => {
  it('drops a two-column popover under the trigger and returns focus to it on Escape', async () => {
    await render(Desktop);
    const subtitle = trigger().querySelector<HTMLElement>('[data-app-switcher-subtitle]')!;
    expect(getComputedStyle(subtitle).display).not.toBe('none');

    const element = await openWithKeyboard();
    expect(element.getAttribute('aria-modal')).toBeNull();
    await expect.poll(() => document.activeElement).toBe(tile('Desk'));

    const triggerBox = trigger().getBoundingClientRect();
    await expect
      .poll(() => Math.round(element.getBoundingClientRect().top))
      .toBeGreaterThanOrEqual(Math.round(triggerBox.bottom));
    expect(Math.round(element.getBoundingClientRect().left)).toBe(Math.round(triggerBox.left));

    const desk = tile('Desk').getBoundingClientRect();
    const catalogue = tile('Catalogue').getBoundingClientRect();
    expect(Math.round(catalogue.top)).toBe(Math.round(desk.top));
    expect(catalogue.left).toBeGreaterThan(desk.right - 1);

    const chevron = trigger().querySelector('[data-app-switcher-chevron]')!;
    await expect.poll(() => getComputedStyle(chevron).rotate).toBe('180deg');

    await userEvent.keyboard('{Escape}');
    await expect.poll(() => panel()).toBeNull();
    expect(document.activeElement).toBe(trigger());
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('closes when the viewport narrows past the breakpoint', async () => {
    await render(Desktop);
    await openWithKeyboard();
    await page.viewport(Phone.width, Phone.height);
    await expect.poll(() => panel()).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });
});

describe('AppSwitcherMenu on a phone', () => {
  it('fills the screen with one column of tiles, and closes back to the trigger', async () => {
    await render(Phone);
    const subtitle = trigger().querySelector<HTMLElement>('[data-app-switcher-subtitle]')!;
    expect(getComputedStyle(subtitle).display).toBe('none');

    const element = await openWithKeyboard();
    expect(element.getAttribute('aria-modal')).toBe('true');
    const box = element.getBoundingClientRect();
    expect([Math.round(box.left), Math.round(box.top), Math.round(box.right), Math.round(box.bottom)]).toEqual([
      0,
      0,
      Phone.width,
      Phone.height,
    ]);

    const desk = tile('Desk').getBoundingClientRect();
    const catalogue = tile('Catalogue').getBoundingClientRect();
    expect(catalogue.top).toBeGreaterThanOrEqual(desk.bottom);
    expect(Math.round(catalogue.left)).toBe(Math.round(desk.left));

    const close = element.querySelector<HTMLButtonElement>('button[aria-label="Close"]')!;
    const closeBox = close.getBoundingClientRect();
    expect(Math.round(closeBox.width)).toBeGreaterThanOrEqual(44);
    expect(closeBox.right).toBeLessThanOrEqual(Phone.width);

    await userEvent.keyboard('{Escape}');
    await expect.poll(() => panel()).toBeNull();
    expect(document.activeElement).toBe(trigger());

    await openWithKeyboard();
    panel()!.querySelector<HTMLButtonElement>('button[aria-label="Close"]')!.click();
    await expect.poll(() => panel()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });
});
