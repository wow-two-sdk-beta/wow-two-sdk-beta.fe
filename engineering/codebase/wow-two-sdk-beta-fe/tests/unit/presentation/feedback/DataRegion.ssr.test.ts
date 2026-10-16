import { describe, expect, it } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { DataRegion } from '@src/presentation/feedback/dataRegion';

describe('DataRegion SSR', () => {
  it('server-renders the first load busy, announced and inert', async () => {
    const html = await renderToString(
      createSSRApp({ render: () => h(DataRegion, { isFirstLoad: true }, () => h('p', 'Hosts')) }),
    );
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('role="status"');
    expect(html).toMatch(/<div[^>]*\binert\b[^>]*data-region-content/);
    expect(html).toContain('Hosts');
  });
});
