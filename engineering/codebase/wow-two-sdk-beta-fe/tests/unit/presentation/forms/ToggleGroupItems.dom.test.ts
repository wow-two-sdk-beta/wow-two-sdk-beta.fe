import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick, type Component } from 'vue';
import { Star } from 'lucide-vue-next';
import { LocaleProvider } from '@src/foundation/i18n';
import { ToggleGroup, ToggleGroupItem, ToggleInput, type ToggleGroupOption } from '@src/presentation/forms';

const wrappers: VueWrapper[] = [];
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));

function render(component: unknown, props: Record<string, unknown>, slots?: Record<string, () => unknown>): VueWrapper {
  const wrapper = mount(component as Component, { props, slots: slots as never, attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
}

const options = (count: number): ToggleGroupOption[] => [
  { value: 'talks', label: 'Talks', count, icon: Star },
  { value: 'expos', label: 'Expos' },
];

describe('ToggleGroup options with count and icon', () => {
  it('renders the count after the label in a tabular figure and puts it in the accessible name', () => {
    const wrapper = render(ToggleGroup, { options: options(12), type: 'single' });
    const [talks, expos] = wrapper.findAll('button');
    expect(talks!.attributes('aria-label')).toBe('Talks 12');
    expect(talks!.get('[data-toggle-count]').text()).toBe('12');
    expect(talks!.get('[data-toggle-count]').classes()).toContain('tabular-nums');
    expect(talks!.text()).toBe('Talks12');
    expect(expos!.attributes('aria-label')).toBe('Expos');
    expect(expos!.find('[data-toggle-count]').exists()).toBe(false);
  });

  it('updates the count and the accessible name when the count changes', async () => {
    const wrapper = render(ToggleGroup, { options: options(12), type: 'single' });
    await wrapper.setProps({ options: options(1200) });
    const talks = wrapper.get('button');
    expect(talks.get('[data-toggle-count]').text()).toBe('1,200');
    expect(talks.attributes('aria-label')).toBe('Talks 1,200');
    await wrapper.setProps({ options: options(0) });
    expect(wrapper.get('button [data-toggle-count]').text()).toBe('0');
  });

  it('draws the icon decoratively before the label', () => {
    const wrapper = render(ToggleGroup, { options: options(3), type: 'single' });
    const talks = wrapper.get('button');
    const icon = talks.get('svg');
    expect(icon.attributes('aria-hidden')).toBe('true');
    const label = talks.get('[data-toggle-count]').element.parentElement!;
    expect(label.previousElementSibling).toBe(icon.element);
    expect(icon.element.previousElementSibling).toBeNull();
  });

  it('orders the name by the locale message', () => {
    const wrapper = mount(LocaleProvider, {
      props: { locale: 'uz', messages: { 'ToggleGroupItem.countedName': '{count} ta {label}' } },
      slots: { default: () => h(ToggleGroup as Component, { options: options(5) }) },
      attachTo: document.body,
    });
    wrappers.push(wrapper);
    expect(wrapper.get('button').attributes('aria-label')).toBe('5 ta Talks');
  });

  it('selects through the group like any item', async () => {
    const wrapper = render(ToggleGroup, { options: options(12), type: 'multi' });
    const buttons = wrapper.findAll('button');
    await buttons[0]!.trigger('click');
    await buttons[1]!.trigger('click');
    expect(wrapper.emitted('update:modelValue')).toEqual([[['talks']], [['talks', 'expos']]]);
  });

  it('keeps slot items and `options` items in one selection', async () => {
    const wrapper = render(
      ToggleGroup,
      { options: options(2), type: 'single', modelValue: 'extra' },
      {
        default: () => h(ToggleInput as Component, { value: 'extra' }, () => 'Extra'),
      },
    );
    const pressed = wrapper.findAll('button').map((button) => button.attributes('aria-pressed'));
    expect(pressed).toEqual(['false', 'false', 'true']);
  });
});

describe('ToggleGroupItem', () => {
  it('appends the count to a consumer aria-label and keeps the slot as the label', () => {
    const wrapper = render(
      ToggleGroup,
      { type: 'single' },
      {
        default: () =>
          h(ToggleGroupItem as Component, { value: 'a', count: 7, 'aria-label': 'All events' }, () => 'Everything'),
      },
    );
    const button = wrapper.get('button');
    expect(button.attributes('aria-label')).toBe('All events 7');
    expect(button.text()).toBe('Everything7');
  });

  it('leaves an item without a count untouched', async () => {
    const wrapper = render(
      ToggleGroup,
      { type: 'single' },
      { default: () => h(ToggleGroupItem as Component, { value: 'a', label: 'Plain' }) },
    );
    await nextTick();
    const button = wrapper.get('button');
    expect(button.attributes('aria-label')).toBe('Plain');
    expect(button.find('[data-toggle-count]').exists()).toBe(false);
  });
});
