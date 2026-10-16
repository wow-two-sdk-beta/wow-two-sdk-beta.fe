import { afterEach, expect, it } from 'vitest';
import { h, nextTick, type Component } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import * as forms from '@src/presentation/forms';
import * as actions from '@src/presentation/actions';
import * as display from '@src/presentation/display';
import * as overlays from '@src/presentation/overlays';
import * as nav from '@src/presentation/nav';
import * as layout from '@src/presentation/layout';

const mounted: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

it('exports one canonical name per model axis, preserving selection-item keys', () => {
  const itemKeys = new Set(['ToggleInput', 'CheckboxField', 'RadioField', 'ChoiceCard']);
  let axes = 0;
  for (const [name, value] of Object.entries({ ...forms, ...actions, ...display, ...overlays, ...nav, ...layout })) {
    if (!value || typeof value !== 'object' || !('props' in value)) continue;
    const component = value as { props: Record<string, unknown>; emits?: string[] };
    const props = component.props;
    if ('modelValue' in props) {
      axes++;
      if (!itemKeys.has(name)) expect(props, name).not.toHaveProperty('value');
      expect(props, name).not.toHaveProperty('checked');
      expect(props, name).not.toHaveProperty('isPressed');
      expect(props, name).not.toHaveProperty('defaultChecked');
      expect(props, name).not.toHaveProperty('defaultPressed');
    }
    if ('open' in props) expect(props, name).not.toHaveProperty('isOpen');
    for (const event of component.emits ?? []) {
      expect(event, name).not.toMatch(
        /^(value|open|pressed|input|editing|view|mode|page|zoom|index|sort|selection|expanded|step|sidebar-open)-change$/,
      );
    }
  }
  expect(axes).toBeGreaterThan(50);
});

it('keeps native value attributes from overriding a text model', async () => {
  const wrapper = mount(forms.TextInput, { props: { modelValue: 'owner' }, attrs: { value: 'legacy' } });
  mounted.push(wrapper);
  expect((wrapper.get('input').element as HTMLInputElement).value).toBe('owner');
  await wrapper.get('input').setValue('request');
  expect(wrapper.emitted('update:modelValue')).toEqual([['request']]);
  expect(wrapper.emitted('value-change')).toBeUndefined();
  await wrapper.setProps({ modelValue: 'external' });
  expect(wrapper.emitted('update:modelValue')).toEqual([['request']]);
});

it('seeds an inherited boolean model without coercing absence into controlled false', async () => {
  const wrapper = mount(forms.CheckboxField, { props: { label: 'Enabled', defaultValue: true } });
  mounted.push(wrapper);
  expect((wrapper.get('input').element as HTMLInputElement).checked).toBe(true);
  await wrapper.get('input').setValue(false);
  expect((wrapper.get('input').element as HTMLInputElement).checked).toBe(false);
});

it('uses accordion modelValue while each item retains its value key', async () => {
  const wrapper = mount(display.AccordionGroup, {
    props: { modelValue: 'a' },
    slots: {
      default: () =>
        ['a', 'b'].map((value) =>
          h(display.AccordionGroupItem, { value }, () => h(display.AccordionGroupTrigger, null, () => value)),
        ),
    },
  });
  mounted.push(wrapper);
  await wrapper.findAll('button')[1]!.trigger('click');
  expect(wrapper.emitted('update:modelValue')).toEqual([['b']]);
  expect(wrapper.emitted('value-change')).toBeUndefined();
  expect(wrapper.findAll('button')[0]!.attributes('aria-expanded')).toBe('true');
  await wrapper.setProps({ modelValue: 'b' });
  expect(wrapper.findAll('button')[1]!.attributes('aria-expanded')).toBe('true');
  expect(wrapper.emitted('update:modelValue')).toHaveLength(1);
});

it('forwards one named open request through AlertModal', async () => {
  const wrapper = mount(overlays.AlertModal, {
    props: { open: false },
    slots: { default: () => h(overlays.ModalTrigger, null, () => 'Open') },
  });
  mounted.push(wrapper);
  await wrapper.get('button').trigger('click');
  expect(wrapper.emitted('update:open')).toEqual([[true]]);
  expect(wrapper.emitted('open-change')).toBeUndefined();
  await wrapper.setProps({ open: true });
  expect(wrapper.emitted('update:open')).toHaveLength(1);
});

it('requests only the changed ColorArea axis and routes reset through the same named models', async () => {
  const wrapper = mount(
    {
      render: () =>
        h('form', null, h(forms.ColorArea, { saturation: 0.5, value: 0.5, defaultSaturation: 0.1, defaultValue: 0.2 })),
    },
    { attachTo: document.body },
  );
  mounted.push(wrapper);
  const area = wrapper.getComponent(forms.ColorArea);
  await area.get('[role=slider]').trigger('keydown', { key: 'ArrowRight' });
  expect(area.emitted('update:saturation')).toEqual([[0.51]]);
  expect(area.emitted('update:value')).toBeUndefined();
  (wrapper.get('form').element as HTMLFormElement).reset();
  await Promise.resolve();
  await nextTick();
  expect(area.emitted('update:saturation')).toEqual([[0.51], [0.1]]);
  expect(area.emitted('update:value')).toEqual([[0.2]]);
  expect(area.emitted('value-change')).toBeUndefined();
});

it('emits a selected key once rather than also emitting an option-shaped model update', async () => {
  const wrapper = mount(forms.SelectPicker as Component, {
    props: { modelValue: 'a', defaultOpen: true },
    slots: {
      default: () => [
        h(forms.SelectPickerTrigger, null, () => 'Choose'),
        h(forms.SelectPickerContent, null, () =>
          h(forms.SelectPickerItem, { itemKey: 'b', value: { extra: 'metadata' }, label: 'B' }),
        ),
      ],
    },
    attachTo: document.body,
  });
  mounted.push(wrapper);
  await nextTick();
  await wrapper.getComponent(forms.ListboxPicker).get('[role=option]').trigger('click');
  expect(wrapper.getComponent(forms.ListboxPicker).emitted('update:modelValue')).toEqual([['b']]);
  expect(wrapper.emitted('update:modelValue')).toEqual([['b']]);
  expect(wrapper.emitted('value-change')).toBeUndefined();
});
