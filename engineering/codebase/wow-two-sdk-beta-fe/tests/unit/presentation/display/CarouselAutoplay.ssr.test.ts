import { describe, expect, it } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { Carousel } from '@src/presentation/display';

describe('Carousel autoplay SSR', () => {
  it('renders configured autoplay without touching window or starting a timer', async () => {
    expect(typeof window).toBe('undefined');
    const html = await renderToString(createSSRApp({ render: () => h(Carousel, { autoPlay: 100, slidesCount: 3 }) }));
    expect(html).toContain('Pause slides');
  });
});
