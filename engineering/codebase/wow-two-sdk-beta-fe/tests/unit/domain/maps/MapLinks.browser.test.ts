import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import { userEvent } from 'vitest/browser';
import { MediaCard } from '@src/presentation/display';
import { MapLinks } from '@src/domain/maps';
import { nativeTab } from '../../../BrowserKeyboard';
import '@src/index.css';

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

/** A card that opens its subject, with the map links in its text panel the way a location line holds them. */
function mountCard(): HTMLElement {
  wrapper = mount(
    {
      render: () =>
        h('div', { style: { width: '280px' } }, [
          h(
            MediaCard,
            { href: '/events/7' },
            {
              default: () => [
                h('span', 'Navruz festival'),
                h('span', { class: 'flex items-center gap-1' }, [
                  'Chorsu bazaar',
                  h(MapLinks, { query: 'Chorsu bazaar' }),
                ]),
              ],
            },
          ),
        ]),
    },
    { attachTo: document.body },
  );
  return wrapper.element as HTMLElement;
}

/** The element a real pointer meets at an element's centre — the hit test a click goes through. */
function hitAt(element: Element): Element | null {
  const rect = element.getBoundingClientRect();
  return document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
}

describe('MapLinks inside a linked MediaCard', () => {
  it('meets the pointer above the card link, and never lets a click reach the card', async () => {
    const root = mountCard();
    await nextTick();
    const cardLink = root.querySelector<HTMLAnchorElement>('a[data-card-link]')!;
    const maps = [...root.querySelectorAll<HTMLAnchorElement>('a[data-map-provider]')];
    expect(maps).toHaveLength(2);

    const onCard = vi.fn();
    cardLink.addEventListener('click', onCard);
    root.addEventListener('click', onCard);
    for (const link of maps) {
      link.addEventListener('click', (event) => event.preventDefault());
      const hit = hitAt(link)!;
      expect(link.contains(hit)).toBe(true);
      hit.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }
    expect(onCard).not.toHaveBeenCalled();

    // Elsewhere in the card the stretched link still answers.
    const panel = root.querySelector('[data-media-card-panel]')!.getBoundingClientRect();
    expect(document.elementFromPoint(panel.left + 4, panel.top + 4)).toBe(cardLink);
  });

  it('keeps the two marks side by side, each at least 24 px square, Yandex first', async () => {
    const root = mountCard();
    await nextTick();
    const [yandex, google] = [...root.querySelectorAll<HTMLAnchorElement>('a[data-map-provider]')];
    expect(yandex!.dataset.mapProvider).toBe('yandex');
    const a = yandex!.getBoundingClientRect();
    const b = google!.getBoundingClientRect();
    expect(a.width).toBeGreaterThanOrEqual(24);
    expect(a.height).toBeGreaterThanOrEqual(24);
    expect(b.left).toBeGreaterThanOrEqual(a.right);
    expect(Math.abs(a.top - b.top)).toBeLessThan(1);
  });
});

/** The two marks of a link: the muted monochrome one at rest, and the brand-colored one on hover and focus. */
function marks(link: Element): { readonly rest: SVGElement; readonly color: SVGElement } {
  return {
    rest: link.querySelector<SVGElement>('svg[data-variant="mono"]')!,
    color: link.querySelector<SVGElement>('svg[data-variant="color"]')!,
  };
}

describe('MapLinks look', () => {
  it('shows the muted text-colored mark at rest and the brand color on hover', async () => {
    const root = mountCard();
    await nextTick();
    const link = root.querySelector<HTMLAnchorElement>('a[data-map-provider="google"]')!;
    const { rest, color } = marks(link);
    await userEvent.unhover(link);
    expect(getComputedStyle(rest).opacity).toBe('0.6');
    expect(getComputedStyle(color).opacity).toBe('0');
    // The muted mark follows the text color of its surroundings, not a fixed gray.
    expect(getComputedStyle(rest).color).toBe(getComputedStyle(link.parentElement!).color);

    await userEvent.hover(link);
    await vi.waitFor(() => {
      expect(getComputedStyle(color).opacity).toBe('1');
      expect(getComputedStyle(rest).opacity).toBe('0');
    });
  });

  it('shows the brand color and draws a 2px ring on keyboard focus only', async () => {
    const root = mountCard();
    await nextTick();
    const links = [...root.querySelectorAll<HTMLAnchorElement>('a[data-map-provider]')];
    // The pointer of an earlier test may still rest over a link; hover is a state of its own.
    await userEvent.unhover(links[1]!);
    expect(getComputedStyle(links[0]!).outlineWidth).not.toBe('2px');

    // The card link is the first tab stop, then the two map links.
    await nativeTab();
    await nativeTab();
    expect(document.activeElement).toBe(links[0]);
    const ring = getComputedStyle(links[0]!);
    expect(ring.outlineStyle).toBe('solid');
    expect(ring.outlineWidth).toBe('2px');
    await vi.waitFor(() => {
      expect(getComputedStyle(marks(links[0]!).color).opacity).toBe('1');
      expect(getComputedStyle(marks(links[0]!).rest).opacity).toBe('0');
    });
    expect(getComputedStyle(marks(links[1]!).color).opacity).toBe('0');
    expect(getComputedStyle(marks(links[1]!).rest).opacity).toBe('0.6');
  });
});
