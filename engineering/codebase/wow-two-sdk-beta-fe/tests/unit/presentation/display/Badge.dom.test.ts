import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { h } from 'vue';
import { Badge } from '@src/presentation/display';

describe('Badge status form', () => {
  it('keeps a plain label unwrapped, so existing badges render as before', () => {
    const wrapper = mount(Badge, { slots: { default: 'Beta' } });
    expect(wrapper.element.children).toHaveLength(0);
    expect(wrapper.text()).toBe('Beta');
    expect(wrapper.classes()).not.toContain('border');
  });

  it('puts a decorative leading icon before the label and the detail after it', () => {
    const wrapper = mount(Badge, {
      props: { variant: 'warning', isOutlined: true, detail: 'v1.4.2' },
      slots: { default: 'prod', leading: () => h('svg', { 'data-icon': 'alert' }) },
    });
    const parts = [...wrapper.element.children] as HTMLElement[];
    expect(parts.map((part) => part.textContent)).toEqual(['', 'prod', 'v1.4.2']);
    expect(parts[0]!.getAttribute('aria-hidden')).toBe('true');
    expect(parts[0]!.querySelector('[data-icon=alert]')).not.toBeNull();
    expect(parts[2]!.hasAttribute('data-detail')).toBe(true);
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['border', 'border-warning/45', 'whitespace-nowrap']));
  });

  it('mutes the detail on a neutral fill and keeps the tint on a tinted one', () => {
    const neutral = mount(Badge, { props: { variant: 'surface', detail: '3' }, slots: { default: 'Hosts' } });
    const tinted = mount(Badge, { props: { variant: 'danger', detail: 'failed' }, slots: { default: 'dev' } });
    expect(neutral.get('[data-detail]').classes()).toContain('text-muted-foreground');
    expect(tinted.get('[data-detail]').classes()).not.toContain('text-muted-foreground');
  });

  it('takes the detail slot over the prop', () => {
    const wrapper = mount(Badge, {
      props: { detail: 'plain' },
      slots: { default: 'dev', detail: () => h('em', 'rich') },
    });
    expect(wrapper.get('[data-detail]').text()).toBe('rich');
  });

  it.each([
    ['dashed', 'border-dashed'],
    ['dotted', 'border-dotted'],
  ] as const)('draws a %s outline', (borderStyle, className) => {
    const wrapper = mount(Badge, {
      props: { variant: 'quiet', isOutlined: true, borderStyle },
      slots: { default: 'x' },
    });
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['border', 'border-border', className]));
  });

  it('spins only the leading icon, and holds it still under reduced motion', () => {
    const wrapper = mount(Badge, {
      props: { isSpinning: true },
      slots: { default: 'deploying', leading: () => h('svg') },
    });
    const leading = wrapper.get('[data-badge-leading]');
    expect(leading.classes()).toEqual(expect.arrayContaining(['animate-spin', 'motion-reduce:animate-none']));
    expect(wrapper.classes()).not.toContain('animate-spin');
  });

  it('tightens the start padding beside a leading icon at each size', () => {
    for (const [size, padding] of [
      ['sm', 'ps-1'],
      ['md', 'ps-1.5'],
      ['lg', 'ps-2'],
    ] as const) {
      const wrapper = mount(Badge, { props: { size }, slots: { default: 'x', leading: () => h('svg') } });
      expect(wrapper.classes()).toContain(padding);
    }
  });
});
