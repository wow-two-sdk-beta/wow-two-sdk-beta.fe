import { describe, expect, it } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { PhotoPreviewGrid, type PhotoPreviewGridProps } from '@src/presentation/display';

async function render(props: PhotoPreviewGridProps): Promise<string> {
  const warnings: string[] = [];
  const app = createSSRApp({ render: () => h(PhotoPreviewGrid, props) });
  app.config.warnHandler = (message) => {
    warnings.push(message);
  };
  const html = await renderToString(app);
  expect(warnings).toEqual([]);
  return html;
}

describe('PhotoPreviewGrid SSR', () => {
  it('server-renders the photos without touching window, document or the image element', async () => {
    expect(typeof window).toBe('undefined');
    const html = await render({
      images: [
        { key: 'a', src: '/a.jpg' },
        { key: 'b', src: '/b.jpg' },
        { key: 'c', unavailable: true },
      ],
      total: 6,
    });
    expect(html.match(/<button /gu)).toHaveLength(3);
    expect(html).toContain('src="/a.jpg"');
    expect(html).toContain('loading="eager"');
    expect(html).toContain('aria-label="Open photo 1"');
    expect(html).toContain('aria-label="View all 6 photos"');
    expect(html).toContain('+3');
    expect(html).toContain('Photo unavailable');
    expect(html).toContain('--mosaic-columns:minmax(0, 0.8fr) minmax(0, 0.4fr)');
  });

  it('server-renders an empty list as an empty node', async () => {
    expect(await render({ images: [] })).toBe('<!---->');
  });
});
