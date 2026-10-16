import { describe, expect, it } from 'vitest';
import { h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import {
  CheckboxInput,
  EmailInput,
  Field,
  SearchInput,
  SwitchInput,
  TelInput,
  TextAreaInput,
  TextInput,
  UrlInput,
} from '@src/presentation/forms';
import { assertBooleanVModel, assertTextVModel } from '../../../support/Contract';

describe('forms — v-model round-trips', () => {
  /*
   * The text-shaped controls. Deliberately excludes the ones that transform what is typed —
   * `NumberInput`, `CurrencyInput`, `PercentInput`, `MaskedInput`, `PinInput` — because for
   * those the round-trip is a formatting contract, not a plumbing one, and belongs in the
   * per-component tests the pilot would earn rather than in a smoke sweep.
   */
  it.each([
    ['TextInput', TextInput],
    ['EmailInput', EmailInput],
    ['TelInput', TelInput],
    ['UrlInput', UrlInput],
    ['SearchInput', SearchInput],
  ] as const)('%s round-trips v-model', async (name, component) => {
    await assertTextVModel(name, component);
  });

  it('TextAreaInput round-trips v-model', async () => {
    await assertTextVModel('TextAreaInput', TextAreaInput, {}, 'textarea');
  });

  it.each([
    ['CheckboxInput', CheckboxInput],
    ['SwitchInput', SwitchInput],
  ] as const)('%s round-trips v-model', async (name, component) => {
    await assertBooleanVModel(name, component);
  });
});

describe('forms — control a11y wiring', () => {
  /*
   * `Field` wraps its slot in a `FormControlProvider` so the inner control picks up `id`,
   * `aria-describedby`, `aria-invalid`, `disabled` and `required` without hand-wiring. That
   * auto-wiring is the whole reason `Field` exists, so an input that silently stops injecting
   * would leave every consuming form unlabelled and unannounced with nothing else failing.
   */
  it('marks the inner control invalid and points it at the error text', async () => {
    const wrapper = mount({
      render: () => h(Field, { label: 'Email', error: 'Enter a valid email' }, () => h(TextInput)),
    });

    // Helper/error chrome self-registers on mount, so `describedBy` only resolves once that
    // registration has flushed back into the control's render.
    await nextTick();

    const input = wrapper.find('input');
    expect(input.attributes('aria-invalid'), 'control is not marked invalid').toBe('true');

    const describedBy = input.attributes('aria-describedby');
    expect(describedBy, 'control has no aria-describedby').toBeTruthy();

    const description = describedBy
      ?.split(/\s+/)
      .map((id) => wrapper.find(`#${id}`))
      .find((found) => found.exists());
    expect(description?.text(), 'aria-describedby points at no rendered text').toContain('Enter a valid email');

    wrapper.unmount();
  });

  it('gives the inner control an id the label points at', async () => {
    const wrapper = mount({
      render: () => h(Field, { label: 'Email' }, () => h(TextInput)),
    });
    await nextTick();

    const id = wrapper.find('input').attributes('id');
    expect(id, 'control received no generated id').toBeTruthy();
    expect(wrapper.find('label').attributes('for'), 'label does not point at the control').toBe(id);

    wrapper.unmount();
  });
});
