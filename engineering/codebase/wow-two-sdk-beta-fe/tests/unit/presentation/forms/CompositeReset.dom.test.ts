import { afterEach, expect, it } from 'vitest';
import { h, nextTick, type Component } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { CheckboxGroup, CheckboxField, TagsInput, PinInput, ToggleGroup, ToggleInput } from '@src/presentation/forms';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
});
async function reset(wrapper: VueWrapper): Promise<void> {
  (wrapper.get('form').element as HTMLFormElement).reset();
  await Promise.resolve();
  await nextTick();
  await nextTick();
}

it('restores a checkbox group once without each child resetting its own false seed', async () => {
  const wrapper = mount(
    {
      render: () =>
        h(
          'form',
          null,
          h(CheckboxGroup, { defaultValue: ['a'] }, () => [
            h(CheckboxField, { value: 'a', label: 'A' }),
            h(CheckboxField, { value: 'b', label: 'B' }),
          ]),
        ),
    },
    { attachTo: document.body },
  );
  wrappers.push(wrapper);
  await wrapper.findAll('input:not([type=hidden])')[1]!.setValue(true);
  const group = wrapper.findComponent(CheckboxGroup);
  expect(group.emitted('update:modelValue')).toEqual([[['a', 'b']]]);
  await reset(wrapper);
  expect(group.emitted('update:modelValue')).toEqual([[['a', 'b']], [['a']]]);
  expect(
    wrapper.findAll('input:not([type=hidden])').map((input) => (input.element as HTMLInputElement).checked),
  ).toEqual([true, false]);
});

it('requests one controlled group reset and keeps the caller selection rendered', async () => {
  const wrapper = mount(
    {
      render: () =>
        h(
          'form',
          null,
          h(CheckboxGroup, { modelValue: ['b'], defaultValue: ['a'] }, () => [
            h(CheckboxField, { value: 'a', label: 'A' }),
            h(CheckboxField, { value: 'b', label: 'B' }),
          ]),
        ),
    },
    { attachTo: document.body },
  );
  wrappers.push(wrapper);
  await reset(wrapper);
  expect(wrapper.findComponent(CheckboxGroup).emitted('update:modelValue')).toEqual([[['a']]]);
  expect(
    wrapper.findAll('input:not([type=hidden])').map((input) => (input.element as HTMLInputElement).checked),
  ).toEqual([false, true]);
});

it('resets tags and their unfinished draft together', async () => {
  const wrapper = mount(
    { render: () => h('form', null, h(TagsInput, { defaultValue: ['seed'] })) },
    { attachTo: document.body },
  );
  wrappers.push(wrapper);
  await wrapper.get('input').setValue('new');
  await wrapper.get('input').trigger('keydown', { key: 'Enter' });
  await wrapper.get('input').setValue('unfinished');
  (wrapper.get('input').element as HTMLInputElement).focus();
  await reset(wrapper);
  expect(document.activeElement).toBe(wrapper.get('input').element);
  expect(wrapper.findComponent(TagsInput).emitted('update:modelValue')?.at(-1)).toEqual([['seed']]);
  expect((wrapper.get('input').element as HTMLInputElement).value).toBe('');
});

it('restores each PIN cell from the original string seed', async () => {
  const wrapper = mount(
    { render: () => h('form', null, h(PinInput, { defaultValue: '12', length: 4 })) },
    { attachTo: document.body },
  );
  wrappers.push(wrapper);
  await wrapper.findAll('input:not([type=hidden])')[0]!.setValue('9');
  (wrapper.findAll('input:not([type=hidden])')[1]!.element as HTMLInputElement).focus();
  await reset(wrapper);
  expect(document.activeElement).toBe(wrapper.findAll('input:not([type=hidden])')[1]!.element);
  expect(wrapper.findAll('input:not([type=hidden])').map((input) => (input.element as HTMLInputElement).value)).toEqual(
    ['1', '2', '', ''],
  );
});

it('resets the toggle group owner without child pressed defaults changing the selection', async () => {
  const wrapper = mount(
    {
      render: () =>
        h(
          'form',
          null,
          h(ToggleGroup as Component, { defaultValue: 'a' }, () => [
            h(ToggleInput, { value: 'a' }, () => 'A'),
            h(ToggleInput, { value: 'b' }, () => 'B'),
          ]),
        ),
    },
    { attachTo: document.body },
  );
  wrappers.push(wrapper);
  const toggles = wrapper.findAll('[aria-pressed]');
  await toggles[1]!.trigger('click');
  await reset(wrapper);
  expect(wrapper.findComponent({ name: 'ToggleGroup' }).emitted('update:modelValue')?.at(-1)).toEqual(['a']);
  expect(wrapper.findAll('[aria-pressed]').map((toggle) => toggle.attributes('aria-pressed'))).toEqual([
    'true',
    'false',
  ]);
});
