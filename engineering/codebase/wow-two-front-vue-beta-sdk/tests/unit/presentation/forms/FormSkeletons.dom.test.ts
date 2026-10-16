import { afterEach, describe, expect, it } from 'vitest';
import { h, type Component, type VNode } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { DataRegion } from '@src/presentation/feedback/dataRegion';
import {
  CheckboxInput,
  Field,
  RadioInput,
  SelectPicker,
  SelectPickerContent,
  SelectPickerItem,
  SelectPickerTrigger,
  SelectPickerValue,
  SwitchInput,
  TextAreaInput,
  TextInput,
  ToggleGroup,
  ToggleInput,
} from '@src/presentation/forms';
import { TabsGroup, TabsGroupList, TabsGroupTab } from '@src/presentation/display';

const wrappers: VueWrapper[] = [];
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));

function inRegion(content: () => VNode | VNode[], isFirstLoad = true): VueWrapper {
  const wrapper = mount(DataRegion, { props: { isFirstLoad }, slots: { default: content } });
  wrappers.push(wrapper);
  return wrapper;
}

function isInert(element: Element): boolean {
  return element.hasAttribute('inert');
}

describe('text controls keep their box', () => {
  it.each([
    ['TextInput', TextInput, 'input'],
    ['TextAreaInput', TextAreaInput, 'textarea'],
  ] as const)('%s keeps its element, masks its value and goes inert', (_, component, tag) => {
    const wrapper = inRegion(() => h(component as Component, { class: 'control', modelValue: 'web-01' }));
    const control = wrapper.get('.control');
    expect(control.element.tagName.toLowerCase()).toBe(tag);
    expect(control.attributes('data-skeleton')).toBe('true');
    expect(isInert(control.element)).toBe(true);
    expect(control.classes()).toEqual(
      expect.arrayContaining(['rounded-md', 'bg-muted', 'border-transparent', 'text-transparent']),
    );
    expect(control.classes()).not.toContain('bg-field');
    expect((control.element as HTMLInputElement).value).toBe('web-01');
  });

  it('keeps an explicit control override over the region', () => {
    const wrapper = inRegion(() => h(TextInput, { class: 'control', isSkeleton: false }));
    expect(wrapper.get('.control').attributes('data-skeleton')).toBeUndefined();
    expect(isInert(wrapper.get('.control').element)).toBe(false);
  });

  it('turns a select trigger into its own placeholder and drops the clear control', () => {
    const wrapper = inRegion(() =>
      h(SelectPicker as Component, { defaultValue: 'a', isClearable: true }, () => [
        h(SelectPickerTrigger, { class: 'trigger', 'aria-label': 'Kind' }, () => h(SelectPickerValue)),
        h(SelectPickerContent, null, () => h(SelectPickerItem, { itemKey: 'a', value: 'a', label: 'All' })),
      ]),
    );
    const trigger = wrapper.get('.trigger');
    expect(trigger.classes()).toEqual(expect.arrayContaining(['bg-muted', 'border-transparent']));
    expect(isInert(trigger.element.closest('[data-skeleton]')!)).toBe(true);
    expect(wrapper.findAll('button')).toHaveLength(1);
  });
});

describe('toggles keep their own shape', () => {
  it.each([
    ['SwitchInput', SwitchInput, 'rounded-full'],
    ['CheckboxInput', CheckboxInput, 'rounded-sm'],
    ['RadioInput', RadioInput, 'rounded-full'],
  ] as const)('%s keeps its visual box as the placeholder', (_, component, radius) => {
    const wrapper = inRegion(() => h(component as Component, { class: 'toggle', modelValue: true }));
    const root = wrapper.get('.toggle');
    expect(root.attributes('data-skeleton')).toBe('true');
    expect(isInert(root.element)).toBe(true);
    const visual = root.get('span[aria-hidden="true"]');
    expect(visual.classes()).toEqual(expect.arrayContaining([radius, 'bg-muted', 'border-transparent']));
    expect(visual.classes().some((name) => name.startsWith('peer-checked:'))).toBe(false);
  });
});

describe('composite controls switch every part', () => {
  it('draws a field label, control and helper as skeletons from one flag', () => {
    const wrapper = mount(Field, {
      props: { label: 'Host name', helper: 'Lowercase, no spaces.', isSkeleton: true },
      slots: { default: () => h(TextInput, { class: 'control' }) },
    });
    wrappers.push(wrapper);
    expect(wrapper.get('[aria-busy]').attributes('data-skeleton')).toBe('true');
    expect(wrapper.get('label').attributes('data-skeleton')).toBe('true');
    expect(wrapper.get('label [data-skeleton-line]').text()).toBe('Host name');
    expect(wrapper.get('p [data-skeleton-line]').text()).toBe('Lowercase, no spaces.');
    expect(wrapper.get('.control').attributes('data-skeleton')).toBe('true');
  });

  it('keeps toggle segments and draws their labels as bars', () => {
    const wrapper = inRegion(() =>
      h(ToggleGroup as Component, { variant: 'segmented', modelValue: 'day', class: 'group' }, () => [
        h(ToggleInput, { value: 'day', class: 'segment' }, () => 'Day'),
        h(ToggleInput, { value: 'week', class: 'segment' }, () => 'Week'),
      ]),
    );
    const segments = wrapper.findAll('.segment');
    expect(segments).toHaveLength(2);
    for (const segment of segments) {
      expect(segment.attributes('data-pressed')).toBe('false');
      expect(segment.attributes('data-state')).not.toBe('skeleton');
      expect(isInert(segment.element)).toBe(true);
      expect(segment.find('[data-skeleton-line]').exists()).toBe(true);
    }
    expect(wrapper.get('.group').classes()).toContain('[&>*]:bg-background!');
  });

  it('keeps tabs and hides the active underline', () => {
    const wrapper = mount(TabsGroup, {
      props: { modelValue: 'a', isSkeleton: true },
      slots: {
        default: () =>
          h(TabsGroupList, null, () => [
            h(TabsGroupTab, { value: 'a', class: 'tab' }, () => 'Overview'),
            h(TabsGroupTab, { value: 'b', class: 'tab' }, () => 'Logs'),
          ]),
      },
    });
    wrappers.push(wrapper);
    const tab = wrapper.get('.tab');
    expect(tab.attributes('data-skeleton')).toBe('true');
    expect(isInert(tab.element)).toBe(true);
    expect(tab.get('[data-skeleton-line]').text()).toBe('Overview');
    expect(tab.classes()).toContain('data-[state=active]:border-transparent');
  });
});
