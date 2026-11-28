import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import { userEvent } from 'vitest/browser';
import { CardLink, MediaCard, MetaInlineItem, MetaInlineText } from '@src/presentation/display';
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

describe('MediaCard stretched link', () => {
  /** The points the link must win: the media's centre, and its top corners clear of the card's own controls. */
  function mediaPoints(root: HTMLElement): [number, number][] {
    const { left, top, width, height } = root.querySelector('[data-media-card-media]')!.getBoundingClientRect();
    return [
      [left + width / 2, top + height / 2],
      [left + 8, top + 8],
      [left + width / 2, top + 8],
    ];
  }

  it.each([
    ['an href link', () => card()],
    [
      'a slotted CardLink',
      () =>
        h(
          MediaCard,
          {},
          {
            media: () => h('img', { src: Pixel, alt: '' }),
            default: () => h(CardLink, { href: '/listings/3' }, () => 'Flat in Yunusabad'),
          },
        ),
    ],
  ])('reaches the whole card although the panel is positioned: %s', async (_name, node) => {
    const root = mountIn(() => h('div', { style: { width: '280px' } }, [node()]));
    await nextTick();
    const link = root.querySelector<HTMLAnchorElement>('a[data-card-link]')!;
    for (const [x, y] of mediaPoints(root)) expect(document.elementFromPoint(x, y)).toBe(link);
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
      expect(blur.parentElement).toBe(panel);
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

/** A glass pill row and a title that wraps to two lines at the 280px card width — the foot a post card carries. */
function pillsAndTitle() {
  return [
    h('div', { 'data-first-row': '', class: 'flex gap-1.5' }, [
      h('span', { class: 'rounded-full bg-white/20 px-2 py-0.5 text-xs' }, 'Event'),
      h('span', { class: 'rounded-full bg-white/20 px-2 py-0.5 text-xs' }, 'Tashkent'),
    ]),
    h(
      'span',
      { 'data-title': '', class: 'line-clamp-2 text-[15px] leading-snug font-semibold' },
      'Autumn light over the old city: an exhibition of fifty photographs from three decades',
    ),
  ];
}

function titleOnly() {
  return [
    h(
      'span',
      { 'data-first-row': '', 'data-title': '', class: 'text-[15px] leading-snug font-semibold' },
      'Autumn light',
    ),
  ];
}

/** The same lines, plus enough more to outgrow the default `8.5rem` panel. */
function overflowing() {
  return [
    ...pillsAndTitle(),
    ...Array.from({ length: 4 }, (_, index) =>
      h('span', { class: 'text-[13px] leading-snug' }, `Meta line ${index + 1}: opens at ten, closes at six`),
    ),
  ];
}

/* Chrome resolves the `2rem` stop to pixels in a computed style: 32px at the 16px root. */
const maskPattern =
  /^linear-gradient\(to top, (?:black|rgb\(0, 0, 0\)) calc\(100% - (?:2rem|32px)\), (?:transparent|rgba\(0, 0, 0, 0\))\)$/u;

describe.skipIf(isForcedColors)('MediaCard content blur', () => {
  /** Mounts a 280px card with the given foot and returns the pieces the blur is measured against. */
  async function mountFoot(foot: () => ReturnType<typeof h>[], props: Record<string, unknown> = {}) {
    const root = mountIn(() =>
      h('div', { style: { width: '280px' } }, [
        h(MediaCard, { ...props }, { media: () => h('img', { src: Pixel, alt: '' }), default: () => foot() }),
      ]),
    );
    await nextTick();
    const cardElement = root.firstElementChild as HTMLElement;
    const panel = cardElement.querySelector<HTMLElement>('[data-media-card-panel]')!;
    const blur = panel.querySelector<HTMLElement>(':scope > [aria-hidden="true"]')!;
    const firstRow = cardElement.querySelector<HTMLElement>('[data-first-row]')!;
    return { cardElement, panel, blur, firstRow };
  }

  /** The card's padding-box foot: the border takes 1px of its outer edge, and the blur is placed inside it. */
  function footOf(cardElement: HTMLElement): number {
    return cardElement.getBoundingClientRect().bottom - parseFloat(getComputedStyle(cardElement).borderBottomWidth);
  }

  const feather = 32;

  it.each([
    ['a pill row and a two-line title', pillsAndTitle],
    ['a title only', titleOnly],
  ])('starts its feather 2rem above the first row and reaches the card foot: %s', async (_name, foot) => {
    for (const props of [{ href: '/posts/7' }, {}]) {
      const { cardElement, panel, blur, firstRow } = await mountFoot(foot, props);
      const content = panel.getBoundingClientRect();
      const layer = blur.getBoundingClientRect();
      expect(Math.abs(layer.top - (content.top - feather))).toBeLessThanOrEqual(1);
      expect(Math.abs(layer.top - (firstRow.getBoundingClientRect().top - feather))).toBeLessThanOrEqual(1);
      expect(Math.abs(layer.bottom - footOf(cardElement))).toBeLessThanOrEqual(1);
      expect(layer.left).toBeCloseTo(content.left, 0);
      expect(layer.right).toBeCloseTo(content.right, 0);
      const style = getComputedStyle(blur);
      expect(style.maskImage).toMatch(maskPattern);
      expect(style.getPropertyValue('-webkit-mask-image')).toMatch(maskPattern);
      wrapper!.unmount();
      wrapper = null;
    }
  });

  it('follows the content: a taller foot carries the blur up with it', async () => {
    const short = await mountFoot(titleOnly);
    const shortTop = short.blur.getBoundingClientRect().top;
    const shortHeight = short.blur.getBoundingClientRect().height;
    wrapper!.unmount();
    wrapper = null;
    const tall = await mountFoot(pillsAndTitle);
    const tallTop = tall.blur.getBoundingClientRect().top;
    const tallHeight = tall.blur.getBoundingClientRect().height;
    const cardHeight = tall.cardElement.getBoundingClientRect().height;
    expect(tallHeight).toBeGreaterThan(shortHeight + 20);
    /* Measured from the card's top, since both cards sit at the same page position. */
    expect(tallTop).toBeLessThan(shortTop - 20);
    expect(tallHeight).toBeLessThan(cardHeight);
  });

  it('cuts text beyond panelHeight while the blur still starts 2rem above what shows', async () => {
    const { panel, blur, firstRow } = await mountFoot(overflowing);
    const text = panel.querySelector<HTMLElement>('[data-media-card-text]')!;
    /* 8.5rem is the most the panel (text and foot padding) may take; the text is clipped, not the feather. */
    expect(panel.getBoundingClientRect().height).toBeLessThanOrEqual(136 + 1);
    expect(
      Math.abs(blur.getBoundingClientRect().top - (text.getBoundingClientRect().top - feather)),
    ).toBeLessThanOrEqual(1);
    expect(firstRow.getBoundingClientRect().top).toBeLessThan(text.getBoundingClientRect().top);
    expect(getComputedStyle(panel).overflow).toBe('visible');
  });

  /** A pill row, a two-line title and a meta line: three rows, well inside any card at 280px. */
  function threeRows() {
    return [...pillsAndTitle(), h('span', { class: 'text-[13px] leading-snug' }, 'Opens at ten, closes at six')];
  }

  it.each([{ href: '/posts/7' }, {}])(
    'shows the whole first row under a panelHeight of 100%%, a share of the card: %o',
    async (props) => {
      const { cardElement, panel, blur, firstRow } = await mountFoot(threeRows, { ...props, panelHeight: '100%' });
      const text = panel.querySelector<HTMLElement>('[data-media-card-text]')!;
      const textTop = text.getBoundingClientRect().top;
      expect(firstRow.getBoundingClientRect().top).toBeGreaterThanOrEqual(textTop - 0.5);
      expect(panel.getBoundingClientRect().height).toBeLessThan(cardElement.getBoundingClientRect().height / 2);
      expect(
        Math.abs(blur.getBoundingClientRect().top - (firstRow.getBoundingClientRect().top - feather)),
      ).toBeLessThanOrEqual(1);
    },
  );

  it('caps the panel at a percentage of the card, not of the panel itself', async () => {
    const { cardElement, panel, firstRow } = await mountFoot(overflowing, { panelHeight: '30%' });
    const text = panel.querySelector<HTMLElement>('[data-media-card-text]')!;
    const cardContent = cardElement.clientHeight;
    expect(Math.abs(panel.getBoundingClientRect().height - cardContent * 0.3)).toBeLessThanOrEqual(1);
    expect(firstRow.getBoundingClientRect().top).toBeLessThan(text.getBoundingClientRect().top);
  });

  it('still cuts three rows under a small fixed cap', async () => {
    const { panel, blur, firstRow } = await mountFoot(threeRows, { panelHeight: '4rem' });
    const text = panel.querySelector<HTMLElement>('[data-media-card-text]')!;
    expect(panel.getBoundingClientRect().height).toBeLessThanOrEqual(64 + 1);
    expect(firstRow.getBoundingClientRect().top).toBeLessThan(text.getBoundingClientRect().top - 1);
    expect(
      Math.abs(blur.getBoundingClientRect().top - (text.getBoundingClientRect().top - feather)),
    ).toBeLessThanOrEqual(1);
    expect(getComputedStyle(text).overflow).toBe('hidden');
    expect(getComputedStyle(panel).overflow).toBe('visible');
  });

  it('blurs the media: no ancestor of the blur makes a backdrop root of its own', async () => {
    const { blur } = await mountFoot(pillsAndTitle, { href: '/posts/7', isDimmed: true });
    for (let node = blur.parentElement; node && node !== document.documentElement; node = node.parentElement) {
      const style = getComputedStyle(node);
      expect(style.filter, node.tagName).toBe('none');
      expect(style.opacity, node.tagName).toBe('1');
      expect(style.backdropFilter, node.tagName).toBe('none');
      expect(style.maskImage, node.tagName).toBe('none');
      expect(style.mixBlendMode, node.tagName).toBe('normal');
    }
    expect(getComputedStyle(blur).backdropFilter).toContain('blur');
  });
});
