import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
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
});
