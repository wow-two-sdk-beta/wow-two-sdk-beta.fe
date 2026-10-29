import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import { ListGroup, ListGroupItem } from '@src/presentation/display';
import { DataRegion } from '@src/presentation/feedback';

describe('ListGroupItem selectable rows', () => {
  it('stays a plain row without onSelect', () => {
    const wrapper = mount(ListGroupItem, { slots: { default: 'Ada' } });
    expect(wrapper.find('button').exists()).toBe(false);
    expect(wrapper.text()).toBe('Ada');
  });

  it('renders the second line under the content', () => {
    const wrapper = mount(ListGroupItem, { props: { description: 'Shop, dev' }, slots: { default: 'shop-dev' } });
    expect(wrapper.get('[data-description]').text()).toBe('Shop, dev');
    expect(wrapper.get('[data-description]').classes()).toContain('text-muted-foreground');
  });

  it('turns the row into a button that selects it and marks the current one', async () => {
    const onSelect = vi.fn();
    const wrapper = mount(ListGroup, {
      slots: {
        default: () => [
          h(ListGroupItem, { onSelect, description: 'Shop, dev' }, () => 'shop-dev'),
          h(ListGroupItem, { onSelect: () => {}, isSelected: true, description: 'Shop, prod' }, () => 'shop-prod'),
        ],
      },
    });
    const [first, second] = wrapper.findAll('button');
    expect(first!.attributes('type')).toBe('button');
    expect(first!.attributes('aria-current')).toBeUndefined();
    expect(second!.attributes('aria-current')).toBe('true');
    expect(second!.classes()).toContain('bg-primary-soft');
    expect(second!.get('[data-description]').classes()).toContain('text-primary-soft-foreground');
    await first!.trigger('click');
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('binds @select', async () => {
    const onSelect = vi.fn();
    const wrapper = mount(ListGroupItem, { attrs: { onSelect }, slots: { default: 'row' } });
    await wrapper.get('button').trigger('click');
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('marks a plain current row on the item', () => {
    const wrapper = mount(ListGroupItem, { props: { isSelected: true }, slots: { default: 'row' } });
    expect(wrapper.attributes('aria-current')).toBe('true');
  });

  it('draws placeholder rows that select nothing during a first load', async () => {
    const onSelect = vi.fn();
    const wrapper = mount(DataRegion, {
      props: { isFirstLoad: true, hasData: false },
      slots: {
        default: () => h(ListGroup, null, () => [h(ListGroupItem, { onSelect, description: '' }, () => '')]),
      },
    });
    const row = wrapper.get('li');
    expect(row.attributes('data-skeleton')).toBe('true');
    expect(row.find('[data-description]').exists()).toBe(true);
    await wrapper.get('button').trigger('click');
    expect(onSelect).not.toHaveBeenCalled();
  });
});
