import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import SnippetText from '@src/presentation/display/snippetText/SnippetText.vue';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
});

const command = 'curl -X POST https://example.test/api \\\n  -H "Content-Type: application/json" \\\n  -d \'{}\'';

describe('SnippetText whitespace', () => {
  it("keeps a block snippet's line breaks and indentation", () => {
    const wrapper = mount(SnippetText, { props: { text: command, variant: 'block' } });
    wrappers.push(wrapper);

    const code = wrapper.get('code');
    expect(code.classes()).toContain('whitespace-pre');
    expect(code.element.textContent).toBe(command);
  });

  it('lets an inline snippet collapse whitespace like a text run', () => {
    const wrapper = mount(SnippetText, { props: { text: 'pnpm install' } });
    wrappers.push(wrapper);

    expect(wrapper.get('code').classes()).not.toContain('whitespace-pre');
  });
});
