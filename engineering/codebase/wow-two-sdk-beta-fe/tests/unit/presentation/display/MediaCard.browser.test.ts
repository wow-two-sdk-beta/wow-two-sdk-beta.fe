import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import { userEvent } from 'vitest/browser';
import { MediaCard, MetaInlineItem, MetaInlineText } from '@src/presentation/display';
import { displayExamples } from '../../../../apps/playground/src/gallery/fixtures/DisplayExamples';
import '@src/index.css';

// Forced colours replace fills and text with system colours by design, so there is nothing to compare.
const isForcedColors = matchMedia('(forced-colors: active)').matches;

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

/** A 1×1 image, so the media has a real element to zoom without a network read. */
const Pixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';

/** A linked card with an image, a `topEnd` button and a title, the way a post card holds them. */
function card(props: Record<string, unknown> = {}) {
  return h(
    MediaCard,
    { href: '/posts/7', ...props },
    {
      media: () => h('img', { src: Pixel, alt: '', 'data-image': '' }),
      topEnd: () => h('button', { type: 'button', 'data-open': '', class: 'size-8' }, '↗'),
      default: () => h('span', 'Autumn light'),
    },
  );
}

function mountIn(node: () => ReturnType<typeof h>, width = 900): HTMLElement {
  wrapper = mount(
    { render: () => h('div', { style: { width: `${width}px` } }, [node()]) },
    { attachTo: document.body },
  );
  return wrapper.element as HTMLElement;
}

/** The element a real pointer meets at an element's centre — the hit test a click goes through. */
function hitAt(element: Element): Element | null {
  const rect = element.getBoundingClientRect();
  return document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
}

describe('MediaCard hit testing', () => {
  it('follows the link from a click on the media, but not from a click on a topEnd button', async () => {
    const root = mountIn(() => h('div', { style: { width: '280px' } }, [card()]));
    await nextTick();
    const link = root.querySelector<HTMLAnchorElement>('a[data-card-link]')!;
    const button = root.querySelector<HTMLButtonElement>('[data-open]')!;
    const followed = vi.fn<(href: string | null) => void>();
    link.addEventListener('click', (event) => {
      event.preventDefault();
      followed(link.getAttribute('href'));
    });
    const opened = vi.fn();
    button.addEventListener('click', opened);

    const onMedia = hitAt(root.querySelector('[data-image]')!);
    expect(onMedia).toBe(link);
    (onMedia as HTMLElement).click();
    expect(followed).toHaveBeenCalledWith('/posts/7');

    followed.mockClear();
    const onButton = hitAt(button);
    expect(onButton).toBe(button);
    (onButton as HTMLElement).click();
    expect(opened).toHaveBeenCalledOnce();
    expect(followed).not.toHaveBeenCalled();
  });
});

describe('MediaCard ratio', () => {
  it.each([1, 2, 4])('holds 4 / 5 in %i column(s)', async (columns) => {
    const root = mountIn(
      () =>
        h(
          'div',
          { style: { display: 'grid', gap: '12px', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } },
          Array.from({ length: columns }, () => card()),
        ),
      900,
    );
    await nextTick();
    const cards = [...root.querySelectorAll<HTMLElement>('[data-media-card-panel]')].map(
      (panel) => panel.parentElement!,
    );
    expect(cards.length).toBe(columns);
    for (const element of cards) {
      const { width, height } = element.getBoundingClientRect();
      expect(width).toBeCloseTo((900 - 12 * (columns - 1)) / columns, 0);
      expect(width / height).toBeCloseTo(4 / 5, 2);
    }
  });

  it('keeps a wide ratio as the column narrows', async () => {
    const root = mountIn(() => card({ ratio: 12 / 5, panelHeight: '4rem' }), 600);
    await nextTick();
    const { width, height } = root.firstElementChild!.getBoundingClientRect();
    expect(width / height).toBeCloseTo(12 / 5, 2);
  });
});

describe.skipIf(isForcedColors)('MediaCard appearance', () => {
  it('draws the fixture in light and dark with white text on a fading blur', async () => {
    const fixture = displayExamples.find((example) => example.name === 'MediaCard')!;
    for (const mode of ['', 'dark']) {
      const root = mountIn(() =>
        h('div', { class: mode, style: { width: '280px' } }, [
          h(fixture.component, fixture.props, {
            default: () =>
              h(MetaInlineText, null, () =>
                h(MetaInlineItem, { tone: 'success', label: 'ongoing' }, () => '21–23 Nov'),
              ),
          }),
        ]),
      );
      await nextTick();
      const panel = root.querySelector<HTMLElement>('[data-media-card-panel]')!;
      expect(getComputedStyle(panel).color).toBe('rgb(255, 255, 255)');
      const blur = root.querySelector<HTMLElement>('.backdrop-blur-xl')!;
      const style = getComputedStyle(blur);
      expect(style.backdropFilter || style.getPropertyValue('-webkit-backdrop-filter')).toContain('blur');
      expect(style.maskImage || style.getPropertyValue('-webkit-mask-image')).toContain('linear-gradient');
      expect(blur.getBoundingClientRect().height / panel.parentElement!.getBoundingClientRect().height).toBeCloseTo(
        0.6,
        2,
      );
      /* The panel is a dark stage whatever the page: the success tone takes its dark (light green) value. */
      const tone = root.querySelector<HTMLElement>('[data-tone="success"]')!;
      expect(getComputedStyle(tone).color).toBe('rgb(220, 252, 231)');
      wrapper!.unmount();
      wrapper = null;
    }
  });

  it('zooms the image while the card is hovered', async () => {
    const root = mountIn(() => h('div', { style: { width: '280px' } }, [card()]));
    await nextTick();
    const image = root.querySelector<HTMLElement>('[data-image]')!;
    /* Tailwind's `scale-*` sets the `scale` property, not `transform`. */
    expect(getComputedStyle(image).scale).toMatch(/^(none|1)$/u);
    expect(getComputedStyle(image).transitionProperty).toContain('scale');
    await userEvent.hover(root.querySelector('a[data-card-link]')!);
    await expect.poll(() => getComputedStyle(image).scale, { timeout: 2000 }).toBe('1.05');
  });
});
