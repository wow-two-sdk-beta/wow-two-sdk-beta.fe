import { describe, expect, it } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { MapBrandMark, MapLinks } from '@src/domain/maps';
import { mapsCases } from './MapsCases';
import { assertRendersOnServer } from '../../../support/Smoke';

describe('domain/maps — server render', () => {
  for (const testCase of mapsCases) {
    it(`${testCase.name} server-renders`, async () => {
      await assertRendersOnServer(testCase);
    });
  }

  it('renders the links as markup with their URLs, names and marks', async () => {
    const html = await renderToString(createSSRApp({ render: () => h(MapLinks, { query: 'Chorsu bazaar' }) }));
    expect(html).toContain('href="https://yandex.com/maps/?text=Chorsu%20bazaar"');
    expect(html).toContain('href="https://www.google.com/maps/search/?api=1&amp;query=Chorsu%20bazaar"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('aria-label="Open in Yandex Maps"');
    expect(html).toContain('aria-label="Open in Google Maps"');
    expect(html.indexOf('data-map-provider="yandex"')).toBeLessThan(html.indexOf('data-map-provider="google"'));
    expect(html.match(/<svg/g)).toHaveLength(4);
  });

  it('renders no element when nothing can be linked', async () => {
    const html = await renderToString(createSSRApp({ render: () => h(MapLinks, {}) }));
    expect(html).not.toContain('<span');
    expect(html).not.toContain('<a');
  });

  it('renders a bare mark', async () => {
    const html = await renderToString(
      createSSRApp({ render: () => h(MapBrandMark, { provider: 'yandex', label: 'Yandex Maps' }) }),
    );
    expect(html).toContain('<svg');
    expect(html).toContain('data-map-provider="yandex"');
    expect(html).toContain('aria-label="Yandex Maps"');
  });
});
