import { mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { h, type VNodeChild } from 'vue';
import { CardLink, MediaCard } from '@src/presentation/display';

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

/** Mounts a linked card with an image, a `topEnd` button and a title, attached so clicks bubble as in a page. */
function mountCard(props: Record<string, unknown> = { href: '/posts/7' }) {
  wrapper = mount(MediaCard, {
    props,
    slots: {
      media: () => h('img', { src: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', alt: '' }),
      topEnd: () => h('button', { type: 'button', 'data-open': '' }, 'Open the original'),
      default: () => h('span', { 'data-title': '' }, 'Autumn light'),
    },
    attachTo: document.body,
  });
  return wrapper;
}

/** Records the clicks that reach the card's link, and keeps happy-dom from navigating. */
function linkClicks(card: VueWrapper) {
  const followed = vi.fn<(href: string | null) => void>();
  card.get('a[data-card-link]').element.addEventListener('click', (event) => {
    event.preventDefault();
    followed((event.currentTarget as HTMLAnchorElement).getAttribute('href'));
  });
  return followed;
}

describe('MediaCard link', () => {
  it('makes the text panel one link, named by it and stretched over the card', () => {
    const card = mountCard();
    const link = card.get('a[data-card-link]');
    expect(link.attributes('href')).toBe('/posts/7');
    expect(link.text()).toBe('Autumn light');
    expect(link.classes()).toEqual(expect.arrayContaining(['after:absolute', 'after:inset-0']));
    expect(card.findAll('a').length).toBe(1);
    expect(card.classes()).toEqual(
      expect.arrayContaining(['relative', 'has-[[data-card-link]:focus-visible]:outline-ring']),
    );
  });

  it('follows the link from the panel, and keeps the media outside any other control', async () => {
    const card = mountCard();
    const followed = linkClicks(card);
    await card.get('[data-title]').trigger('click');
    expect(followed).toHaveBeenCalledWith('/posts/7');
    /* The media sits under the link's stretched area: nothing interactive wraps it to catch the click first. */
    expect(card.get('img').element.closest('a, button, [role="button"]')).toBeNull();
    expect(card.get('[data-media-card-panel]').classes()).toContain('z-10');
  });

  it('keeps the link stretched over the card although the panel is positioned for the blur', () => {
    const panel = mountCard().get('[data-media-card-panel]');
    expect(panel.classes()).toContain('relative');
    /* The positioned panel would confine the link's pseudo-element to itself: it reaches up over the card instead. */
    expect(panel.classes()).toEqual(
      expect.arrayContaining([
        '[&_[data-card-link]::after]:inset-x-0',
        '[&_[data-card-link]::after]:-top-[100rem]',
        '[&_[data-card-link]::after]:bottom-0',
      ]),
    );
    expect(panel.classes()).not.toContain('overflow-hidden');
  });

  it('does not follow the link from a topEnd control, which sits above it', async () => {
    const card = mountCard();
    const followed = linkClicks(card);
    const opened = vi.fn();
    card.get('[data-open]').element.addEventListener('click', opened);
    await card.get('[data-open]').trigger('click');
    expect(opened).toHaveBeenCalledOnce();
    expect(followed).not.toHaveBeenCalled();
    const top = card.get('[data-media-card-top="end"]');
    expect(top.element.closest('a')).toBeNull();
    expect(top.classes()).toContain('z-20');
  });

  it('renders no link without href or for an unsafe address', () => {
    expect(mountCard({}).find('a').exists()).toBe(false);
    wrapper!.unmount();
    expect(mountCard({ href: 'javascript:alert(1)' }).find('a').exists()).toBe(false);
  });

  it('hosts a CardLink in the default slot for an in-app route', () => {
    wrapper = mount(MediaCard, {
      slots: { default: () => h(CardLink, { href: '/listings/3' }, () => 'Flat in Yunusabad') },
    });
    const link = wrapper.get('a[data-card-link]');
    expect(link.attributes('href')).toBe('/listings/3');
    expect(link.text()).toBe('Flat in Yunusabad');
  });
});

describe('MediaCard layout', () => {
  it('holds the 4 / 5 ratio and lets the text take at most 8.5rem of the panel by default', () => {
    const card = mountCard();
    expect((card.element as HTMLElement).style.aspectRatio).toMatch(/^0\.8( \/ 1)?$/u);
    expect(card.get<HTMLElement>('[data-media-card-text]').element.style.maxHeight).toBe('calc(8.5rem - 1rem)');
    expect(card.get<HTMLElement>('[data-media-card-panel]').element.style.height).toBe('');
  });

  it('takes a ratio and a panel height, and lets a caller style win', () => {
    const card = mountCard({ ratio: 12 / 5, panelHeight: '6rem', style: { aspectRatio: '1' } });
    expect((card.element as HTMLElement).style.aspectRatio).toMatch(/^1( \/ 1)?$/u);
    expect(card.get<HTMLElement>('[data-media-card-text]').element.style.maxHeight).toBe('calc(6rem - 1rem)');
  });

  it('draws the panel as a dark stage under white text', () => {
    const panel = mountCard().get('[data-media-card-panel]');
    expect(panel.classes()).toEqual(expect.arrayContaining(['dark', 'text-white']));
  });

  it.each<[string, Record<string, unknown>, () => VNodeChild]>([
    ['an href link', { href: '/posts/7' }, () => 'Autumn light'],
    ['a slotted CardLink', {}, () => h(CardLink, { href: '/listings/3' }, () => 'Flat in Yunusabad')],
    ['a plain panel', {}, () => 'No link'],
  ])('anchors the blur to the content block, whatever it holds: %s', (_name, props, content) => {
    wrapper = mount(MediaCard, {
      props,
      slots: {
        media: () => h('img', { src: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', alt: '' }),
        default: content,
      },
    });
    const panel = wrapper.get('[data-media-card-panel]');
    const blurs = wrapper.findAll('[aria-hidden="true"].backdrop-blur-xl');
    expect(blurs).toHaveLength(1);
    const blur = blurs[0]!;
    /* A child of the content block, never of the card: it follows the content, not a share of the card. */
    expect(blur.element.parentElement).toBe(panel.element);
    expect(wrapper.element.contains(blur.element)).toBe(true);
    expect(blur.element.parentElement).not.toBe(wrapper.element);
    expect(panel.classes()).toContain('relative');
    expect(blur.classes()).toEqual(
      expect.arrayContaining([
        'absolute',
        'inset-x-0',
        'bottom-0',
        '-top-8',
        '-z-10',
        'pointer-events-none',
        'from-black/80',
        'via-black/45',
      ]),
    );
    for (const property of ['mask-image', '-webkit-mask-image']) {
      expect(blur.classes()).toContain(`[${property}:linear-gradient(to_top,black_calc(100%_-_2rem),transparent)]`);
    }
    expect(wrapper.html()).not.toContain('h-3/5');
    expect(wrapper.html()).not.toContain('black_50%');
  });

  it('keeps the blur behind the text and cuts only the text, never the panel', () => {
    const card = mountCard();
    const panel = card.get('[data-media-card-panel]');
    const text = card.get('[data-media-card-text]');
    expect(text.element.parentElement).toBe(panel.element);
    expect(text.element.contains(card.get('[data-title]').element)).toBe(true);
    expect(text.classes()).toEqual(expect.arrayContaining(['overflow-hidden', 'justify-end']));
    expect(panel.classes()).not.toContain('overflow-hidden');
    /* The blur sits outside the clipped text, so its feather rises above the text without being cut. */
    expect(text.element.contains(card.get('.backdrop-blur-xl').element)).toBe(false);
  });

  it('zooms the images on hover only when motion is allowed', () => {
    const media = mountCard().get('[data-media-card-media]');
    const zoom = media.classes().filter((name) => name.includes('scale-105'));
    expect(zoom.length).toBeGreaterThan(0);
    expect(zoom.every((name) => name.startsWith('motion-safe:'))).toBe(true);
  });

  it('greys the images when dimmed, never the media layer itself', () => {
    const plain = mountCard().get('[data-media-card-media]');
    expect(plain.classes()).not.toContain('[&_img]:grayscale');
    wrapper!.unmount();
    const card = mountCard({ href: '/posts/7', isDimmed: true });
    const media = card.get('[data-media-card-media]');
    expect(card.attributes('data-dimmed')).toBe('true');
    expect(media.classes()).toContain('[&_img]:grayscale');
    expect(media.classes()).not.toContain('grayscale');
  });

  it('shows the fallback on a soft tile when there is no media', () => {
    wrapper = mount(MediaCard, {
      slots: { fallback: () => h('svg', { 'data-icon': '' }), default: () => 'No image' },
    });
    const tile = wrapper.get('[data-media-card-fallback]');
    expect(tile.find('[data-icon]').exists()).toBe(true);
    expect(tile.classes()).toEqual(expect.arrayContaining(['from-primary-soft', 'to-muted']));
    expect(wrapper.find('[data-media-card-media]').exists()).toBe(false);
  });

  it('renders each top slot in its own corner and leaves out the empty ones', () => {
    wrapper = mount(MediaCard, {
      slots: { topStart: () => 'start', topCenter: () => 'centre' },
    });
    expect(wrapper.get('[data-media-card-top="start"]').text()).toBe('start');
    expect(wrapper.get('[data-media-card-top="center"]').text()).toBe('centre');
    expect(wrapper.find('[data-media-card-top="end"]').exists()).toBe(false);
  });
});
