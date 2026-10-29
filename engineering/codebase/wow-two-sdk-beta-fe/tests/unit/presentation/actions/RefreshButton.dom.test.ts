import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { LocaleProvider } from '@src/foundation/i18n';
import { RefreshButton } from '@src/presentation/actions';

describe('RefreshButton', () => {
  it('shows the refresh icon and the default label, and runs the click', async () => {
    const onClick = vi.fn();
    const wrapper = mount(RefreshButton, { attrs: { onClick } });
    const button = wrapper.get('button');
    expect(button.text()).toBe('Refresh');
    expect(button.find('svg').exists()).toBe(true);
    expect(button.attributes('aria-busy')).toBeUndefined();
    await button.trigger('click');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('keeps its label and blocks clicks while refreshing', async () => {
    const onClick = vi.fn();
    const wrapper = mount(RefreshButton, { props: { isRefreshing: true, label: 'Reload' }, attrs: { onClick } });
    const button = wrapper.get('button');
    expect(button.text()).toContain('Reload');
    expect(button.attributes('aria-busy')).toBe('true');
    await button.trigger('click');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('names the icon-only form through aria-label and title', () => {
    const wrapper = mount(RefreshButton, { props: { isIconOnly: true, label: 'Refresh hosts' } });
    const button = wrapper.get('button');
    expect(button.text()).toBe('');
    expect(button.attributes('aria-label')).toBe('Refresh hosts');
    expect(button.attributes('title')).toBe('Refresh hosts');
  });

  it('forwards Button props such as the ghost variant', () => {
    const outline = mount(RefreshButton).get('button').classes().join(' ');
    const ghost = mount(RefreshButton, { props: { variant: 'ghost' } })
      .get('button')
      .classes()
      .join(' ');
    expect(ghost).not.toBe(outline);
  });

  it('takes a localized label', () => {
    const wrapper = mount(
      defineComponent({
        render: () => h(LocaleProvider, { messages: { 'RefreshButton.label': 'Обновить' } }, () => h(RefreshButton)),
      }),
    );
    expect(wrapper.get('button').text()).toBe('Обновить');
  });
});
