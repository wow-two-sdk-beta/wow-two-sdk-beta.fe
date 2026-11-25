import { mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { h } from 'vue';
import { LocaleProvider } from '@src/foundation/i18n';
import { PhotoPreviewGrid, PhotoPreviewLimit, type PhotoPreviewItem } from '@src/presentation/display';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
});

/** `count` previews with a resolved `src`, keyed `p1`, `p2`, … */
function previews(count: number): PhotoPreviewItem[] {
  return Array.from({ length: count }, (_, index) => ({ key: `p${index + 1}`, src: `/photo-${index + 1}.jpg` }));
}

function mountGrid(props: Record<string, unknown> & { images: readonly PhotoPreviewItem[] }) {
  const wrapper = mount(PhotoPreviewGrid, { props, attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
}

/** The mosaic element: the `@container` root's only child. */
function mosaic(wrapper: VueWrapper): HTMLElement {
  return wrapper.element.firstElementChild as HTMLElement;
}

/** The photo count in each column, left to right. */
function columnSizes(wrapper: VueWrapper): number[] {
  return [...mosaic(wrapper).children].map((column) => column.querySelectorAll('button').length);
}

function buttonLabels(wrapper: VueWrapper): Array<string | undefined> {
  return wrapper.findAll('button').map((button) => button.attributes('aria-label'));
}

/** Makes the image report a natural size, then fires its load event as the browser does. */
async function loadImage(wrapper: VueWrapper, index: number, size: { width: number; height: number }) {
  const image = wrapper.findAll('img')[index]!;
  Object.defineProperty(image.element, 'naturalWidth', { configurable: true, value: size.width });
  Object.defineProperty(image.element, 'naturalHeight', { configurable: true, value: size.height });
  await image.trigger('load');
}

function photoStyle(wrapper: VueWrapper, index: number, property: string): string {
  return (wrapper.findAll('button')[index]!.element as HTMLElement).style.getPropertyValue(property);
}

/** The first number in a style value, so float noise in the computed fractions never decides a test. */
function numberIn(value: string): number {
  return Number(/-?\d+(?:\.\d+)?/u.exec(value)![0]);
}

describe('PhotoPreviewGrid layout', () => {
  it('shows nothing for an empty list', () => {
    const wrapper = mountGrid({ images: [] });
    expect(wrapper.element.nodeType).toBe(Node.COMMENT_NODE);
    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('shows nothing for an empty list however large the total', () => {
    const wrapper = mountGrid({ images: [], total: 9 });
    expect(wrapper.find('button').exists()).toBe(false);
  });

  it.each([
    [1, [1]],
    [2, [1, 1]],
    [3, [1, 2]],
    [4, [1, 1, 2]],
    [5, [1, 2, 2]],
  ])('arranges %i photos in columns of %j: the lead stands alone, the rest stack in reading order', (count, sizes) => {
    const wrapper = mountGrid({ images: previews(count) });
    expect(wrapper.findAll('button')).toHaveLength(count);
    expect(columnSizes(wrapper)).toEqual(sizes);
    expect(wrapper.findAll('img').map((image) => image.attributes('src'))).toEqual(
      previews(count).map((item) => item.src),
    );
  });

  it('renders at most PhotoPreviewLimit photos', () => {
    expect(PhotoPreviewLimit).toBe(5);
    const wrapper = mountGrid({ images: previews(8) });
    expect(wrapper.findAll('button')).toHaveLength(PhotoPreviewLimit);
    expect(wrapper.findAll('img').at(-1)!.attributes('src')).toBe('/photo-5.jpg');
  });

  it('centres a lone photo in the strip', () => {
    expect(mosaic(mountGrid({ images: previews(1) })).classList.contains('justify-center')).toBe(true);
    expect(mosaic(mountGrid({ images: previews(2) })).classList.contains('justify-center')).toBe(false);
  });

  it('sizes each column by its photos stacked at one width, with the default 4:5 aspect before any load', () => {
    expect(mosaic(mountGrid({ images: previews(2) })).style.getPropertyValue('--mosaic-columns')).toBe(
      'minmax(0, 0.8fr) minmax(0, 0.8fr)',
    );
    /* Two 4:5 photos stacked are 4:10, so the column takes half the weight of a lone photo. */
    expect(mosaic(mountGrid({ images: previews(3) })).style.getPropertyValue('--mosaic-columns')).toBe(
      'minmax(0, 0.8fr) minmax(0, 0.4fr)',
    );
  });

  it('caps the collage at 30rem, reserving one 0.5rem gutter between columns', () => {
    const lone = mosaic(mountGrid({ images: previews(1) }));
    expect(lone.style.getPropertyValue('--mosaic-height')).toBe('min(30rem, calc((100cqw - 0rem) / 0.8))');
    const pair = mosaic(mountGrid({ images: previews(2) }));
    expect(pair.style.getPropertyValue('--mosaic-height')).toBe('min(30rem, calc((100cqw - 0.5rem) / 1.6))');
    expect(pair.style.getPropertyValue('--mosaic-width')).toBe('calc(var(--mosaic-height) * 1.6 + 0.5rem)');
  });

  it('caps the collage at 24rem with isHeightFixed', () => {
    const wrapper = mountGrid({ images: previews(2), isHeightFixed: true });
    expect(mosaic(wrapper).style.getPropertyValue('--mosaic-height')).toBe('min(24rem, calc((100cqw - 0.5rem) / 1.6))');
  });

  it('follows isHeightFixed when it changes', async () => {
    const wrapper = mountGrid({ images: previews(2) });
    await wrapper.setProps({ isHeightFixed: true });
    expect(mosaic(wrapper).style.getPropertyValue('--mosaic-height')).toContain('min(24rem');
    await wrapper.setProps({ isHeightFixed: false });
    expect(mosaic(wrapper).style.getPropertyValue('--mosaic-height')).toContain('min(30rem');
  });

  it('forwards attributes and classes to the root element', () => {
    const wrapper = mount(PhotoPreviewGrid, {
      props: { images: previews(2) },
      attrs: { class: 'mt-4', 'data-grid': 'one' },
    });
    wrappers.push(wrapper);
    expect(wrapper.element.classList.contains('mt-4')).toBe(true);
    expect(wrapper.element.classList.contains('@container')).toBe(true);
    expect(wrapper.attributes('data-grid')).toBe('one');
  });
});

describe('PhotoPreviewGrid photos', () => {
  it('renders a decorative, no-referrer image, eager for the lead and lazy for the rest', () => {
    const wrapper = mountGrid({ images: previews(3) });
    const images = wrapper.findAll('img');
    for (const image of images) {
      expect(image.attributes('alt')).toBe('');
      expect(image.attributes('decoding')).toBe('async');
      expect(image.attributes('referrerpolicy')).toBe('no-referrer');
    }
    expect(images.map((image) => image.attributes('loading'))).toEqual(['eager', 'lazy', 'lazy']);
  });

  it('draws the photos in colour by default and in grayscale with isMuted', async () => {
    const wrapper = mountGrid({ images: previews(2) });
    expect(wrapper.findAll('img').map((image) => image.classes('grayscale'))).toEqual([false, false]);
    await wrapper.setProps({ isMuted: true });
    expect(wrapper.findAll('img').map((image) => image.classes('grayscale'))).toEqual([true, true]);
  });

  it('keeps the slot of a photo with no source yet empty', () => {
    const wrapper = mountGrid({ images: [{ key: 'p1' }, { key: 'p2', src: '/photo-2.jpg' }] });
    expect(wrapper.findAll('button')).toHaveLength(2);
    expect(wrapper.findAll('img')).toHaveLength(1);
    expect(wrapper.findAll('button')[0]!.text()).toBe('');
  });

  it('says so when a photo is unavailable', () => {
    const wrapper = mountGrid({ images: [{ key: 'p1', unavailable: true }, { key: 'p2' }] });
    expect(wrapper.findAll('button')[0]!.text()).toBe('Photo unavailable');
    expect(wrapper.findAll('button')[1]!.text()).toBe('');
    expect(wrapper.find('img').exists()).toBe(false);
  });

  it('prefers a resolved source over the unavailable flag', () => {
    const wrapper = mountGrid({ images: [{ key: 'p1', src: '/photo-1.jpg', unavailable: true }] });
    expect(wrapper.find('img').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('Photo unavailable');
  });

  it('swaps in the image when the source arrives for the same key', async () => {
    const wrapper = mountGrid({ images: [{ key: 'p1' }] });
    expect(wrapper.find('img').exists()).toBe(false);
    await wrapper.setProps({ images: [{ key: 'p1', src: '/photo-1.jpg' }] });
    expect(wrapper.get('img').attributes('src')).toBe('/photo-1.jpg');
    expect(wrapper.findAll('button')).toHaveLength(1);
  });
});

describe('PhotoPreviewGrid overflow', () => {
  it('labels each photo by its position and adds no count while everything is shown', () => {
    const wrapper = mountGrid({ images: previews(3) });
    expect(buttonLabels(wrapper)).toEqual(['Open photo 1', 'Open photo 2', 'Open photo 3']);
    expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(false);
  });

  it('counts the photos beyond the limit on the last one, which opens the whole set', () => {
    const wrapper = mountGrid({ images: previews(7) });
    expect(buttonLabels(wrapper)).toEqual([
      'Open photo 1',
      'Open photo 2',
      'Open photo 3',
      'Open photo 4',
      'View all 7 photos',
    ]);
    const overlay = wrapper.get('[aria-hidden="true"]');
    expect(overlay.text()).toBe('+2');
    expect(overlay.classes()).toContain('pointer-events-none');
    expect(wrapper.findAll('button')[4]!.element.contains(overlay.element)).toBe(true);
  });

  it('counts a total larger than the resolved previews, for a caller that resolves only the visible ones', () => {
    const wrapper = mountGrid({ images: previews(3), total: 12 });
    expect(wrapper.findAll('button')).toHaveLength(3);
    expect(buttonLabels(wrapper).at(-1)).toBe('View all 12 photos');
    expect(wrapper.get('[aria-hidden="true"]').text()).toBe('+9');
  });

  it('shows no count when five photos are exactly the total', () => {
    const wrapper = mountGrid({ images: previews(5), total: 5 });
    expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(false);
    expect(buttonLabels(wrapper).at(-1)).toBe('Open photo 5');
  });

  it('ignores a total smaller than the previews it was given', () => {
    const wrapper = mountGrid({ images: previews(3), total: 1 });
    expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(false);
    expect(buttonLabels(wrapper)).toEqual(['Open photo 1', 'Open photo 2', 'Open photo 3']);
  });

  it('follows total when it changes', async () => {
    const wrapper = mountGrid({ images: previews(2), total: 2 });
    expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(false);
    await wrapper.setProps({ total: 6 });
    expect(wrapper.get('[aria-hidden="true"]').text()).toBe('+4');
    expect(buttonLabels(wrapper).at(-1)).toBe('View all 6 photos');
  });
});

describe('PhotoPreviewGrid events', () => {
  it('emits open with the index of the clicked photo', async () => {
    const wrapper = mountGrid({ images: previews(4) });
    await wrapper.findAll('button')[2]!.trigger('click');
    await wrapper.findAll('button')[0]!.trigger('click');
    expect(wrapper.emitted('open')).toEqual([[2], [0]]);
  });

  it('opens at the last preview from the view-all photo', async () => {
    const wrapper = mountGrid({ images: previews(7) });
    await wrapper.findAll('button')[4]!.trigger('click');
    expect(wrapper.emitted('open')).toEqual([[4]]);
  });

  it('emits open from an unavailable photo too, so a viewer can report it', async () => {
    const wrapper = mountGrid({ images: [{ key: 'p1', unavailable: true }] });
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('open')).toEqual([[0]]);
  });

  it('calls an onOpen listener passed as a prop', async () => {
    const opened: number[] = [];
    const wrapper = mount(PhotoPreviewGrid, {
      props: { images: previews(2), onOpen: (index: number) => opened.push(index) },
    });
    wrappers.push(wrapper);
    await wrapper.findAll('button')[1]!.trigger('click');
    expect(opened).toEqual([1]);
  });
});

describe('PhotoPreviewGrid accessibility', () => {
  it('uses native buttons, so Enter and Space activate each photo and Tab reaches it', () => {
    const wrapper = mountGrid({ images: previews(5) });
    for (const button of wrapper.findAll('button')) {
      expect(button.element.tagName).toBe('BUTTON');
      expect(button.attributes('type')).toBe('button');
      expect(button.attributes('tabindex')).toBeUndefined();
      expect(button.attributes('disabled')).toBeUndefined();
    }
    expect(wrapper.findAll('a, [role]')).toHaveLength(0);
  });

  it('moves focus to a photo and shows its focus outline classes', () => {
    const wrapper = mountGrid({ images: previews(2) });
    const second = wrapper.findAll('button')[1]!;
    (second.element as HTMLElement).focus();
    expect(document.activeElement).toBe(second.element);
    expect(second.classes()).toEqual(
      expect.arrayContaining(['focus-visible:outline-2', 'focus-visible:outline-white', 'focus-visible:z-10']),
    );
  });

  it('names a photo by its button label, never by its image', () => {
    const wrapper = mountGrid({ images: previews(2) });
    expect(wrapper.findAll('img').every((image) => image.attributes('alt') === '')).toBe(true);
    expect(wrapper.findAll('button').every((button) => Boolean(button.attributes('aria-label')))).toBe(true);
  });

  it('keeps the photo labelled when its image has not resolved', () => {
    const wrapper = mountGrid({ images: [{ key: 'p1', unavailable: true }] });
    expect(wrapper.get('button').attributes('aria-label')).toBe('Open photo 1');
  });
});

describe('PhotoPreviewGrid aspect ratios', () => {
  it('gives each photo room for its default aspect before it loads', () => {
    const wrapper = mountGrid({ images: previews(2) });
    expect(numberIn(photoStyle(wrapper, 0, '--photo-grow'))).toBeCloseTo(1.25);
    /* A photo is 14rem tall at most in the strip, so its width is 14rem times its aspect, never over 80% of the box. */
    expect(photoStyle(wrapper, 0, '--photo-width')).toMatch(/^min\(80cqw, 11\.2\d*rem\)$/u);
  });

  it('re-weights its columns by the natural aspect a photo reports on load', async () => {
    const wrapper = mountGrid({ images: previews(2) });
    await loadImage(wrapper, 0, { width: 1600, height: 1000 });
    expect(mosaic(wrapper).style.getPropertyValue('--mosaic-columns')).toBe('minmax(0, 1.6fr) minmax(0, 0.8fr)');
    expect(photoStyle(wrapper, 0, '--photo-grow')).toBe('0.625');
    const height = mosaic(wrapper).style.getPropertyValue('--mosaic-height');
    expect(height).toMatch(/^min\(30rem, calc\(\(100cqw - 0\.5rem\) \/ 2\.4\d*\)\)$/u);
  });

  it('clamps an extreme aspect to between 0.45 and 2.5', async () => {
    const wrapper = mountGrid({ images: previews(2) });
    await loadImage(wrapper, 0, { width: 10000, height: 100 });
    await loadImage(wrapper, 1, { width: 100, height: 10000 });
    expect(numberIn(photoStyle(wrapper, 0, '--photo-grow'))).toBeCloseTo(0.4);
    expect(numberIn(photoStyle(wrapper, 1, '--photo-grow'))).toBeCloseTo(1 / 0.45);
  });

  it.each([
    ['no height', { width: 400, height: 0 }],
    ['no width', { width: 0, height: 400 }],
    ['no size', { width: 0, height: 0 }],
  ])('keeps the default aspect when the image reports %s', async (_, size) => {
    const wrapper = mountGrid({ images: previews(2) });
    await loadImage(wrapper, 0, size);
    expect(numberIn(photoStyle(wrapper, 0, '--photo-grow'))).toBeCloseTo(1.25);
  });

  it('keeps a loaded aspect with its photo when the list is reordered', async () => {
    const wrapper = mountGrid({ images: previews(2) });
    await loadImage(wrapper, 0, { width: 2000, height: 1000 });
    expect(photoStyle(wrapper, 0, '--photo-grow')).toBe('0.5');

    const [first, second] = previews(2);
    await wrapper.setProps({ images: [second!, first!] });
    expect(numberIn(photoStyle(wrapper, 0, '--photo-grow'))).toBeCloseTo(1.25);
    expect(numberIn(photoStyle(wrapper, 1, '--photo-grow'))).toBeCloseTo(0.5);
  });

  it('keeps a loaded aspect when the same photo gets a new source', async () => {
    const wrapper = mountGrid({ images: [{ key: 'p1', src: '/small.jpg' }] });
    await loadImage(wrapper, 0, { width: 2000, height: 1000 });
    await wrapper.setProps({ images: [{ key: 'p1', src: '/large.jpg' }] });
    expect(wrapper.get('img').attributes('src')).toBe('/large.jpg');
    expect(photoStyle(wrapper, 0, '--photo-grow')).toBe('0.5');
  });
});

describe('PhotoPreviewGrid localization', () => {
  it('takes its labels from the locale provider, with the count and index interpolated', () => {
    const wrapper = mount(LocaleProvider, {
      props: {
        messages: {
          'PhotoPreviewGrid.open': 'Ouvrir la photo {index}',
          'PhotoPreviewGrid.viewAll': 'Voir les {count} photos',
          'PhotoPreviewGrid.unavailable': 'Photo indisponible',
        },
      },
      slots: {
        default: () =>
          h(PhotoPreviewGrid, { images: [{ key: 'p1', unavailable: true }, ...previews(5).slice(1)], total: 8 }),
      },
    });
    wrappers.push(wrapper);
    const buttons = wrapper.findAll('button');
    expect(buttons[0]!.attributes('aria-label')).toBe('Ouvrir la photo 1');
    expect(buttons[0]!.text()).toBe('Photo indisponible');
    expect(buttons.at(-1)!.attributes('aria-label')).toBe('Voir les 8 photos');
  });
});
