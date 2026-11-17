import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { h } from 'vue';
import { MetaInlineItem, MetaInlineItemTone, MetaInlineText } from '@src/presentation/display';

/** The text assistive technology reaches: every text node outside an `aria-hidden` subtree, whitespace collapsed. */
function spokenTextOf(node: Node): string {
  const parts: string[] = [];
  const walk = (current: Node) => {
    if (current.nodeType === Node.TEXT_NODE) {
      parts.push(current.textContent ?? '');
      return;
    }
    if (current instanceof Element && current.getAttribute('aria-hidden') === 'true') return;
    current.childNodes.forEach(walk);
  };
  walk(node);
  return parts.join(' ').replace(/\s+/gu, ' ').trim();
}

const icon = () => h('svg', { 'data-icon': '' });

describe('MetaInlineItem', () => {
  it('reads the label as the item text and hides the visible text and the icon', () => {
    const wrapper = mount(MetaInlineItem, {
      props: { label: 'posted 3 days ago' },
      slots: { icon, default: () => '3 days' },
    });
    expect(spokenTextOf(wrapper.element)).toBe('posted 3 days ago');
    expect(wrapper.text()).toContain('3 days');
    expect(wrapper.get('[data-icon]').element.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('reads the visible text when there is no label', () => {
    const wrapper = mount(MetaInlineItem, { slots: { icon, default: () => '21–23 Nov' } });
    expect(spokenTextOf(wrapper.element)).toBe('21–23 Nov');
    expect(wrapper.find('[aria-hidden="true"] [data-icon]').exists()).toBe(true);
  });

  it.each([
    [MetaInlineItemTone.Default, undefined],
    [MetaInlineItemTone.Success, 'text-success-soft-foreground'],
    [MetaInlineItemTone.Muted, 'text-muted-foreground'],
  ] as const)('maps the %s tone to its class', (tone, className) => {
    const wrapper = mount(MetaInlineItem, { props: { tone }, slots: { default: () => 'x' } });
    expect(wrapper.attributes('data-tone')).toBe(tone);
    const toneClasses = wrapper.classes().filter((name) => /^text-(success|muted)/u.test(name));
    expect(toneClasses).toEqual(className ? [className] : []);
  });

  it('keeps one line: the text truncates while the icon keeps its size', () => {
    const wrapper = mount(MetaInlineItem, { slots: { icon, default: () => '28 Dec – 3 Jan 2027' } });
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['min-w-0', 'max-w-full']));
    expect(wrapper.get('.truncate').text()).toBe('28 Dec – 3 Jan 2027');
    expect(wrapper.get('[data-icon]').element.parentElement!.classList).toContain('shrink-0');
  });

  it('merges a caller class and lays out inside MetaInlineText', () => {
    const wrapper = mount(MetaInlineText, {
      slots: {
        default: () => [
          h(MetaInlineItem, { tone: 'success', label: 'ongoing', class: 'shrink-0' }, () => 'Now'),
          h(MetaInlineItem, null, () => '3 days'),
        ],
      },
    });
    const items = wrapper.findAll('[data-tone]');
    expect(items.length).toBe(2);
    expect(items[0]!.classes()).toEqual(expect.arrayContaining(['shrink-0', 'text-success-soft-foreground']));
    expect(spokenTextOf(wrapper.element)).toBe('ongoing 3 days');
  });
});
