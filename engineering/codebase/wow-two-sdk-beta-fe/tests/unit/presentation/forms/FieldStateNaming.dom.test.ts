import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, type Component } from 'vue';
import { Temporal } from 'temporal-polyfill';
import {
  CheckboxInput,
  DatePicker,
  Field,
  SearchInput,
  SwitchInput,
  TextAreaInput,
  TextInput,
} from '@src/presentation/forms';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

function render(component: Component, props: Record<string, unknown>): VueWrapper {
  const wrapper = mount(component, { props, attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
}

function inField(fieldProps: Record<string, unknown>, component: Component, props: Record<string, unknown> = {}) {
  const wrapper = mount(
    defineComponent({ render: () => h(Field, { label: 'Name', ...fieldProps }, () => h(component, props)) }),
    { attachTo: document.body },
  );
  wrappers.push(wrapper);
  return wrapper;
}

function control(wrapper: VueWrapper): HTMLInputElement {
  return wrapper.get<HTMLInputElement>('input, textarea').element;
}

describe('owned state flags use is* names, with the legacy names as aliases', () => {
  it.each([
    ['TextInput', TextInput],
    ['TextAreaInput', TextAreaInput],
    ['SearchInput', SearchInput],
  ] as const)('%s takes isDisabled, isReadOnly and isRequired', (_, component) => {
    const input = control(render(component, { isDisabled: true, isReadOnly: true, isRequired: true }));
    expect(input.disabled).toBe(true);
    expect(input.readOnly).toBe(true);
    expect(input.required).toBe(true);
  });

  it('still honours the deprecated names, and the canonical name wins over them', () => {
    const legacy = control(render(TextInput, { disabled: true, readonly: true, required: true }));
    expect([legacy.disabled, legacy.readOnly, legacy.required]).toEqual([true, true, true]);
    const both = control(render(TextInput, { isDisabled: false, disabled: true, isReadOnly: false, readOnly: true }));
    expect([both.disabled, both.readOnly]).toEqual([false, false]);
  });

  it('falls back to the surrounding Field, and an explicit flag overrides it', () => {
    expect(control(inField({ isDisabled: true, isRequired: true }, TextInput)).disabled).toBe(true);
    expect(control(inField({ isRequired: true }, TextInput)).required).toBe(true);
    expect(control(inField({ isDisabled: true }, TextInput, { isDisabled: false })).disabled).toBe(false);
  });

  it('applies to the toggles too', () => {
    expect(control(render(CheckboxInput, { isDisabled: true })).disabled).toBe(true);
    expect(control(render(SwitchInput, { disabled: true })).disabled).toBe(true);
  });
});

describe('DatePicker splits the day predicate from the disabled flag', () => {
  async function openCalendar(props: Record<string, unknown>): Promise<VueWrapper> {
    vi.spyOn(HTMLElement.prototype, 'checkVisibility').mockReturnValue(true);
    const wrapper = render(DatePicker, {
      defaultValue: Temporal.PlainDate.from('2026-09-10'),
      'aria-label': 'Date',
      ...props,
    });
    await wrapper.get('[aria-label="Date"]').trigger('click');
    for (let tick = 0; tick < 4; tick += 1) await nextTick();
    return wrapper;
  }

  function day(date: string): HTMLElement {
    return document.querySelector<HTMLElement>(`[data-date="${date}"]`)!;
  }

  it('disables the trigger with the boolean isDisabled', () => {
    const wrapper = render(DatePicker, { isDisabled: true, 'aria-label': 'Date' });
    expect(wrapper.get<HTMLButtonElement>('[aria-label="Date"]').element.disabled).toBe(true);
  });

  it('greys days from isDateDisabled, and still from the deprecated function form of isDisabled', async () => {
    const weekend = (date: Temporal.PlainDate): boolean => date.dayOfWeek >= 6;
    await openCalendar({ isDateDisabled: weekend });
    expect(day('2026-09-12').getAttribute('aria-disabled')).toBe('true');
    expect(day('2026-09-11').hasAttribute('aria-disabled')).toBe(false);
    wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
    document.body.innerHTML = '';
    await openCalendar({ isDisabled: weekend });
    expect(day('2026-09-13').getAttribute('aria-disabled')).toBe('true');
  });
});
