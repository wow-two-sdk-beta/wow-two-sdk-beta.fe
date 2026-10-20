import { afterEach, describe, expect, it } from 'vitest';
import '@src/index.css';

// Firefox draws the standard properties; Chromium and WebKit draw the `::-webkit-scrollbar*` pseudo-elements.
const hasWebkitScrollbar = CSS.supports('selector(::-webkit-scrollbar)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
// Forced colours replace every fill with a system colour by design; the geometry still applies.
const isForcedColors = matchMedia('(forced-colors: active)').matches;

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
});

function scroller(className = '', style = ''): HTMLElement {
  const host = document.createElement('div');
  host.className = `dark ${className}`.trim();
  host.style.cssText = `width: 120px; height: 80px; overflow: auto; ${style}`;
  const content = document.createElement('div');
  content.style.cssText = 'width: 400px; height: 400px;';
  host.append(content);
  document.body.append(host);
  hosts.push(host);
  return host;
}

const bar = (el: HTMLElement, pseudo: string): CSSStyleDeclaration => getComputedStyle(el, pseudo);

/** Every style rule in the page, however deeply it sits inside `@layer`, `@media` or `@supports` blocks. */
function styleRules(rules: readonly CSSRule[]): CSSStyleRule[] {
  return rules.flatMap((rule) => {
    const nested = 'cssRules' in rule ? styleRules(Array.from((rule as CSSGroupingRule).cssRules)) : [];
    return rule instanceof CSSStyleRule ? [rule, ...nested] : nested;
  });
}

/** The hover state is not reachable through `getComputedStyle`, so it is read from the rule that declares it. */
function hoverFill(): string {
  const rules = Array.from(document.styleSheets).flatMap((sheet) => styleRules(Array.from(sheet.cssRules)));
  return (
    rules.find((rule) => rule.selectorText.includes('::-webkit-scrollbar-thumb:hover'))?.style.backgroundColor ?? ''
  );
}

describe.skipIf(!finePointer)('themed scrollbar', () => {
  describe.skipIf(!hasWebkitScrollbar)('::-webkit-scrollbar', () => {
    it('draws a slim bar with a fully rounded, inset thumb', () => {
      const el = scroller();
      expect(bar(el, '::-webkit-scrollbar').width).toBe('10px');
      expect(bar(el, '::-webkit-scrollbar').height).toBe('10px');
      const thumb = bar(el, '::-webkit-scrollbar-thumb');
      expect(parseFloat(thumb.borderTopLeftRadius)).toBeGreaterThanOrEqual(5);
      expect(thumb.borderTopWidth).toBe('2px');
      expect(thumb.backgroundClip).toBe('padding-box');
    });

    it.skipIf(isForcedColors)('takes the thumb colour from the theme tokens and follows dark mode', () => {
      const el = scroller();
      const probe = document.createElement('i');
      el.append(probe);
      const resolve = (token: string): string => {
        probe.style.color = `var(${token})`;
        return getComputedStyle(probe).color;
      };
      const dark = bar(el, '::-webkit-scrollbar-thumb').backgroundColor;
      expect(dark).toBe(resolve('--color-border-strong'));
      el.classList.remove('dark');
      expect(bar(el, '::-webkit-scrollbar-thumb').backgroundColor).toBe(resolve('--color-border-strong'));
      expect(bar(el, '::-webkit-scrollbar-thumb').backgroundColor).not.toBe(dark);
    });

    it('darkens the thumb on hover from the muted-foreground token', () => {
      expect(hoverFill()).toContain('--scrollbar-thumb-hover');
      expect(hoverFill()).toContain('--color-muted-foreground');
    });

    it('is tuned through custom properties', () => {
      const el = scroller('', '--scrollbar-size: 14px; --scrollbar-inset: 3px; --scrollbar-thumb: rgb(1, 2, 3);');
      expect(bar(el, '::-webkit-scrollbar').width).toBe('14px');
      expect(bar(el, '::-webkit-scrollbar-thumb').borderTopWidth).toBe('3px');
      if (!isForcedColors) expect(bar(el, '::-webkit-scrollbar-thumb').backgroundColor).toBe('rgb(1, 2, 3)');
    });

    it('leaves a .scrollbar-native element on the platform scrollbar', () => {
      const el = scroller('scrollbar-native');
      expect(bar(el, '::-webkit-scrollbar').width).not.toBe('10px');
    });

    it('yields to an application rule of any specificity', () => {
      const style = document.createElement('style');
      style.textContent = '.app-bar::-webkit-scrollbar { width: 3px; }';
      document.head.append(style);
      try {
        expect(bar(scroller('app-bar'), '::-webkit-scrollbar').width).toBe('3px');
      } finally {
        style.remove();
      }
    });
  });

  describe.skipIf(hasWebkitScrollbar)('standard properties', () => {
    it('draws a thin bar in the theme colours', () => {
      const el = scroller();
      expect(getComputedStyle(el).scrollbarWidth).toBe('thin');
      expect(getComputedStyle(el).scrollbarColor).not.toBe('auto');
    });

    it('leaves a .scrollbar-native element on the platform scrollbar', () => {
      const el = scroller('scrollbar-native');
      expect(getComputedStyle(el).scrollbarWidth).toBe('auto');
      expect(getComputedStyle(el).scrollbarColor).toBe('auto');
    });
  });
});
