import { afterEach, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, type Component } from 'vue';
import CheckboxInput from '@src/presentation/forms/checkboxInput/CheckboxInput.vue';
import RadioInput from '@src/presentation/forms/radioInput/RadioInput.vue';
import SwitchInput from '@src/presentation/forms/switchInput/SwitchInput.vue';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
});

it.each([
  ['CheckboxInput', CheckboxInput],
  ['SwitchInput', SwitchInput],
  ['RadioInput', RadioInput],
] as const)('%s reverts the native box when its controlled owner declines the change', async (_name, control) => {
  const wrapper = mount(control as Component, { props: { modelValue: false }, attachTo: document.body });
  wrappers.push(wrapper);
  const input = wrapper.get('input').element as HTMLInputElement;
  input.checked = true;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  expect(wrapper.emitted('update:modelValue')).toEqual([[true]]);
  await nextTick();
  expect(input.checked).toBe(false);
  await wrapper.setProps({ modelValue: true });
  expect(input.checked).toBe(true);
});
