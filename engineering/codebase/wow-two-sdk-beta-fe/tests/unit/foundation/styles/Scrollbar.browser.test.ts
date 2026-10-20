import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import '@src/index.css';

// Firefox draws the standard properties; Chromium and WebKit draw the `::-webkit-scrollbar*` pseudo-elements.
// Firefox also parses `::-webkit-scrollbar`, so the engine is told apart by a Firefox-only property.
const isFirefox = CSS.supports('-moz-appearance: none') || CSS.supports('-moz-orient: vertical');
const hasWebkitScrollbar = !isFirefox;
const canHover = matchMedia('(hover: hover)').matches;
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

const pageRules = (): CSSStyleRule[] =>
  Array.from(document.styleSheets).flatMap((sheet) => styleRules(Array.from(sheet.cssRules)));

/** The media conditions a rule sits under, outermost last — empty when it applies on every device. */
function mediaConditions(rule: CSSRule): string[] {
  const found: string[] = [];
  for (let parent = rule.parentRule; parent; parent = parent.parentRule) {
    if (parent instanceof CSSMediaRule) found.push(parent.media.mediaText);
  }
  return found;
}

/** The alpha channel of a computed colour, whichever syntax the engine serialises it in. */
function alphaOf(color: string): number {
  const slash = /\/\s*([\d.]+%?)\s*\)$/.exec(color);
  if (slash) return slash[1]!.endsWith('%') ? parseFloat(slash[1]!) / 100 : parseFloat(slash[1]!);
  const legacy = /^rgba\(([^)]+)\)$/.exec(color);
  return legacy ? parseFloat(legacy[1]!.split(',')[3] ?? '1') : 1;
}

/** The thumb colour of a Firefox `scrollbar-color` value — its first colour. */
const firefoxThumb = (el: HTMLElement): string =>
  /color\([^)]*\)|rgba?\([^)]*\)/.exec(getComputedStyle(el).scrollbarColor)?.[0] ?? '';

/** The hover state is not reachable through `getComputedStyle`, so it is read from the rule that declares it. */
function hoverFill(): string {
  const rule = pageRules().find((r) => r.selectorText.includes('::-webkit-scrollbar-thumb:hover'));
  return rule?.style.backgroundColor ?? '';
}

describe('themed scrollbar', () => {
  it('applies on every device: no scrollbar rule sits under a pointer or hover media condition', () => {
    const rules = pageRules().filter(
      (rule) =>
        rule.selectorText.includes('::-webkit-scrollbar') || rule.style.getPropertyValue('scrollbar-width') !== '',
    );
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      expect(mediaConditions(rule).join(' '), rule.selectorText).not.toMatch(/pointer|hover/);
    }
  });

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

    it.skipIf(isForcedColors)('keeps the thumb visible by default', () => {
      const el = scroller();
      expect(el.classList.contains('scrollbar-auto-hide')).toBe(false);
      expect(alphaOf(bar(el, '::-webkit-scrollbar-thumb').backgroundColor)).toBe(1);
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

  // The inline `transition: none` makes the computed colour settle at once, so the assertions do not race the fade.
  describe.skipIf(!hasWebkitScrollbar || isForcedColors)('auto-hide thumb, opt-in with .scrollbar-auto-hide', () => {
    const idle = (style = ''): HTMLElement => scroller('scrollbar-auto-hide', `transition: none; ${style}`);
    const thumbAlpha = (el: HTMLElement): number => alphaOf(bar(el, '::-webkit-scrollbar-thumb').backgroundColor);

    it('fades the thumb while idle', () => {
      const el = idle();
      expect(thumbAlpha(el)).toBe(0);
    });

    it('brings the thumb back while the element is marked as scrolling', () => {
      const el = idle();
      el.setAttribute('data-scrolling', '');
      expect(thumbAlpha(el)).toBe(1);
      el.removeAttribute('data-scrolling');
      expect(thumbAlpha(el)).toBe(0);
    });

    it.skipIf(!canHover)('brings the thumb back while the pointer is over the element', async () => {
      const el = idle('position: fixed; top: 0; left: 0;');
      expect(thumbAlpha(el)).toBe(0);
      await userEvent.hover(el);
      expect(thumbAlpha(el)).toBe(1);
      await userEvent.unhover(el);
      expect(thumbAlpha(el)).toBe(0);
    });

    it('registers the fade so the thumb animates, and drops the animation under reduced motion', () => {
      const rules = pageRules().filter((rule) => rule.selectorText.includes('scrollbar-auto-hide'));
      expect(rules.some((rule) => rule.style.getPropertyValue('transition').includes('--scrollbar-fade'))).toBe(true);
      const reduced = rules.filter((rule) => mediaConditions(rule).some((condition) => condition.includes('reduce')));
      expect(reduced.some((rule) => rule.style.getPropertyValue('transition') === 'none')).toBe(true);
    });

    it('does not hide a nested scroller that did not opt in', () => {
      const outer = idle();
      const inner = document.createElement('div');
      inner.style.cssText = 'width: 60px; height: 40px; overflow: auto;';
      const content = document.createElement('div');
      content.style.cssText = 'width: 200px; height: 200px;';
      inner.append(content);
      outer.append(inner);
      expect(thumbAlpha(outer)).toBe(0);
      expect(alphaOf(bar(inner, '::-webkit-scrollbar-thumb').backgroundColor)).toBe(1);
    });

    it('leaves a .scrollbar-native element on the platform scrollbar', () => {
      const el = scroller('scrollbar-auto-hide scrollbar-native', 'transition: none;');
      expect(bar(el, '::-webkit-scrollbar').width).not.toBe('10px');
      expect(getComputedStyle(el).getPropertyValue('--scrollbar-fade')).toBe('100%');
    });
  });

  describe.skipIf(hasWebkitScrollbar)('standard properties', () => {
    // The headless test browser reports `scrollbar-width: none` on every element, so the width is read from the
    // rule that declares it and the colour, which it leaves alone, from the computed style.
    it('draws a thin bar in the theme colours', () => {
      expect(pageRules().map((rule) => rule.style.getPropertyValue('scrollbar-width'))).toContain('thin');
      expect(getComputedStyle(scroller()).scrollbarColor).not.toBe('auto');
    });

    it('leaves a .scrollbar-native element on the platform scrollbar', () => {
      expect(getComputedStyle(scroller('scrollbar-native')).scrollbarColor).toBe('auto');
    });

    it('keeps the thumb visible by default', () => {
      expect(alphaOf(firefoxThumb(scroller()))).toBe(1);
    });

    describe('auto-hide thumb, opt-in with .scrollbar-auto-hide', () => {
      const idle = (): HTMLElement => scroller('scrollbar-auto-hide', 'transition: none;');

      it('fades the thumb while idle and brings it back while scrolling', () => {
        const el = idle();
        expect(alphaOf(firefoxThumb(el))).toBe(0);
        el.setAttribute('data-scrolling', '');
        expect(alphaOf(firefoxThumb(el))).toBe(1);
      });

      it('leaves a .scrollbar-native element alone', () => {
        expect(getComputedStyle(scroller('scrollbar-auto-hide scrollbar-native')).scrollbarColor).toBe('auto');
      });
    });
  });
});
