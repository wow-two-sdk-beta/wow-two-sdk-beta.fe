import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h } from 'vue';
import { cdp, page, server } from 'vitest/browser';
/* Brings the Playwright provider's typing of `cdp()` (its `send`) into the test's type graph. */
import type {} from '@vitest/browser-playwright';
import { surfaceVariants } from '@src/foundation/styles';
import { getTheme, themeToCss } from '@src/foundation/themes';
import { AppShell, AppShellHeader, AppShellMain, AppShellSidebar } from '@src/presentation/layout';
import '@src/index.css';

// Forced colours replace fills with system colours and drop shadows by design, so there is nothing to compare.
// Nothing here takes focus: test files share the browser's focus, and a menu's focus trap would take it from them.
const isForcedColors = matchMedia('(forced-colors: active)').matches;

const ocharo = getTheme('ocharo')!;
let style: HTMLStyleElement;
let root: HTMLElement;
let wrapper: VueWrapper | null = null;

beforeEach(() => {
  style = document.createElement('style');
  style.textContent = themeToCss(ocharo);
  document.head.append(style);
  root = document.createElement('main');
  document.body.append(root);
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  root.remove();
  style.remove();
  document.body.innerHTML = '';
});

/** An element under the root with `className`, so it inherits whatever theme and mode the root carries. */
function surface(className: string): HTMLElement {
  const node = document.createElement('div');
  node.className = className;
  root.append(node);
  return node;
}

/** The computed value `property` takes for `declaration` in this engine, so comparisons ignore serialization. */
function reference(property: string, declaration: string): string {
  const node = document.createElement('div');
  node.setAttribute('style', declaration);
  root.append(node);
  const value = getComputedStyle(node).getPropertyValue(property);
  node.remove();
  return value;
}

const read = (node: HTMLElement, property: string): string => getComputedStyle(node).getPropertyValue(property);

/** The backdrop filter, read from the standard property or WebKit's prefixed one. */
const backdrop = (node: HTMLElement): string => read(node, 'backdrop-filter') || read(node, '-webkit-backdrop-filter');

/** A Tailwind `shadow-*` value as the browser computes it: the four empty ring and inset layers, then the shadow. */
const tailwindShadow = (value: string): string =>
  reference('box-shadow', `box-shadow: 0 0 #0000, 0 0 #0000, 0 0 #0000, 0 0 #0000, ${value}`);

const referenceBackdrop = (value: string): string =>
  reference('backdrop-filter', `backdrop-filter: ${value}`) ||
  reference('-webkit-backdrop-filter', `-webkit-backdrop-filter: ${value}`);

describe.skipIf(isForcedColors)('glass strength without a theme that sets it', () => {
  it('keeps the SDK glass: the chrome at 75% card, 12px blur, no shadow', () => {
    const chrome = surface('surface-glass border border-glass-edge shadow-(--glass-shadow)');
    expect(read(chrome, 'background-color')).toBe(
      reference('background-color', 'background-color: color-mix(in oklab, var(--color-card) 75%, transparent)'),
    );
    expect(backdrop(chrome)).toBe(referenceBackdrop('blur(12px) saturate(100%)'));
    expect(read(chrome, 'border-top-color')).toBe(reference('color', 'color: var(--color-border)'));
    expect(read(chrome, 'box-shadow')).toBe(tailwindShadow('0 0 #0000'));
  });

  it('keeps the glass surface variant at the 70% popover with a 12px blur and a medium shadow', () => {
    const panel = surface(surfaceVariants({ variant: 'glass' }));
    expect(read(panel, 'background-color')).toBe(
      reference('background-color', 'background-color: color-mix(in oklab, var(--color-popover) 70%, transparent)'),
    );
    expect(backdrop(panel)).toBe(referenceBackdrop('blur(12px) saturate(100%)'));
    expect(read(panel, 'box-shadow')).not.toBe('none');
  });

  it('falls the side and menu strengths back to the SDK glass, the menu with a large shadow', () => {
    const side = surface('surface-glass-side');
    const menu = surface(surfaceVariants({ variant: 'glass-menu' }));
    expect(read(side, 'background-color')).toBe(
      reference('background-color', 'background-color: color-mix(in oklab, var(--color-card) 75%, transparent)'),
    );
    expect(read(menu, 'background-color')).toBe(
      reference('background-color', 'background-color: color-mix(in oklab, var(--color-popover) 70%, transparent)'),
    );
    expect(read(menu, 'box-shadow')).toBe(
      tailwindShadow('0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'),
    );
  });
});

describe.skipIf(isForcedColors)('the ocharo glass strength', () => {
  const modes = [
    ['light', ocharo.glass!.light],
    ['dark', ocharo.glass!.dark],
  ] as const;

  it.each(modes)('paints the approved %s chrome, sidebar and menu materials', (mode, glass) => {
    root.className = mode === 'dark' ? 'theme-ocharo dark' : 'theme-ocharo';
    const chrome = surface('surface-glass border border-glass-edge shadow-(--glass-shadow)');
    const side = surface('surface-glass-side');
    const menu = surface(surfaceVariants({ variant: 'glass-menu' }));
    const card = surface(surfaceVariants({ variant: 'glass' }));

    expect(read(chrome, 'background-color')).toBe(reference('background-color', `background-color: ${glass.fill}`));
    expect(read(card, 'background-color')).toBe(reference('background-color', `background-color: ${glass.fill}`));
    expect(read(side, 'background-color')).toBe(reference('background-color', `background-color: ${glass.sideFill}`));
    expect(read(menu, 'background-color')).toBe(reference('background-color', `background-color: ${glass.menuFill}`));

    const filter = referenceBackdrop(`blur(${glass.blur}) saturate(${glass.saturate})`);
    for (const node of [chrome, side, menu, card]) expect(backdrop(node)).toBe(filter);

    expect(read(chrome, 'border-top-color')).toBe(reference('color', `color: ${glass.edge}`));
    expect(read(menu, 'border-top-color')).toBe(reference('color', `color: ${glass.edge}`));
    expect(read(chrome, 'box-shadow')).toBe(tailwindShadow(`${glass.shadow}, inset 0 1px 0 ${glass.highlight}`));
    expect(read(menu, 'box-shadow')).toBe(tailwindShadow(`${glass.menuShadow}, inset 0 1px 0 ${glass.highlight}`));
  });

  it('reaches the frame components that opt in', async () => {
    /* Wide enough that the sidebar is the rail, not the drawer. */
    await page.viewport(1280, 800);
    root.className = 'theme-ocharo';
    wrapper = mount(
      () =>
        h(AppShell, null, () => [
          h(AppShellHeader, { variant: 'glass' }, () => 'Bar'),
          h(AppShellSidebar, { variant: 'glass' }, () => 'Nav'),
          h(AppShellMain, null, () => 'Page'),
        ]),
      { attachTo: root },
    );
    try {
      await expect.poll(() => root.querySelector('aside')).not.toBeNull();
      const header = root.querySelector<HTMLElement>('header')!;
      const sidebar = root.querySelector<HTMLElement>('aside')!;
      expect(read(header, 'background-color')).toBe(
        reference('background-color', 'background-color: rgb(255 255 255 / 0.84)'),
      );
      expect(read(header, 'border-bottom-color')).toBe(reference('color', 'color: rgb(24 27 37 / 0.08)'));
      expect(read(header, 'box-shadow')).toBe(
        tailwindShadow('0 10px 30px rgb(24 27 37 / 0.06), inset 0 1px 0 rgb(255 255 255 / 0.9)'),
      );
      expect(read(sidebar, 'background-color')).toBe(
        reference('background-color', 'background-color: rgb(255 255 255 / 0.6)'),
      );
      expect(read(sidebar, 'border-right-color')).toBe(reference('color', 'color: rgb(24 27 37 / 0.08)'));
    } finally {
      await page.viewport(414, 896);
    }
  });
});

describe.skipIf(isForcedColors || server.browser !== 'chromium')('glass under reduced transparency', () => {
  beforeEach(async () => {
    await cdp().send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }],
    });
  });

  afterEach(async () => {
    await cdp().send('Emulation.setEmulatedMedia', { features: [] });
  });

  it('returns every material to its solid fill without a blur', () => {
    root.className = 'theme-ocharo';
    const chrome = surface('surface-glass');
    const side = surface('surface-glass-side');
    const menu = surface('surface-glass-menu');
    expect(matchMedia('(prefers-reduced-transparency: reduce)').matches).toBe(true);
    for (const node of [chrome, side]) {
      expect(read(node, 'background-color')).toBe(reference('background-color', 'background-color: var(--color-card)'));
      expect(backdrop(node)).toBe('none');
    }
    expect(read(menu, 'background-color')).toBe(
      reference('background-color', 'background-color: var(--color-popover)'),
    );
    expect(backdrop(menu)).toBe('none');
  });
});
