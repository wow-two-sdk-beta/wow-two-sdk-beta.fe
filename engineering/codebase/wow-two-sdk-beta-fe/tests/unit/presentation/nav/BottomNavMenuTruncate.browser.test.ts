import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h } from 'vue';
import { page } from 'vitest/browser';
import { BottomNavMenu, BottomNavMenuItem } from '@src/presentation/nav';
import '@src/index.css';

/* A phone bar at a width narrow enough that an unbroken label genuinely overflows its column — the shape of
 * Ocharo's `PhoneNav.vue`, which renders every destination through `asChild` with a `RouterLink`. */
beforeAll(async () => {
  await page.viewport(360, 844);
});

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

function mountPhoneNav(): HTMLElement {
  wrapper = mount(BottomNavMenu, {
    attachTo: 'body',
    slots: {
      default: () => [
        h(
          BottomNavMenuItem,
          { href: '/a', asChild: true },
          { icon: () => h('svg', { width: 20, height: 20 }), default: () => h('a', { href: '/a' }, 'Home') },
        ),
        h(
          BottomNavMenuItem,
          { href: '/b', asChild: true },
          { icon: () => h('svg', { width: 20, height: 20 }), default: () => h('a', { href: '/b' }, 'Dashboard') },
        ),
        h(
          BottomNavMenuItem,
          { href: '/telegram', asChild: true },
          {
            icon: () => h('svg', { width: 20, height: 20 }),
            default: () => h('a', { href: '/telegram' }, 'Telegram delivery'),
          },
        ),
        h(
          BottomNavMenuItem,
          { href: '/c', asChild: true },
          { icon: () => h('svg', { width: 20, height: 20 }), default: () => h('a', { href: '/c' }, 'Settings') },
        ),
        h(
          BottomNavMenuItem,
          { href: '/d', asChild: true },
          { icon: () => h('svg', { width: 20, height: 20 }), default: () => h('a', { href: '/d' }, 'More') },
        ),
      ],
    },
  });
  return wrapper.element as HTMLElement;
}

describe('BottomNavMenuItem keeps a long asChild label on one line', () => {
  it('never grows an asChild RouterLink item taller than its sibling, unbroken, single-line labels', async () => {
    const root = mountPhoneNav();
    const anchors = [...root.querySelectorAll<HTMLAnchorElement>('li a')];
    expect(anchors).toHaveLength(5);
    const telegram = anchors.find((a) => a.textContent === 'Telegram delivery')!;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const style = getComputedStyle(telegram);
    ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const unbrokenWidth = ctx.measureText(telegram.textContent ?? '').width;
    const available = telegram.getBoundingClientRect().width - 16; // px-2 on both sides
    // The label genuinely does not fit unbroken — this proves the test exercises overflow, not a false pass.
    expect(unbrokenWidth).toBeGreaterThan(available);

    const heights = new Set(anchors.map((a) => Math.round(a.getBoundingClientRect().height)));
    // Every item — including the one whose label overflows — keeps the bar's single-row height: no wrap.
    expect(heights.size).toBe(1);

    expect(style.whiteSpace).toBe('nowrap');
    expect(style.overflow).toBe('hidden');

    // Nothing bleeds past the item's own column into the next tab.
    const telegramRect = telegram.getBoundingClientRect();
    const settings = anchors.find((a) => a.textContent === 'Settings')!.getBoundingClientRect();
    expect(telegramRect.right).toBeLessThanOrEqual(settings.left + 1);
  });

  it('keeps the non-asChild branch truncated the same way', async () => {
    wrapper = mount(BottomNavMenu, {
      attachTo: 'body',
      slots: {
        default: () => [
          h(BottomNavMenuItem, { href: '/a' }, { default: () => 'Home' }),
          h(BottomNavMenuItem, { href: '/telegram' }, { default: () => 'Telegram delivery' }),
          h(BottomNavMenuItem, { href: '/b' }, { default: () => 'Dashboard' }),
          h(BottomNavMenuItem, { href: '/c' }, { default: () => 'Settings' }),
          h(BottomNavMenuItem, { href: '/d' }, { default: () => 'More' }),
        ],
      },
    });
    const anchors = [...(wrapper.element as HTMLElement).querySelectorAll<HTMLAnchorElement>('li a')];
    const heights = new Set(anchors.map((a) => Math.round(a.getBoundingClientRect().height)));
    expect(heights.size).toBe(1);
  });
});
