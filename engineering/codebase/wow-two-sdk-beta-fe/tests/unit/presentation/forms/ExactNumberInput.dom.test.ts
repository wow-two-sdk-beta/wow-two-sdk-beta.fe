import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, shallowRef } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { ExactNumber } from '@src/foundation/numbers';
import ExactNumberInput from '@src/presentation/forms/exactNumberInput/ExactNumberInput.vue';
import Field from '@src/presentation/forms/field/Field.vue';
import { LocaleProvider } from '@src/foundation/i18n';

const wrappers: VueWrapper[] = [];
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));
const exact = (token: string) => {
  const result = ExactNumber.parse(token);
  if (!result.ok) throw new Error('Invalid fixture');
  return result.value;
};
const resetSettled = async () => {
  await Promise.resolve();
  await nextTick();
  await nextTick();
};

describe('exact decimal editing', () => {
  it('keeps draft typing separate from exact commits without losing any digits', async () => {
    const wrapper = mount(ExactNumberInput);
    wrappers.push(wrapper);
    const input = wrapper.get('input');
    const token = '9223372036854775807.123456789012345678901234567890';
    await input.setValue(token);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    await input.trigger('blur');
    const committed = wrapper.emitted('update:modelValue')![0]![0];
    expect(ExactNumber.isExactNumber(committed)).toBe(true);
    expect(String(committed)).toBe(token);
    expect((input.element as HTMLInputElement).value).toBe(token);
  });

  it('preserves malformed drafts and reports validity without corrupting the model', async () => {
    const wrapper = mount(ExactNumberInput, { props: { defaultValue: exact('12.5') } });
    wrappers.push(wrapper);
    const input = wrapper.get('input');
    await input.setValue('-');
    await input.trigger('blur');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.emitted('invalid')![0]![1]).toBe('-');
    expect((input.element as HTMLInputElement).value).toBe('-');
    expect((input.element as HTMLInputElement).validity.customError).toBe(true);
    expect(input.attributes('aria-invalid')).toBe('true');
    await input.trigger('keydown', { key: 'Escape' });
    expect((input.element as HTMLInputElement).value).toBe('12.5');
    expect((input.element as HTMLInputElement).validity.customError).toBe(false);
  });

  it('commits on Enter, suppresses duplicate blur commits, and supports clearing', async () => {
    const wrapper = mount(ExactNumberInput);
    wrappers.push(wrapper);
    const input = wrapper.get('input');
    await input.setValue('1.25e3');
    await input.trigger('keydown', { key: 'Enter' });
    await input.trigger('blur');
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1);
    await input.setValue('');
    await input.trigger('blur');
    expect(wrapper.emitted('update:modelValue')![1]).toEqual([null]);
  });

  it('lets external model changes replace dirty drafts without emitting intent', async () => {
    const wrapper = mount(ExactNumberInput, { props: { modelValue: exact('1') } });
    wrappers.push(wrapper);
    await wrapper.get('input').setValue('draft');
    await wrapper.setProps({ modelValue: exact('2') });
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('2');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    await wrapper.get('input').setValue('3');
    await wrapper.get('input').trigger('blur');
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('2');
  });

  it('honors accepted controlled commits', async () => {
    const value = shallowRef<ExactNumber | null>(exact('1'));
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(ExactNumberInput, {
            modelValue: value.value,
            'onUpdate:modelValue': (next) => {
              value.value = next;
            },
          }),
      }),
    );
    wrappers.push(wrapper);
    await wrapper.get('input').setValue('2');
    await wrapper.get('input').trigger('blur');
    expect(value.value?.toString()).toBe('2');
  });

  it('inherits Field flags, descriptive wiring and native form attributes', async () => {
    const wrapper = mount(Field, {
      props: { label: 'Amount', helper: 'Exact decimal', isRequired: true, isReadOnly: true },
      slots: { default: () => h(ExactNumberInput, { defaultValue: exact('10'), name: 'amount', form: 'external' }) },
    });
    wrappers.push(wrapper);
    await nextTick();
    const input = wrapper.get('input');
    expect(input.attributes('id')).toBe(wrapper.get('label').attributes('for'));
    expect(input.attributes('aria-describedby')).toBeTruthy();
    expect(input.attributes('required')).toBeDefined();
    expect(input.attributes('readonly')).toBeDefined();
    expect(input.attributes('name')).toBe('amount');
    expect(input.attributes('form')).toBe('external');
    await input.setValue('20');
    await input.trigger('blur');
    expect(wrapper.findComponent(ExactNumberInput).emitted('update:modelValue')).toBeUndefined();
    expect((input.element as HTMLInputElement).value).toBe('10');
  });

  it('resets invalid drafts to the native form seed and respects cancelled resets', async () => {
    const wrapper = mount(
      { render: () => h('form', null, h(ExactNumberInput, { defaultValue: exact('5') })) },
      { attachTo: document.body },
    );
    wrappers.push(wrapper);
    const input = wrapper.get('input');
    await input.setValue('invalid');
    await input.trigger('blur');
    const form = wrapper.get('form').element as HTMLFormElement;
    form.reset();
    await resetSettled();
    expect((input.element as HTMLInputElement).value).toBe('5');
    expect((input.element as HTMLInputElement).validity.customError).toBe(false);
    await input.setValue('-');
    form.addEventListener('reset', (event) => event.preventDefault(), { once: true });
    form.reset();
    await resetSettled();
    expect((input.element as HTMLInputElement).value).toBe('-');
  });

  it('defers IME Enter commits until composition finishes and uses localized validity text', async () => {
    const wrapper = mount(LocaleProvider, {
      props: { messages: { 'ExactNumberInput.invalidMessage': 'Translated error' } },
      slots: { default: () => h(ExactNumberInput) },
    });
    wrappers.push(wrapper);
    const input = wrapper.get('input');
    await input.trigger('compositionstart');
    await input.setValue('1');
    await input.trigger('keydown', { key: 'Enter', isComposing: true });
    expect(wrapper.findComponent(ExactNumberInput).emitted('update:modelValue')).toBeUndefined();
    await input.trigger('compositionend');
    await input.trigger('keydown', { key: 'Enter' });
    expect(wrapper.findComponent(ExactNumberInput).emitted('update:modelValue')).toHaveLength(1);
    await input.setValue('1,5');
    await input.trigger('blur');
    expect((input.element as HTMLInputElement).validationMessage).toBe('Translated error');
  });
});
