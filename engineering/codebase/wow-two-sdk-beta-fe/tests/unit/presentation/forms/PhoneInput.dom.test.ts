import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, type Component } from 'vue';
import type { AppFieldApi, AppForm } from '@src/formsEngine';
import { houseFormEngine } from '@src/formsEngine/adapters/house';
import { object, phone } from '@src/foundation/validators';
import { Field, PhoneInput } from '@src/presentation/forms';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
});

function mountPhone(props: Record<string, unknown> = {}): VueWrapper {
  const wrapper = mount(PhoneInput, { props: { name: 'phone', ...props }, attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
}

async function typeNumber(wrapper: VueWrapper, text: string): Promise<void> {
  const input = wrapper.get<HTMLInputElement>('input[type=tel]').element;
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await nextTick();
}

async function pickCountry(wrapper: VueWrapper, iso: string): Promise<void> {
  const select = wrapper.get<HTMLSelectElement>('select').element;
  select.value = iso;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  await nextTick();
}

function hidden(wrapper: VueWrapper): string {
  return wrapper.get<HTMLInputElement>('input[type=hidden][name=phone]').element.value;
}

function nationalField(wrapper: VueWrapper): HTMLInputElement {
  return wrapper.get<HTMLInputElement>('input[type=tel]').element;
}

/** Types at the caret one character at a time, as a keyboard does: the browser inserts, then fires `input`. */
async function typeKeys(input: HTMLInputElement, text: string): Promise<void> {
  input.focus();
  for (const character of text) {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    input.value = input.value.slice(0, start) + character + input.value.slice(end);
    input.setSelectionRange(start + 1, start + 1);
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: character }));
    await nextTick();
  }
}

/** Presses Backspace with a collapsed caret: the browser removes the character before it, then fires `input`. */
async function backspace(input: HTMLInputElement): Promise<void> {
  const caret = input.selectionStart!;
  input.value = input.value.slice(0, caret - 1) + input.value.slice(caret);
  input.setSelectionRange(caret - 1, caret - 1);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));
  await nextTick();
}

/** Fires `paste` with clipboard text; resolves whether the browser's own insertion may go ahead. */
async function paste(input: HTMLInputElement, text: string): Promise<boolean> {
  input.focus();
  const event = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } });
  const proceeds = input.dispatchEvent(event);
  await nextTick();
  return proceeds;
}

describe('PhoneInput', () => {
  it('joins the dial code and the digits into one E.164 value', async () => {
    const wrapper = mountPhone({ defaultCountry: 'GB' });
    await typeNumber(wrapper, '(0)20 7946-0958');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['+4402079460958']);
    expect(hidden(wrapper)).toBe('+4402079460958');
  });

  it('submits nothing for a cleared number, keeping the chosen country', async () => {
    const wrapper = mountPhone({ defaultValue: '+447911123456' });
    expect(wrapper.get<HTMLSelectElement>('select').element.value).toBe('GB');
    await typeNumber(wrapper, '');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['']);
    expect(hidden(wrapper)).toBe('');
    expect(wrapper.get<HTMLSelectElement>('select').element.value).toBe('GB');
    await pickCountry(wrapper, 'FR');
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1);
    expect(wrapper.get<HTMLSelectElement>('select').element.value).toBe('FR');
  });

  it('moves the digits to a newly picked country', async () => {
    const wrapper = mountPhone({ defaultValue: '+14155550123' });
    await pickCountry(wrapper, 'DE');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['+494155550123']);
  });

  it('keeps a shared dial code on the country the reader picked', async () => {
    const wrapper = mountPhone({ defaultCountry: 'US' });
    await pickCountry(wrapper, 'CA');
    await typeNumber(wrapper, '6045550199');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['+16045550199']);
    expect(wrapper.get<HTMLSelectElement>('select').element.value).toBe('CA');
  });

  it('reads the longest matching dial code from a value', () => {
    expect(mountPhone({ defaultValue: '+420601123456' }).get<HTMLSelectElement>('select').element.value).toBe('CZ');
    expect(mountPhone({ defaultValue: '+358401234567' }).get<HTMLSelectElement>('select').element.value).toBe('FI');
  });

  it('reads the Central Asian dial codes, a shared +7 going to the earlier country', () => {
    const isoOf = (value: string, props: Record<string, unknown> = {}): string =>
      mountPhone({ defaultValue: value, ...props }).get<HTMLSelectElement>('select').element.value;
    expect(isoOf('+998901234567')).toBe('UZ');
    expect(isoOf('+996555123456')).toBe('KG');
    expect(isoOf('+992901234567')).toBe('TJ');
    expect(isoOf('+99365123456')).toBe('TM');
    expect(isoOf('+77011234567')).toBe('RU');
    expect(isoOf('+77011234567', { countries: ['KZ', 'RU'] })).toBe('KZ');
  });

  it('lists only the given countries, in the order given', () => {
    const wrapper = mountPhone({ countries: ['KZ', 'UZ', 'XX', 'KZ'] });
    const options = wrapper.findAll('option');
    expect(options.map((o) => o.element.value)).toEqual(['KZ', 'UZ']);
    expect(options.map((o) => o.text())).toEqual(['🇰🇿 +7', '🇺🇿 +998']);
  });

  it('lists every country for a list with no known code', () => {
    expect(mountPhone({ countries: ['XX'] }).findAll('option').length).toBe(mountPhone().findAll('option').length);
  });

  it('renders one allowed country as a fixed prefix with no select', async () => {
    const wrapper = mountPhone({ countries: ['UZ'] });
    expect(wrapper.find('select').exists()).toBe(false);
    expect(wrapper.text()).toBe('🇺🇿 +998');
    await typeNumber(wrapper, '90 123-45-67');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['+998901234567']);
    expect(hidden(wrapper)).toBe('+998901234567');
  });

  it('falls back to the first allowed country when the default is not in the list', async () => {
    const wrapper = mountPhone({ countries: ['UZ', 'KZ'], defaultCountry: 'US' });
    expect(wrapper.get<HTMLSelectElement>('select').element.value).toBe('UZ');
    await typeNumber(wrapper, '901234567');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['+998901234567']);
    expect(
      mountPhone({ countries: ['UZ', 'KZ'], defaultCountry: 'KZ' }).get<HTMLSelectElement>('select').element.value,
    ).toBe('KZ');
    expect(mountPhone({ countries: ['UZ'] }).text()).toBe('🇺🇿 +998');
  });

  it('keeps the digits of a disallowed prefix under the fallback country', async () => {
    const wrapper = mountPhone({ countries: ['UZ', 'KZ'], modelValue: '+447911123456' });
    expect(wrapper.get<HTMLSelectElement>('select').element.value).toBe('UZ');
    expect(wrapper.get<HTMLInputElement>('input[type=tel]').element.value).toBe('447911123456');
    expect(hidden(wrapper)).toBe('+447911123456');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();

    const fixed = mountPhone({ countries: ['UZ'], modelValue: '+447911123456' });
    expect(fixed.find('select').exists()).toBe(false);
    expect(fixed.text()).toBe('🇺🇿 +998');
    expect(fixed.get<HTMLInputElement>('input[type=tel]').element.value).toBe('447911123456');
  });

  it('takes its id, description and locked state from a surrounding field', async () => {
    const wrapper = mount(
      { render: () => h(Field, { label: 'Phone', helper: 'Work number', isDisabled: true }, () => h(PhoneInput)) },
      { attachTo: document.body },
    );
    wrappers.push(wrapper);
    // Helper chrome self-registers on mount; the control's `aria-describedby` follows a tick later.
    await nextTick();
    const input = wrapper.get<HTMLInputElement>('input[type=tel]').element;
    const label = wrapper.get('label').element as HTMLLabelElement;
    expect(label.htmlFor).toBe(input.id);
    expect(document.getElementById(input.getAttribute('aria-describedby')!.split(' ')[0]!)?.textContent).toContain(
      'Work number',
    );
    expect(input.disabled).toBe(true);
    expect(wrapper.get<HTMLSelectElement>('select').element.disabled).toBe(true);
  });

  it('takes digits only and stops at the national length', async () => {
    const wrapper = mountPhone({ countries: ['UZ', 'KZ'] });
    const input = nationalField(wrapper);
    await typeKeys(input, '99663258234234sdfsdfsdf');
    expect(input.value).toBe('99-663-25-82');
    expect(hidden(wrapper)).toBe('+998996632582');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['+998996632582']);
  });

  it('shows the national number through the country mask while the value stays E.164', async () => {
    const wrapper = mountPhone({ defaultValue: '+998996632582' });
    expect(nationalField(wrapper).value).toBe('99-663-25-82');
    expect(nationalField(wrapper).placeholder).toBe('00-000-00-00');
    expect(hidden(wrapper)).toBe('+998996632582');
    await pickCountry(wrapper, 'US');
    expect(nationalField(wrapper).placeholder).toBe('(000) 000-0000');
    expect(nationalField(wrapper).value).toBe('(996) 632-582');
    expect(hidden(wrapper)).toBe('+1996632582');
    expect(mountPhone({ defaultCountry: 'DE' }).get<HTMLInputElement>('input[type=tel]').element.placeholder).toBe('');
    expect(mountPhone({ placeholder: 'Number' }).get<HTMLInputElement>('input[type=tel]').element.placeholder).toBe(
      'Number',
    );
  });

  it('keeps the caret after its digit and steps Backspace over a separator', async () => {
    const wrapper = mountPhone({ countries: ['UZ'] });
    const input = nationalField(wrapper);
    await typeKeys(input, '99663');
    expect(input.value).toBe('99-663');
    expect(input.selectionStart).toBe(6);

    input.setSelectionRange(3, 3);
    await backspace(input);
    expect(input.value).toBe('96-63');
    expect(input.selectionStart).toBe(1);
    expect(hidden(wrapper)).toBe('+9989663');

    await typeKeys(input, '9');
    expect(input.value).toBe('99-663');
    expect(input.selectionStart).toBe(2);
  });

  it('reads a pasted international number into its country', async () => {
    const wrapper = mountPhone({ countries: ['KZ', 'UZ'] });
    const input = nationalField(wrapper);
    expect(await paste(input, ' +998 (99) 663-25-82')).toBe(false);
    expect(wrapper.get<HTMLSelectElement>('select').element.value).toBe('UZ');
    expect(input.value).toBe('99-663-25-82');
    expect(hidden(wrapper)).toBe('+998996632582');
  });

  it('drops the dial code from the digits of a full number pasted without a plus', async () => {
    const wrapper = mountPhone({ countries: ['UZ'] });
    expect(await paste(nationalField(wrapper), '998 99 663 25 82')).toBe(false);
    expect(nationalField(wrapper).value).toBe('99-663-25-82');
    expect(hidden(wrapper)).toBe('+998996632582');
  });

  it('inserts any other paste at the caret as digits', async () => {
    const wrapper = mountPhone({ countries: ['UZ'] });
    const input = nationalField(wrapper);
    expect(await paste(input, 'tel: 99 663')).toBe(true);
    // The browser's own insertion, then its `input` event.
    input.value = 'tel: 99 663';
    input.setSelectionRange(11, 11);
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste' }));
    await nextTick();
    expect(input.value).toBe('99-663');
    expect(hidden(wrapper)).toBe('+99899663');
  });

  it('keeps a pasted number from a country outside the list as its bare digits', async () => {
    const wrapper = mountPhone({ countries: ['UZ'] });
    expect(await paste(nationalField(wrapper), '+44 7911 123456')).toBe(false);
    expect(hidden(wrapper)).toBe('+447911123456');
    expect(nationalField(wrapper).value).toBe('447911123456');
  });

  it('fires blur once, when focus leaves the whole control, and focus once on the way in', async () => {
    const outside = document.createElement('button');
    document.body.append(outside);
    const onBlur = vi.fn();
    const onFocus = vi.fn();
    const wrapper = mountPhone({ onBlur, onFocus });
    const select = wrapper.get<HTMLSelectElement>('select').element;
    const field = nationalField(wrapper);

    select.focus();
    field.focus();
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).not.toHaveBeenCalled();

    outside.focus();
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(onBlur.mock.calls[0]![0]).toBeInstanceOf(FocusEvent);

    field.focus();
    field.blur();
    expect(onFocus).toHaveBeenCalledTimes(2);
    expect(onBlur).toHaveBeenCalledTimes(2);
  });

  it('validates on blur through a form engine bound to the control', async () => {
    let form!: AppForm<{ phone: string }>;
    const Host = defineComponent({
      setup() {
        form = houseFormEngine.useAppForm<{ phone: string }>({
          defaultValues: { phone: '' },
          schema: object({ phone: phone({ countries: ['UZ'] }) }),
          validateOn: 'blur',
          onSubmit: async () => ({ ok: true as const, value: undefined }),
        });
        return () =>
          h(
            form.Field as unknown as Component,
            { name: 'phone' },
            {
              default: (field: AppFieldApi<string>) =>
                h(Field, { label: 'Phone' }, () =>
                  h(PhoneInput, {
                    modelValue: field.value,
                    'onUpdate:modelValue': (next: string) => (field.value = next),
                    onBlur: field.onBlur,
                    countries: ['UZ'],
                  }),
                ),
            },
          );
      },
    });
    const wrapper = mount(Host, { attachTo: document.body });
    wrappers.push(wrapper);
    const input = nationalField(wrapper);

    await typeKeys(input, '234');
    await flushPromises();
    expect(wrapper.find('[role=alert]').exists()).toBe(false);

    input.blur();
    await flushPromises();
    expect(wrapper.get('[role=alert]').text()).toBe('must have 9 digits after +998');
  });

  it('blocks submit with the phone rule error under the field until the number is complete', async () => {
    const onSubmit = vi.fn(async () => ({ ok: true as const, value: undefined }));
    let form!: AppForm<{ phone: string }>;
    const Host = defineComponent({
      setup() {
        form = houseFormEngine.useAppForm<{ phone: string }>({
          defaultValues: { phone: '' },
          schema: object({ phone: phone({ countries: ['UZ'] }) }),
          onSubmit,
        });
        return () =>
          h(
            form.Field as unknown as Component,
            { name: 'phone' },
            {
              default: (field: AppFieldApi<string>) =>
                h(Field, { label: 'Phone' }, () =>
                  h(PhoneInput, {
                    modelValue: field.value,
                    'onUpdate:modelValue': (next: string) => (field.value = next),
                    countries: ['UZ'],
                  }),
                ),
            },
          );
      },
    });
    const wrapper = mount(Host, { attachTo: document.body });
    wrappers.push(wrapper);
    const input = nationalField(wrapper);

    await typeKeys(input, '234234');
    expect(await form.handleSubmit()).toBe(false);
    await flushPromises();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(wrapper.get('[role=alert]').text()).toBe('must have 9 digits after +998');
    expect(input.getAttribute('aria-invalid')).toBe('true');

    await typeKeys(input, '258');
    expect(input.value).toBe('23-423-42-58');
    expect(await form.handleSubmit()).toBe(true);
    expect(onSubmit).toHaveBeenCalledWith({ phone: '+998234234258' }, expect.anything());
  });
});
