import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick, type Component } from 'vue';
import {
  CheckboxField,
  ChoiceCard,
  CurrencyInput,
  Field,
  PercentInput,
  RadioField,
  SwitchField,
} from '@src/presentation/forms';

/*
 * The wrappers forward their props to an inner input. Vue casts an absent `boolean` prop to `false`, so a wrapper
 * that does not default its inherited flags to `undefined` forwards `false` for every flag nobody set — which
 * outranks the surrounding Field and pins `modelValue` to a controlled `false`.
 */

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
});

function render(component: Component, props: Record<string, unknown> = {}): VueWrapper {
  const wrapper = mount(component, { props, attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
}

function inField(control: Component, props: Record<string, unknown> = {}): HTMLInputElement {
  const wrapper = mount(
    { render: () => h(Field, { label: 'Setting', isDisabled: true, isRequired: true }, () => h(control, props)) },
    { attachTo: document.body },
  );
  wrappers.push(wrapper);
  return wrapper.get<HTMLInputElement>('input:not([type=hidden])').element;
}

describe('boolean field wrappers', () => {
  it.each([
    ['SwitchField', SwitchField],
    ['CheckboxField', CheckboxField],
  ] as const)('%s toggles uncontrolled and honours its default', async (_, component) => {
    const plain = render(component, { label: 'Alerts' }).get<HTMLInputElement>('input').element;
    plain.click();
    await nextTick();
    expect(plain.checked).toBe(true);
    expect(
      render(component, { label: 'Alerts', defaultValue: true }).get<HTMLInputElement>('input').element.checked,
    ).toBe(true);
  });

  it('hands a v-model change from a controlled switch field to the owner', async () => {
    // The listener rides the attrs through to the inner input — the wrapper declares no emit of its own.
    const onUpdate = vi.fn();
    const wrapper = render(SwitchField, { label: 'Alerts', modelValue: false, 'onUpdate:modelValue': onUpdate });
    wrapper.get<HTMLInputElement>('input').element.click();
    await nextTick();
    expect(onUpdate).toHaveBeenCalledWith(true);
  });
});

describe('wrappers inside a Field', () => {
  it.each([
    ['SwitchField', SwitchField, { label: 'Alerts' }],
    ['CheckboxField', CheckboxField, { label: 'Terms' }],
    ['RadioField', RadioField, { label: 'Email', value: 'email' }],
    ['ChoiceCard', ChoiceCard, { label: 'Pro', value: 'pro' }],
    ['PercentInput', PercentInput, {}],
    ['CurrencyInput', CurrencyInput, {}],
  ] as const)('%s takes the field disabled and required states', (_, component, props) => {
    const input = inField(component as Component, props);
    expect(input.disabled).toBe(true);
    expect(input.required).toBe(true);
  });

  it('lets an explicit flag outrank the field', () => {
    const input = inField(SwitchField, { label: 'Alerts', isDisabled: false, isRequired: false });
    expect(input.disabled).toBe(false);
    expect(input.required).toBe(false);
  });
});
