import { describe, expect, it } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { AiBrandMark } from '@src/domain/aiBrands';
import { aiBrandsCases } from './AiBrandsCases';
import { assertRendersOnServer } from '../../../support/Smoke';

describe('domain/aiBrands — server render', () => {
  for (const testCase of aiBrandsCases) {
    it(`${testCase.name} server-renders`, async () => {
      await assertRendersOnServer(testCase);
    });
  }

  it('renders the drawn mark and the chip as markup, with no placeholder left', async () => {
    const drawn = await renderToString(
      createSSRApp({ render: () => h(AiBrandMark, { brand: 'gemini', label: 'Gemini' }) }),
    );
    expect(drawn).toContain('<svg');
    expect(drawn).toContain('data-ai-brand="gemini"');
    expect(drawn).toContain('<linearGradient');
    expect(drawn).not.toContain('@@ID@@');

    const chip = await renderToString(createSSRApp({ render: () => h(AiBrandMark, { provider: 'acme' }) }));
    expect(chip).toContain('data-ai-brand="unknown"');
    expect(chip).toContain('<svg');
  });

  it('gives two marks in one server render different gradient ids', async () => {
    const html = await renderToString(
      createSSRApp({
        render: () => h('div', [h(AiBrandMark, { brand: 'gemini' }), h(AiBrandMark, { brand: 'gemini' })]),
      }),
    );
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    expect(ids).toHaveLength(6);
    expect(new Set(ids).size).toBe(6);
  });
});
