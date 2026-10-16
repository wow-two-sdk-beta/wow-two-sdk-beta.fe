import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import { Field, RadioField, RadioGroup } from '@src/presentation/forms';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
});

const Options = () => [
  h(RadioField, { value: 'email', label: 'Email' }),
  h(RadioField, { value: 'sms', label: 'SMS' }),
  h(RadioField, { value: 'none', label: 'None' }),
];

function mountGroup(props: Record<string, unknown> = {}): VueWrapper {
  const wrapper = mount(RadioGroup, { props, slots: { default: Options }, attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
}

function radios(wrapper: VueWrapper): HTMLInputElement[] {
  return [...(wrapper.element as HTMLElement).querySelectorAll<HTMLInputElement>('input[type=radio]')];
}

describe('RadioGroup', () => {
  it('shares one generated name per group, so the browser roves the arrows between its radios', () => {
    const pair = mount(
      {
        render: () => h('div', [h(RadioGroup, null, { default: Options }), h(RadioGroup, null, { default: Options })]),
      },
      { attachTo: document.body },
    );
    wrappers.push(pair);
    const names = radios(pair).map((radio) => radio.name);
    expect(names[0]).toBeTruthy();
    expect(new Set(names.slice(0, 3)).size).toBe(1);
    expect(new Set(names.slice(3)).size).toBe(1);
    expect(names[3]).not.toBe(names[0]);
  });

  it('checks the picked radio and reports it', async () => {
    const wrapper = mountGroup({ defaultValue: 'sms', legend: 'Notify me by' });
    expect(wrapper.get('legend').text()).toBe('Notify me by');
    expect(radios(wrapper).map((radio) => radio.checked)).toEqual([false, true, false]);
    radios(wrapper)[0]!.click();
    await nextTick();
    expect(wrapper.emitted('update:modelValue')).toEqual([['email']]);
    expect(radios(wrapper).map((radio) => radio.checked)).toEqual([true, false, false]);
  });

  it('stays on the owner-held value while controlled', async () => {
    const wrapper = mountGroup({ modelValue: 'none' });
    radios(wrapper)[1]!.click();
    await nextTick();
    expect(wrapper.emitted('update:modelValue')).toEqual([['sms']]);
    expect(radios(wrapper)[2]!.checked).toBe(true);
    expect(radios(wrapper)[1]!.checked).toBe(false);
  });

  it('locks every radio when the group is disabled', () => {
    const wrapper = mountGroup({ isDisabled: true });
    expect(wrapper.get('fieldset').attributes('disabled')).toBeDefined();
    expect(radios(wrapper).every((radio) => radio.disabled)).toBe(true);
  });

  it('keeps an explicitly enabled item usable in a disabled group, and the reverse', () => {
    const wrapper = mount(RadioGroup, {
      slots: {
        default: () => [
          h(RadioField, { value: 'a', label: 'A', isDisabled: true }),
          h(RadioField, { value: 'b', label: 'B' }),
        ],
      },
    });
    wrappers.push(wrapper);
    expect(radios(wrapper).map((radio) => radio.disabled)).toEqual([true, false]);
  });

  it('takes the field label, description, invalid and required states at group level', async () => {
    const wrapper = mount(
      {
        render: () =>
          h(Field, { label: 'Channel', error: 'Pick a channel', isRequired: true }, () =>
            h(RadioGroup, null, { default: Options }),
          ),
      },
      { attachTo: document.body },
    );
    wrappers.push(wrapper);
    await nextTick();
    const group = wrapper.get('[role=radiogroup]');
    const label = wrapper.get('label').element as HTMLLabelElement;
    expect(label.htmlFor).toBe(group.attributes('id'));
    expect(group.attributes('aria-invalid')).toBe('true');
    const describedBy = group.attributes('aria-describedby')!.split(' ');
    expect(describedBy.some((id) => document.getElementById(id)?.textContent?.includes('Pick a channel'))).toBe(true);
    const ids = radios(wrapper).map((radio) => radio.id);
    expect(new Set(ids).size).toBe(3);
    expect(ids).not.toContain(group.attributes('id'));
    expect(radios(wrapper).every((radio) => radio.required)).toBe(true);
  });
});
