import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { LocaleProvider } from '@src/foundation/i18n';
import { MapBrandMark, MapLinks, type MapLinksProps } from '@src/domain/maps';
import { mapsCases } from './MapsCases';
import { assertMounts } from '../../../support/Smoke';

describe('domain/maps — mounts', () => {
  for (const testCase of mapsCases) {
    it(`${testCase.name} mounts`, async () => {
      await assertMounts(testCase);
    });
  }
});

function linksOf(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('a[data-map-provider]');
}

describe('MapLinks — the links', () => {
  it('draws one link per provider, Yandex first, each searching the text in its own map', () => {
    const wrapper = mount(MapLinks, { props: { query: 'Chorsu bazaar, Tashkent' } });
    const links = linksOf(wrapper);
    expect(links.map((link) => link.attributes('data-map-provider'))).toEqual(['yandex', 'google']);
    expect(links[0]!.attributes('href')).toBe('https://yandex.com/maps/?text=Chorsu%20bazaar%2C%20Tashkent');
    expect(links[1]!.attributes('href')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Chorsu%20bazaar%2C%20Tashkent',
    );
    wrapper.unmount();
  });

  it('opens each link in a new tab that cannot reach back', () => {
    const wrapper = mount(MapLinks, { props: { query: 'Chorsu' } });
    for (const link of linksOf(wrapper)) {
      expect(link.attributes('target')).toBe('_blank');
      expect(link.attributes('rel')).toBe('noopener noreferrer');
    }
    wrapper.unmount();
  });

  it('searches the coordinates when there is no text, longitude first on Yandex', () => {
    const wrapper = mount(MapLinks, { props: { lat: 41.2995, lng: 69.2401 } });
    const [yandex, google] = linksOf(wrapper);
    expect(yandex!.attributes('href')).toBe('https://yandex.com/maps/?pt=69.2401,41.2995&z=16');
    expect(google!.attributes('href')).toBe('https://www.google.com/maps/search/?api=1&query=41.2995%2C69.2401');
    wrapper.unmount();
  });

  it('passes the locale to the Google link', () => {
    const wrapper = mount(MapLinks, { props: { query: 'Chorsu', locale: 'uz' } });
    const [yandex, google] = linksOf(wrapper);
    expect(yandex!.attributes('href')).toBe('https://yandex.com/maps/?text=Chorsu');
    expect(google!.attributes('href')).toBe('https://www.google.com/maps/search/?api=1&query=Chorsu&hl=uz');
    wrapper.unmount();
  });

  it('follows the providers prop: one, reversed, repeated and unknown', () => {
    const cases: Array<[MapLinksProps['providers'], string[]]> = [
      [['google'], ['google']],
      [['yandex'], ['yandex']],
      [
        ['google', 'yandex'],
        ['google', 'yandex'],
      ],
      [
        ['yandex', 'yandex', 'google', 'yandex'],
        ['yandex', 'google'],
      ],
      [['bing', 'google'] as never, ['google']],
      [[], []],
    ];
    for (const [providers, expected] of cases) {
      const wrapper = mount(MapLinks, { props: { query: 'Chorsu', providers } });
      expect(linksOf(wrapper).map((link) => link.attributes('data-map-provider'))).toEqual(expected);
      wrapper.unmount();
    }
  });

  it('redraws when the text changes', async () => {
    const wrapper = mount(MapLinks, { props: { query: 'Chorsu' } });
    expect(linksOf(wrapper)[0]!.attributes('href')).toContain('text=Chorsu');
    await wrapper.setProps({ query: 'Registan' });
    expect(linksOf(wrapper)[0]!.attributes('href')).toContain('text=Registan');
    await wrapper.setProps({ query: '' });
    expect(linksOf(wrapper)).toHaveLength(0);
    wrapper.unmount();
  });
});

describe('MapLinks — nothing to link', () => {
  const empty: MapLinksProps[] = [
    {},
    { query: null },
    { query: '   ' },
    { lat: 41.3 },
    { lng: 69.2 },
    { lat: 200, lng: 69.2 },
    { query: 'Chorsu', providers: [] },
  ];

  it.each(empty)('renders no element for %j', (props) => {
    const wrapper = mount(MapLinks, { props, attrs: { class: 'ms-2', 'data-testid': 'row' } });
    expect(wrapper.find('[data-map-links]').exists()).toBe(false);
    expect(wrapper.find('a').exists()).toBe(false);
    expect(wrapper.find('[data-testid]').exists()).toBe(false);
    expect(wrapper.element.nodeType).toBe(Node.COMMENT_NODE);
    wrapper.unmount();
  });
});

describe('MapLinks — accessible names', () => {
  it('names each link and its tooltip, and hides the decorative marks', () => {
    const wrapper = mount(MapLinks, { props: { query: 'Chorsu' } });
    const [yandex, google] = linksOf(wrapper);
    expect(yandex!.attributes('aria-label')).toBe('Open in Yandex Maps');
    expect(yandex!.attributes('title')).toBe('Open in Yandex Maps');
    expect(google!.attributes('aria-label')).toBe('Open in Google Maps');
    expect(google!.attributes('title')).toBe('Open in Google Maps');
    for (const svg of wrapper.findAll('svg')) {
      expect(svg.attributes('aria-hidden')).toBe('true');
      expect(svg.attributes('role')).toBeUndefined();
    }
    expect(wrapper.findAll('a').every((link) => link.text() === '')).toBe(true);
    wrapper.unmount();
  });

  it('takes the names from the nearest locale provider', () => {
    const wrapper = mount(
      defineComponent({
        render: () =>
          h(
            LocaleProvider,
            { locale: 'uz', messages: { 'MapLinks.yandexLabel': 'Yandex Xaritada ochish' } },
            { default: () => h(MapLinks, { query: 'Chorsu' }) },
          ),
      }),
    );
    const [yandex, google] = linksOf(wrapper);
    expect(yandex!.attributes('aria-label')).toBe('Yandex Xaritada ochish');
    expect(yandex!.attributes('title')).toBe('Yandex Xaritada ochish');
    expect(google!.attributes('aria-label')).toBe('Open in Google Maps');
    wrapper.unmount();
  });

  it('lets a label prop win over the locale provider', () => {
    const wrapper = mount(
      defineComponent({
        render: () =>
          h(
            LocaleProvider,
            { messages: { 'MapLinks.googleLabel': 'From the provider' } },
            { default: () => h(MapLinks, { query: 'Chorsu', googleLabel: 'Google Xarita' }) },
          ),
      }),
    );
    expect(linksOf(wrapper)[1]!.attributes('aria-label')).toBe('Google Xarita');
    wrapper.unmount();
  });

  it('puts every link in the tab order, with no tabindex of its own', () => {
    const wrapper = mount(MapLinks, { props: { query: 'Chorsu' } });
    for (const link of linksOf(wrapper)) expect(link.attributes('tabindex')).toBeUndefined();
    wrapper.unmount();
  });
});

describe('MapLinks — look', () => {
  it('sizes the marks at 16 by default and by the size prop', () => {
    const wrapper = mount(MapLinks, { props: { query: 'Chorsu' } });
    expect(wrapper.findAll('svg').map((svg) => svg.attributes('width'))).toEqual(['16', '16', '16', '16']);
    wrapper.unmount();

    const large = mount(MapLinks, { props: { query: 'Chorsu', size: 24 } });
    expect(large.findAll('svg').map((svg) => svg.attributes('height'))).toEqual(['24', '24', '24', '24']);
    large.unmount();

    const invalid = mount(MapLinks, { props: { query: 'Chorsu', size: -3 } });
    expect(invalid.get('svg').attributes('width')).toBe('16');
    invalid.unmount();
  });

  it('stacks a muted monochrome mark and a brand-colored one in each link, swapping on hover and focus', () => {
    const wrapper = mount(MapLinks, { props: { query: 'Chorsu' } });
    for (const link of linksOf(wrapper)) {
      const [rest, color] = link.findAll('svg');
      expect(rest!.attributes('data-variant')).toBe('mono');
      expect(rest!.classes()).toEqual(
        expect.arrayContaining([
          'col-start-1',
          'row-start-1',
          'opacity-60',
          'group-hover/map-link:opacity-0',
          'group-focus-visible/map-link:opacity-0',
        ]),
      );
      expect(color!.attributes('data-variant')).toBe('color');
      expect(color!.classes()).toEqual(
        expect.arrayContaining([
          'col-start-1',
          'row-start-1',
          'opacity-0',
          'group-hover/map-link:opacity-100',
          'group-focus-visible/map-link:opacity-100',
        ]),
      );
    }
    wrapper.unmount();
  });

  it('shows a focus ring on keyboard focus and gives each link a hit area around the mark', () => {
    const wrapper = mount(MapLinks, { props: { query: 'Chorsu' } });
    for (const link of linksOf(wrapper)) {
      expect(link.classes()).toEqual(
        expect.arrayContaining(['group/map-link', 'p-1', 'focus-visible:outline-2', 'focus-visible:outline-ring']),
      );
    }
    wrapper.unmount();
  });

  it('sits inline on a raised z-index and merges a caller class and attributes', () => {
    const wrapper = mount(MapLinks, {
      props: { query: 'Chorsu' },
      attrs: { class: 'ms-2', 'data-testid': 'row' },
    });
    const row = wrapper.get('[data-map-links]');
    expect(row.element.tagName).toBe('SPAN');
    expect(row.classes()).toEqual(expect.arrayContaining(['relative', 'z-20', 'inline-flex', 'ms-2']));
    expect(row.attributes('data-testid')).toBe('row');
    wrapper.unmount();
  });
});

describe('MapLinks — clicks stay on the link', () => {
  /** A card with its own click handler around the row, like a MediaCard that opens its subject. */
  function mountInCard(onCard: () => void) {
    return mount(
      defineComponent({
        render: () =>
          h('div', { 'data-card': '', onClick: onCard, onAuxclick: onCard }, [
            h('a', { href: '/events/1', 'data-card-link': '' }, 'Open the event'),
            h(MapLinks, { query: 'Chorsu' }),
          ]),
      }),
      { attachTo: document.body },
    );
  }

  it('does not bubble a click on a link to the card', () => {
    const onCard = vi.fn();
    const wrapper = mountInCard(onCard);
    const link = wrapper.get('a[data-map-provider="yandex"]');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.element.dispatchEvent(event);
    expect(onCard).not.toHaveBeenCalled();
    expect(event.cancelBubble).toBe(true);
    wrapper.unmount();
  });

  it('keeps the default action, so the link still opens', () => {
    const wrapper = mountInCard(vi.fn());
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    wrapper.get('a[data-map-provider="google"]').element.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    wrapper.unmount();
  });

  it('does not bubble a click in the gap between the links, or a middle click', () => {
    const onCard = vi.fn();
    const wrapper = mountInCard(onCard);
    const row = wrapper.get('[data-map-links]').element;
    row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    wrapper
      .get('a[data-map-provider="google"]')
      .element.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, button: 1 }));
    expect(onCard).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('lets a click elsewhere in the card reach the card', () => {
    const onCard = vi.fn();
    const wrapper = mountInCard(onCard);
    wrapper.get('[data-card-link]').element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onCard).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('still runs a click handler the caller puts on the row', async () => {
    const onClick = vi.fn();
    const wrapper = mount(MapLinks, { props: { query: 'Chorsu', onClick } as never });
    await wrapper.get('a').trigger('click');
    expect(onClick).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });
});

describe('MapBrandMark', () => {
  it('draws the Yandex pin in two colors and the Google pin in one, at 16 px', () => {
    const yandex = mount(MapBrandMark, { props: { provider: 'yandex' } });
    expect(yandex.get('svg').attributes('width')).toBe('16');
    expect(yandex.get('svg').attributes('viewBox')).toBe('0 0 16 16');
    expect(yandex.get('svg').attributes('data-map-provider')).toBe('yandex');
    expect(yandex.get('svg').attributes('data-variant')).toBe('color');
    expect(yandex.findAll('path').map((path) => path.attributes('fill'))).toEqual(['#FF4433', '#FFFFFF']);
    yandex.unmount();

    const google = mount(MapBrandMark, { props: { provider: 'google' } });
    expect(google.get('svg').attributes('viewBox')).toBe('0 0 24 24');
    expect(google.findAll('path').map((path) => path.attributes('fill'))).toEqual(['#4285F4']);
    google.unmount();
  });

  it('paints with currentColor when isMonochrome, and cuts the Yandex dot out', () => {
    for (const provider of ['yandex', 'google'] as const) {
      const wrapper = mount(MapBrandMark, { props: { provider, isMonochrome: true, size: 32 } });
      const svg = wrapper.get('svg');
      expect(svg.attributes('width')).toBe('32');
      expect(svg.attributes('data-variant')).toBe('mono');
      expect(wrapper.findAll('path').map((path) => path.attributes('fill'))).toEqual(['currentColor']);
      expect(svg.html()).not.toMatch(/fill="#/);
      wrapper.unmount();
    }
    const yandex = mount(MapBrandMark, { props: { provider: 'yandex', isMonochrome: true } });
    expect(yandex.get('path').attributes('fill-rule')).toBe('evenodd');
    yandex.unmount();
  });

  it('is decorative without a label and an image with one', () => {
    const decorative = mount(MapBrandMark, { props: { provider: 'google' } });
    expect(decorative.get('svg').attributes('aria-hidden')).toBe('true');
    expect(decorative.get('svg').attributes('role')).toBeUndefined();
    expect(decorative.get('svg').attributes('focusable')).toBe('false');
    decorative.unmount();

    const named = mount(MapBrandMark, { props: { provider: 'google', label: 'Google Maps' } });
    expect(named.get('svg').attributes('role')).toBe('img');
    expect(named.get('svg').attributes('aria-label')).toBe('Google Maps');
    expect(named.get('svg').attributes('aria-hidden')).toBeUndefined();
    named.unmount();

    const empty = mount(MapBrandMark, { props: { provider: 'google', label: '' } });
    expect(empty.get('svg').attributes('aria-hidden')).toBe('true');
    empty.unmount();
  });

  it('merges a caller class and forwards other attributes', () => {
    const wrapper = mount(MapBrandMark, {
      props: { provider: 'yandex' },
      attrs: { class: 'size-8', 'data-testid': 'mark' },
    });
    expect(wrapper.get('svg').classes()).toEqual(expect.arrayContaining(['size-8', 'shrink-0']));
    expect(wrapper.get('svg').attributes('data-testid')).toBe('mark');
    wrapper.unmount();
  });

  it('draws nothing for a provider it has no mark for', () => {
    for (const provider of ['bing', 'constructor', '__proto__']) {
      const wrapper = mount(MapBrandMark, { props: { provider: provider as never } });
      expect(wrapper.find('svg').exists()).toBe(false);
      wrapper.unmount();
    }
  });
});
