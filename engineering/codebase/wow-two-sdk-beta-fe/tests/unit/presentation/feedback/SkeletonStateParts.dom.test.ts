import { afterEach, describe, expect, it } from 'vitest';
import { h, nextTick, ref } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import {
  SkeletonState,
  SkeletonStateGroup,
  SkeletonStateSlot,
  SkeletonStateText,
} from '@src/presentation/feedback/skeletonState';

const wrappers: VueWrapper[] = [];
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));

function render(isLoading: boolean, slot: () => unknown, extra: Record<string, unknown> = {}) {
  const wrapper = mount(SkeletonStateGroup, { props: { isLoading, ...extra }, slots: { default: slot } });
  wrappers.push(wrapper);
  return wrapper;
}

describe('skeleton slots keep the region shape', () => {
  it('shows the value as it is outside a loading region', () => {
    const wrapper = mount(SkeletonStateSlot, { slots: { default: () => '42%' } });
    wrappers.push(wrapper);
    expect(wrapper.text()).toBe('42%');
    expect(wrapper.classes()).not.toContain('bg-muted');
    expect(wrapper.attributes('aria-hidden')).toBeUndefined();
  });

  it('keeps labels as they are and turns only slotted values into placeholders', () => {
    const wrapper = render(true, () => [
      h('span', { class: 'label' }, 'Memory'),
      h(SkeletonStateSlot, { class: 'value' }, () => '42%'),
    ]);
    const value = wrapper.get('.value');
    expect(wrapper.get('.label').classes()).not.toContain('bg-muted');
    expect(value.text()).toBe('42%');
    expect(value.classes()).toEqual(expect.arrayContaining(['bg-muted', 'text-transparent', 'inline-block']));
    expect(value.attributes('aria-hidden')).toBe('true');
    expect(value.attributes('data-loading')).toBe('true');
  });

  it('announces the region once while it loads and clears the announcement after', async () => {
    const loading = ref(true);
    const wrapper = mount({
      setup: () => () =>
        h(SkeletonStateGroup, { isLoading: loading.value, label: 'Loading vitals' }, () => [
          h(SkeletonStateSlot, null, () => 'a'),
          h(SkeletonStateSlot, null, () => 'b'),
        ]),
    });
    wrappers.push(wrapper);
    expect(wrapper.findAll('[role="status"]')).toHaveLength(1);
    expect(wrapper.get('[role="status"]').text()).toBe('Loading vitals');
    expect(wrapper.get('[aria-busy]').attributes('aria-busy')).toBe('true');
    loading.value = false;
    await nextTick();
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    expect(wrapper.find('[data-loading]').exists()).toBe(false);
  });

  it('lets a slot override the region, and a block slot wrap block content', () => {
    const wrapper = render(true, () => [
      h(SkeletonStateSlot, { class: 'identity', isLoading: false }, () => 'vault-dev'),
      h(SkeletonStateSlot, { class: 'chart', isBlock: true, shape: 'rect' }, () => h('svg')),
    ]);
    expect(wrapper.get('.identity').classes()).not.toContain('bg-muted');
    const chart = wrapper.get('.chart');
    expect(chart.element.tagName).toBe('DIV');
    expect(chart.classes()).toEqual(expect.arrayContaining(['block', 'rounded-md', 'bg-muted']));
  });

  it('passes the region animation to blocks and slots', () => {
    const wrapper = render(
      true,
      () => [h(SkeletonState, { class: 'block-one' }), h(SkeletonStateSlot, { class: 'slot-one' }, () => 'x')],
      { animation: 'shimmer' },
    );
    expect(wrapper.get('.block-one').classes().join(' ')).toContain('motion-safe:animate-(--animate-skeleton-sweep)');
    expect(wrapper.get('.slot-one').classes().join(' ')).toContain('motion-safe:animate-(--animate-skeleton-sweep)');
    expect(wrapper.get('.block-one').classes()).not.toContain('motion-safe:animate-pulse');
  });

  it('sketches a paragraph with a shorter last line', () => {
    const wrapper = mount(SkeletonStateText, { props: { lines: 3, lastLineWidth: '40%' } });
    wrappers.push(wrapper);
    const lines = [...wrapper.element.children] as HTMLElement[];
    expect(lines).toHaveLength(3);
    expect(lines[2]!.style.width).toBe('40%');
    expect(lines[0]!.getAttribute('style')).toBeNull();
  });
});
