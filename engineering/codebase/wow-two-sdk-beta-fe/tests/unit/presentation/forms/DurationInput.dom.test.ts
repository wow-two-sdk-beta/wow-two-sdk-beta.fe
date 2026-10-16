import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { Temporal } from 'temporal-polyfill';
import { DurationInput } from '@src/presentation/forms';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
});

function mountDuration(props: Record<string, unknown> = {}): VueWrapper {
  const wrapper = mount(DurationInput, { props, attrs: { 'aria-label': 'Length' }, attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
}

function segment(wrapper: VueWrapper, unit: string): HTMLInputElement {
  return wrapper.get<HTMLInputElement>(`input[data-unit=${unit}]`).element;
}

function emitted(wrapper: VueWrapper): Array<string | null> {
  return (wrapper.emitted('update:modelValue') ?? []).map(([duration]) =>
    duration === null ? null : String(duration),
  );
}

async function type(wrapper: VueWrapper, unit: string, text: string): Promise<void> {
  await wrapper.get(`input[data-unit=${unit}]`).setValue(text);
}

describe('DurationInput', () => {
  it('splits the preset across named segments with narrow suffixes', () => {
    const wrapper = mountDuration({
      defaultValue: Temporal.Duration.from({ minutes: 150 }),
      units: ['seconds', 'hours', 'minutes', 'hours'],
    });
    expect(wrapper.get('[role=group]').attributes('aria-label')).toBe('Length');
    const inputs = wrapper.findAll('input[data-unit]');
    expect(inputs.map((input) => input.attributes('aria-label'))).toEqual(['hours', 'minutes', 'seconds']);
    expect(inputs.map((input) => (input.element as HTMLInputElement).value)).toEqual(['2', '30', '0']);
    expect(wrapper.findAll('span[aria-hidden]').map((suffix) => suffix.text())).toEqual(['h', 'm', 's']);
  });

  it('emits a balanced duration while typing and balances the segments on blur', async () => {
    const wrapper = mountDuration();
    await type(wrapper, 'minutes', '9a0');
    expect(segment(wrapper, 'minutes').value).toBe('90');
    expect(emitted(wrapper)).toEqual(['PT1H30M']);
    expect(segment(wrapper, 'hours').value).toBe('');
    await wrapper.get('input[data-unit=minutes]').trigger('blur');
    expect([segment(wrapper, 'hours').value, segment(wrapper, 'minutes').value]).toEqual(['1', '30']);
    await type(wrapper, 'hours', '');
    await type(wrapper, 'minutes', '');
    expect(emitted(wrapper).at(-1)).toBeNull();
  });

  it('steps a unit with the arrows, rolling over and stopping at zero', async () => {
    const wrapper = mountDuration({ defaultValue: Temporal.Duration.from({ minutes: 59 }) });
    await wrapper.get('input[data-unit=minutes]').trigger('keydown', { key: 'ArrowUp' });
    expect(emitted(wrapper)).toEqual(['PT1H']);
    expect([segment(wrapper, 'hours').value, segment(wrapper, 'minutes').value]).toEqual(['1', '0']);
    await wrapper.get('input[data-unit=hours]').trigger('keydown', { key: 'ArrowDown', shiftKey: true });
    expect(emitted(wrapper).at(-1)).toBe('PT0S');
    await wrapper.get('input[data-unit=hours]').trigger('keydown', { key: 'ArrowDown' });
    expect(emitted(wrapper)).toHaveLength(2);
  });

  it('reverts a declined change on blur and ships the ISO value', async () => {
    const wrapper = mountDuration({ modelValue: Temporal.Duration.from({ hours: 1 }), name: 'length' });
    expect(wrapper.get<HTMLInputElement>('input[name=length]').element.value).toBe('PT1H');
    await type(wrapper, 'hours', '2');
    expect(emitted(wrapper)).toEqual(['PT2H']);
    await wrapper.get('input[data-unit=hours]').trigger('blur');
    expect(segment(wrapper, 'hours').value).toBe('1');
  });

  it('locks every segment while disabled or read-only', async () => {
    const disabled = mountDuration({ isDisabled: true });
    expect(disabled.findAll('input[data-unit]').every((input) => (input.element as HTMLInputElement).disabled)).toBe(
      true,
    );
    const readOnly = mountDuration({ isReadOnly: true, defaultValue: Temporal.Duration.from({ hours: 3 }) });
    await readOnly.get('input[data-unit=hours]').trigger('keydown', { key: 'ArrowUp' });
    expect(readOnly.emitted('update:modelValue')).toBeUndefined();
    expect(segment(readOnly, 'hours').readOnly).toBe(true);
  });
});
