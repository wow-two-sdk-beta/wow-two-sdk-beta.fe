import { TextInput, TextAreaInput, PasswordInput, EmailInput } from '@src/presentation/forms';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Component } from 'vue';
import { Temporal } from 'temporal-polyfill';
import { FormControlProvider } from '@src/foundation/primitives';
import { LocaleProvider } from '@src/foundation/i18n';
import CheckboxInput from '@src/presentation/forms/checkboxInput/CheckboxInput.vue';
import RadioInput from '@src/presentation/forms/radioInput/RadioInput.vue';
import SwitchInput from '@src/presentation/forms/switchInput/SwitchInput.vue';
import SliderInput from '@src/presentation/forms/sliderInput/SliderInput.vue';
import ColorInput from '@src/presentation/forms/colorInput/ColorInput.vue';
import NumberInput from '@src/presentation/forms/numberInput/NumberInput.vue';
import TimePicker from '@src/presentation/forms/timePicker/TimePicker.vue';
import CalendarPicker from '@src/presentation/forms/calendarPicker/CalendarPicker.vue';
import ToggleInput from '@src/presentation/forms/toggleInput/ToggleInput.vue';

import {
  KeyboardShortcutPicker,
  FilePicker,
  FileUploadPicker,
  GradientPicker,
  DataGridEditor,
} from '@src/presentation/forms';

const wrappers: VueWrapper[] = [];
const track = <T extends VueWrapper>(wrapper: T): T => {
  wrappers.push(wrapper);
  return wrapper;
};
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
});

describe('native read-only controls', () => {
  it.each([CheckboxInput, RadioInput, SwitchInput])(
    'preserves checked successful controls and blocks changes',
    async (component) => {
      const wrapper = track(
        mount(
          defineComponent({
            render: () =>
              h('form', [
                h(FormControlProvider, { isReadOnly: true }, () =>
                  h(component as Component, { name: 'choice', value: 'yes', defaultValue: true }),
                ),
              ]),
          }),
          { attachTo: document.body },
        ),
      );
      const control = wrapper.findComponent(component);
      const input = wrapper.get('input');
      expect(input.attributes('aria-readonly')).toBe('true');
      expect(new FormData(wrapper.get('form').element as HTMLFormElement).get('choice')).toBe('yes');
      (input.element as HTMLInputElement).checked = false;
      await input.trigger('change');
      expect(control.emitted('update:modelValue')).toBeUndefined();
      expect((input.element as HTMLInputElement).checked).toBe(true);
    },
  );
  it('prevents range and color edits through inherited read-only state', async () => {
    for (const [component, value, changed] of [
      [SliderInput, 20, '80'],
      [ColorInput, '#ff0000', '#00ff00'],
    ] as const) {
      const wrapper = track(
        mount(
          defineComponent({
            render: () =>
              h(FormControlProvider, { isReadOnly: true }, () => h(component as Component, { defaultValue: value })),
          }),
        ),
      );
      const control = wrapper.findComponent(component);
      await wrapper.get('input').setValue(changed);
      await wrapper.get('input').trigger('blur');
      expect(control.emitted('update:modelValue')).toBeUndefined();
    }
  });
  it('resets div-based toggles through their native form anchor', async () => {
    const wrapper = track(
      mount(
        { render: () => h('form', [h(ToggleInput, { as: 'div', defaultValue: false }, () => 'Choice')]) },
        { attachTo: document.body },
      ),
    );
    await wrapper.get('[role=button]').trigger('keydown', { key: 'Enter' });
    expect(wrapper.get('[role=button]').attributes('aria-pressed')).toBe('true');
    (wrapper.get('form').element as HTMLFormElement).reset();
    await Promise.resolve();
    await nextTick();
    expect(wrapper.get('[role=button]').attributes('aria-pressed')).toBe('false');
  });
});

describe('locale-aware form labels', () => {
  it('updates default labels live while preserving explicit empty text', async () => {
    const messages = ref({
      'NumberInput.incrementLabel': 'Increase localized',
      'TimePicker.placeholder': 'Choose localized',
    });
    const wrapper = track(
      mount(
        defineComponent({
          setup: () => () =>
            h(LocaleProvider, { messages: messages.value }, () => [
              h(NumberInput),
              h(TimePicker),
              h(TimePicker, { placeholder: '' }),
            ]),
        }),
      ),
    );
    expect(wrapper.findComponent(NumberInput).find('[aria-label="Increase localized"]').exists()).toBe(true);
    const pickers = wrapper.findAllComponents(TimePicker);
    expect(pickers[0]!.get('button').text()).toBe('Choose localized');
    expect(pickers[1]!.get('button').text()).toBe('');
    messages.value = { 'NumberInput.incrementLabel': 'Increment updated', 'TimePicker.placeholder': 'Pick updated' };
    await nextTick();
    expect(wrapper.findComponent(NumberInput).find('[aria-label="Increment updated"]').exists()).toBe(true);
    expect(pickers[0]!.get('button').text()).toBe('Pick updated');
  });
  it('renders month and weekdays in the provider locale', () => {
    const wrapper = track(
      mount({
        render: () =>
          h(LocaleProvider, { locale: 'de-DE' }, () =>
            h(CalendarPicker, { defaultMonth: Temporal.PlainDate.from('2026-03-01') }),
          ),
      }),
    );
    expect(wrapper.text()).toContain('März 2026');
    expect(wrapper.text()).toContain('So');
  });
});

describe('compound control inactive lifetimes', () => {
  it('cancels shortcut recording when its Field becomes read-only', async () => {
    const readOnly = ref(false);
    const wrapper = track(
      mount(
        defineComponent({
          render: () => h(FormControlProvider, { isReadOnly: readOnly.value }, () => h(KeyboardShortcutPicker)),
        }),
        { attachTo: document.body },
      ),
    );
    await wrapper.get('button').trigger('click');
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('true');
    readOnly.value = true;
    await nextTick();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true, cancelable: true }));
    expect(wrapper.findComponent(KeyboardShortcutPicker).emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('false');
  });
  it.each([FilePicker, FileUploadPicker])('rejects file events from read-only controls', async (component) => {
    const wrapper = track(
      mount(
        defineComponent({
          render: () => h(FormControlProvider, { isReadOnly: true }, () => h(component as Component)),
        }),
      ),
    );
    await wrapper.get('input[type=file]').trigger('change');
    expect(wrapper.findComponent(component).emitted('files-change')).toBeUndefined();
    expect(wrapper.get('input[type=file]').attributes('disabled')).toBeDefined();
  });
  it('locks gradient controls while retaining the native CSS value', () => {
    const wrapper = track(
      mount(
        {
          render: () =>
            h('form', [h(FormControlProvider, { isReadOnly: true }, () => h(GradientPicker, { name: 'gradient' }))]),
        },
        { attachTo: document.body },
      ),
    );
    expect(wrapper.findAll('button').every((button) => button.attributes('disabled') !== undefined)).toBe(true);
    expect(new FormData(wrapper.get('form').element as HTMLFormElement).get('gradient')).toContain('linear-gradient');
  });
});

describe('data grid draft ownership', () => {
  const Grid = DataGridEditor<{ id: string; value: string }>;
  const rows = [
    { id: 'a', value: 'first' },
    { id: 'b', value: 'second' },
  ];
  const columns = [{ key: 'value', header: 'Value', accessor: (row: { value: string }) => row.value }];
  it('retains the logical row when rows reorder and commits only once', async () => {
    const wrapper = track(
      mount(Grid, { props: { rows, columns, rowKey: (row: { id: string }) => row.id }, attachTo: document.body }),
    );
    await wrapper.findAll('td')[0]!.trigger('click');
    await wrapper.get('input').setValue('edited');
    await wrapper.setProps({ rows: [rows[1]!, rows[0]!] });
    await wrapper.get('input').trigger('keydown', { key: 'Enter' });
    await nextTick();
    expect(wrapper.emitted('row-change')).toEqual([[rows[0], 'value', 'edited']]);
  });
  it('cancels stale drafts after the edited value changes externally', async () => {
    const wrapper = track(mount(Grid, { props: { rows, columns, rowKey: (row: { id: string }) => row.id } }));
    await wrapper.findAll('td')[0]!.trigger('click');
    await wrapper.get('input').setValue('draft');
    await wrapper.setProps({ rows: [{ id: 'a', value: 'server update' }, rows[1]!] });
    expect(wrapper.find('input').exists()).toBe(false);
    expect(wrapper.emitted('row-change')).toBeUndefined();
  });
  it('honors inherited read-only state and ignores empty-grid navigation', async () => {
    const wrapper = track(
      mount({
        render: () =>
          h(FormControlProvider, { isReadOnly: true }, () =>
            h(Grid, { rows, columns, rowKey: (row: { id: string }) => row.id }),
          ),
      }),
    );
    await wrapper.get('td').trigger('click');
    expect(wrapper.find('input').exists()).toBe(false);
    const empty = track(mount(Grid, { props: { rows: [], columns: [], rowKey: () => '' } }));
    await empty.get('table').trigger('keydown', { key: 'End' });
    expect(empty.get('table').attributes('aria-activedescendant')).toBeUndefined();
  });
});

describe('typed native attribute fallthrough', () => {
  it.each([TextInput, NumberInput, TextAreaInput, PasswordInput, EmailInput])(
    'retains native blur and form attrs at runtime',
    async (component) => {
      const onBlur = vi.fn();
      const wrapper = track(
        mount(component as Component, { attrs: { onBlur, name: 'field', form: 'editor', autocomplete: 'off' } }),
      );
      const input = wrapper.get('input,textarea');
      expect(input.attributes('name')).toBe('field');
      expect(input.attributes('form')).toBe('editor');
      expect(input.attributes('autocomplete')).toBe('off');
      await input.trigger('blur');
      expect(onBlur).toHaveBeenCalledOnce();
    },
  );
});
