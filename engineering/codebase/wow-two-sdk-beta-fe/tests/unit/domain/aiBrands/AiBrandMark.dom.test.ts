import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { AiBrandMark, type AiBrandMarkProps } from '@src/domain/aiBrands';
import { aiBrandsCases } from './AiBrandsCases';
import { assertMounts } from '../../../support/Smoke';

/** Mounts every mark in one app: `useId` counts per app, so ids are only comparable inside one. */
function mountTogether(...marks: Array<Record<string, unknown>>) {
  return mount(
    defineComponent({
      render: () =>
        h(
          'div',
          marks.map((props) => h(AiBrandMark, props)),
        ),
    }),
  );
}

describe('domain/aiBrands — mounts', () => {
  for (const testCase of aiBrandsCases) {
    it(`${testCase.name} mounts`, async () => {
      await assertMounts(testCase);
    });
  }
});

describe('AiBrandMark — drawn marks', () => {
  it('draws the color variant at 20 px by default, in the brand colors', () => {
    const wrapper = mount(AiBrandMark, { props: { brand: 'claude' } });
    const svg = wrapper.get('svg');
    expect(svg.attributes('width')).toBe('20');
    expect(svg.attributes('height')).toBe('20');
    expect(svg.attributes('viewBox')).toBe('0 0 24 24');
    expect(svg.attributes('data-ai-brand')).toBe('claude');
    expect(svg.attributes('data-variant')).toBe('color');
    expect(svg.attributes('fill')).toBeUndefined();
    expect(svg.get('path').attributes('fill')).toMatch(/^#[0-9a-f]{6}$/i);
    wrapper.unmount();
  });

  it('draws the mono variant with currentColor and no color of its own', () => {
    const wrapper = mount(AiBrandMark, { props: { brand: 'claude', variant: 'mono', size: 32 } });
    const svg = wrapper.get('svg');
    expect(svg.attributes('width')).toBe('32');
    expect(svg.attributes('data-variant')).toBe('mono');
    expect(svg.attributes('fill')).toBe('currentColor');
    expect(svg.html()).not.toMatch(/fill="#/);
    wrapper.unmount();
  });

  it('draws the mono mark under `color` for a brand the source has no color mark for', () => {
    const wrapper = mount(AiBrandMark, { props: { brand: 'openai' } });
    const svg = wrapper.get('svg');
    expect(svg.attributes('data-variant')).toBe('mono');
    expect(svg.attributes('fill')).toBe('currentColor');
    wrapper.unmount();
  });

  it('draws every brand in both variants without leaving a placeholder behind', () => {
    for (const brand of [
      'claude',
      'anthropic',
      'openai',
      'chatgpt',
      'gemini',
      'google',
      'meta',
      'mistral',
      'deepseek',
      'qwen',
      'grok',
      'xai',
      'groq',
      'ollama',
      'openrouter',
      'cohere',
      'perplexity',
      'azure',
    ] as const) {
      for (const variant of ['color', 'mono'] as const) {
        const wrapper = mount(AiBrandMark, { props: { brand, variant } });
        expect(wrapper.find('svg > path, svg > g, svg > defs').exists(), `${brand} ${variant}`).toBe(true);
        expect(wrapper.html(), `${brand} ${variant}`).not.toContain('@@ID@@');
        wrapper.unmount();
      }
    }
  });

  it('merges a caller class and forwards other attributes', () => {
    const wrapper = mount(AiBrandMark, {
      props: { brand: 'gemini' },
      attrs: { class: 'size-8', 'data-testid': 'mark' },
    });
    const svg = wrapper.get('svg');
    expect(svg.classes()).toEqual(expect.arrayContaining(['size-8', 'shrink-0']));
    expect(svg.attributes('data-testid')).toBe('mark');
    wrapper.unmount();
  });
});

describe('AiBrandMark — which brand', () => {
  it('resolves the brand from the model, then the provider', () => {
    const byModel = mount(AiBrandMark, { props: { provider: 'groq', model: 'llama-3.3-70b-versatile' } });
    expect(byModel.get('svg').attributes('data-ai-brand')).toBe('meta');
    byModel.unmount();

    const byProvider = mount(AiBrandMark, { props: { provider: 'Anthropic', model: 'house-model-7' } });
    expect(byProvider.get('svg').attributes('data-ai-brand')).toBe('anthropic');
    byProvider.unmount();
  });

  it('lets `brand` win over provider and model, and `null` force the chip', () => {
    const named = mount(AiBrandMark, { props: { brand: 'google', provider: 'anthropic', model: 'claude-haiku-5-5' } });
    expect(named.get('svg').attributes('data-ai-brand')).toBe('google');
    named.unmount();

    const forced = mount(AiBrandMark, { props: { brand: null, provider: 'anthropic' } });
    expect(forced.find('svg[data-ai-brand]').exists()).toBe(false);
    expect(forced.get('span').attributes('data-ai-brand')).toBe('unknown');
    forced.unmount();
  });

  it('redraws when the model changes', async () => {
    const wrapper = mount(AiBrandMark, { props: { model: 'claude-haiku-5-5' } });
    expect(wrapper.get('svg').attributes('data-ai-brand')).toBe('claude');
    await wrapper.setProps({ model: 'gemini-2.5-flash' });
    expect(wrapper.get('svg').attributes('data-ai-brand')).toBe('gemini');
    await wrapper.setProps({ model: 'house-model-7' });
    expect(wrapper.find('svg[data-ai-brand]').exists()).toBe(false);
    expect(wrapper.get('span').attributes('data-ai-brand')).toBe('unknown');
    wrapper.unmount();
  });
});

describe('AiBrandMark — the neutral chip', () => {
  it('draws a muted circle with a glyph for an unknown brand, never an empty box', () => {
    const wrapper = mount(AiBrandMark, { props: { provider: 'acme', size: 30 } });
    const chip = wrapper.get('span');
    expect(chip.attributes('data-ai-brand')).toBe('unknown');
    expect(chip.classes()).toEqual(expect.arrayContaining(['rounded-full', 'bg-muted', 'text-muted-foreground']));
    expect(chip.attributes('style')).toContain('width: 30px');
    expect(chip.attributes('style')).toContain('height: 30px');
    const glyph = chip.get('svg');
    expect(glyph.attributes('width')).toBe('18');
    expect(glyph.attributes('aria-hidden')).toBe('true');
    wrapper.unmount();
  });

  it('draws the chip when nothing names a brand', () => {
    const wrapper = mount(AiBrandMark);
    expect(wrapper.get('span').element.children.length).toBeGreaterThan(0);
    wrapper.unmount();
  });
});

describe('AiBrandMark — accessible name', () => {
  it('is decorative without a label', () => {
    const unnamed: AiBrandMarkProps[] = [{ brand: 'claude' }, { provider: 'acme' }];
    for (const props of unnamed) {
      const wrapper = mount(AiBrandMark, { props });
      const root = wrapper.element as HTMLElement;
      expect(root.getAttribute('aria-hidden')).toBe('true');
      expect(root.getAttribute('role')).toBeNull();
      expect(root.getAttribute('aria-label')).toBeNull();
      wrapper.unmount();
    }
  });

  it('is an image named by the label, on a drawn mark and on the chip', () => {
    const named: AiBrandMarkProps[] = [
      { brand: 'claude', label: 'Claude Haiku 5.5' },
      { provider: 'acme', label: 'Acme model' },
    ];
    for (const props of named) {
      const wrapper = mount(AiBrandMark, { props });
      const root = wrapper.element as HTMLElement;
      expect(root.getAttribute('role')).toBe('img');
      expect(root.getAttribute('aria-label')).toBe(props.label);
      expect(root.getAttribute('aria-hidden')).toBeNull();
      wrapper.unmount();
    }
  });

  it('treats an empty label as no label', () => {
    const wrapper = mount(AiBrandMark, { props: { brand: 'claude', label: '' } });
    expect(wrapper.get('svg').attributes('aria-hidden')).toBe('true');
    expect(wrapper.get('svg').attributes('role')).toBeUndefined();
    wrapper.unmount();
  });
});

describe('AiBrandMark — gradient ids', () => {
  /** The ids a mark defines, and whether every `url(#…)` it holds points at one of them. */
  function gradientsOf(svg: Element): { ids: string[]; references: string[] } {
    return {
      ids: [...svg.querySelectorAll('[id]')].map((node) => node.id),
      references: [...svg.outerHTML.matchAll(/url\(#([^)]+)\)/g)].map((match) => match[1]!),
    };
  }

  it('gives two marks of one brand on a page ids that never meet', () => {
    const wrapper = mountTogether({ brand: 'gemini' }, { brand: 'gemini' });
    const [first, second] = wrapper.findAll('svg').map((svg) => gradientsOf(svg.element));
    expect(first!.ids).toHaveLength(3);
    expect(second!.ids).toHaveLength(3);
    expect(new Set([...first!.ids, ...second!.ids]).size).toBe(6);
    wrapper.unmount();
  });

  it('points each mark’s url(#…) references at its own ids', () => {
    const wrapper = mountTogether({ brand: 'gemini' }, { brand: 'meta' }, { brand: 'gemini', variant: 'mono' });
    const marks = wrapper.findAll('svg').map((svg) => gradientsOf(svg.element));
    const all = marks.flatMap((mark) => mark.ids);
    expect(new Set(all).size).toBe(all.length);
    for (const mark of marks) {
      expect(mark.references.length).toBeGreaterThanOrEqual(0);
      for (const reference of mark.references) expect(mark.ids).toContain(reference);
    }
    expect(marks[0]!.references.length).toBeGreaterThan(0);
    expect(marks[1]!.ids.length).toBe(13);
    expect(marks[2]!.ids).toEqual([]);
    wrapper.unmount();
  });

  it('keeps the id stable across a re-render of the same instance', async () => {
    const wrapper = mount(AiBrandMark, { props: { brand: 'gemini', size: 20 } });
    const before = gradientsOf(wrapper.get('svg').element).ids;
    await wrapper.setProps({ size: 40 });
    expect(gradientsOf(wrapper.get('svg').element).ids).toEqual(before);
    wrapper.unmount();
  });

  it('puts no placeholder or foreign prefix in an id', () => {
    const wrapper = mount(AiBrandMark, { props: { brand: 'azure' } });
    for (const id of gradientsOf(wrapper.get('svg').element).ids) expect(id).toMatch(/^[\w-]+$/);
    expect(wrapper.html()).not.toContain('@@');
    wrapper.unmount();
  });
});
