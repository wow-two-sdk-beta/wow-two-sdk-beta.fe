import { afterEach, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import ListboxPicker from '@src/presentation/forms/listboxPicker/ListboxPicker.vue';
import ListboxPickerItem from '@src/presentation/forms/listboxPicker/ListboxPickerItem.vue';
import ComboboxPicker from '@src/presentation/forms/comboboxPicker/ComboboxPicker.vue';
import ComboboxPickerInput from '@src/presentation/forms/comboboxPicker/ComboboxPickerInput.vue';
import ComboboxPickerItem from '@src/presentation/forms/comboboxPicker/ComboboxPickerItem.vue';
import Menu from '@src/presentation/nav/menu/Menu.vue';
import MenuItem from '@src/presentation/nav/menu/MenuItem.vue';
import CommandPaletteModal from '@src/presentation/overlays/commandPaletteModal/CommandPaletteModal.vue';
import CommandPaletteModalInput from '@src/presentation/overlays/commandPaletteModal/CommandPaletteModalInput.vue';
import CommandPaletteModalItem from '@src/presentation/overlays/commandPaletteModal/CommandPaletteModalItem.vue';

const wrappers: VueWrapper[] = [];
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));
const PassThrough = defineComponent({
  inheritAttrs: false,
  setup:
    (_props, { slots }) =>
    () =>
      slots.default?.(),
});

it('moves listbox selection in DOM order after keyed children reorder', async () => {
  const order = ref(['a', 'b', 'c']);
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(ListboxPicker, {}, () =>
          order.value.map((value) => h(ListboxPickerItem, { key: value, value }, () => value)),
        ),
    }),
    { attachTo: document.body },
  );
  wrappers.push(wrapper);
  order.value = ['a', 'c', 'b'];
  await nextTick();
  await wrapper.get('[role=listbox]').trigger('keydown', { key: 'ArrowDown' });
  await wrapper.get('[role=listbox]').trigger('keydown', { key: 'Enter' });
  expect(wrapper.findComponent(ListboxPicker).emitted('update:modelValue')).toEqual([['c']]);
});

it('moves combobox activation in DOM order after keyed children reorder', async () => {
  const order = ref(['a', 'b', 'c']);
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(ComboboxPicker, { open: true }, () => [
          h(ComboboxPickerInput),
          ...order.value.map((value) => h(ComboboxPickerItem, { key: value, value }, () => value)),
        ]),
    }),
    { attachTo: document.body },
  );
  wrappers.push(wrapper);
  await wrapper.findAll('[role=option]')[0]!.trigger('pointerenter');
  order.value = ['a', 'c', 'b'];
  await nextTick();
  await wrapper.get('input').trigger('keydown', { key: 'ArrowDown' });
  const active = wrapper.findAll('[role=option]').find((item) => item.attributes('data-active') !== undefined);
  expect(active?.text()).toBe('c');
});

it('moves menu focus in DOM order after keyed children reorder', async () => {
  const order = ref(['a', 'b', 'c']);
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(Menu, { open: true, anchor: null }, () =>
          order.value.map((value) => h(MenuItem, { key: value }, () => value)),
        ),
    }),
    {
      attachTo: document.body,
      global: {
        stubs: {
          Portal: PassThrough,
          Presence: PassThrough,
          FocusScope: PassThrough,
          DismissableLayer: PassThrough,
          AnchoredPositioner: PassThrough,
        },
      },
    },
  );
  wrappers.push(wrapper);
  order.value = ['a', 'c', 'b'];
  await nextTick();
  const button = wrapper.findAll('button')[0]!;
  button.element.focus();
  await button.trigger('keydown', { key: 'ArrowDown' });
  expect(document.activeElement?.textContent).toBe('c');
});

it('moves command palette activation in DOM order after keyed children reorder', async () => {
  const order = ref(['a', 'b', 'c']);
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(CommandPaletteModal, { open: true }, () => [
          h(CommandPaletteModalInput),
          ...order.value.map((value) => h(CommandPaletteModalItem, { key: value, value }, () => value)),
        ]),
    }),
    { attachTo: document.body },
  );
  wrappers.push(wrapper);
  await nextTick();
  await wrapper.findAll('[role=option]')[0]!.trigger('pointerenter');
  order.value = ['a', 'c', 'b'];
  await nextTick();
  await wrapper.get('input').trigger('keydown', { key: 'ArrowDown' });
  const active = wrapper.get('input').attributes('aria-activedescendant');
  expect(document.getElementById(active!)?.textContent).toBe('c');
});

it('does not activate a command while Enter confirms an IME composition', async () => {
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(CommandPaletteModal, { open: true }, () => [
          h(CommandPaletteModalInput),
          h(CommandPaletteModalItem, { value: 'command' }, () => 'Command'),
        ]),
    }),
    { attachTo: document.body },
  );
  wrappers.push(wrapper);
  await nextTick();
  await wrapper.get('[role=option]').trigger('pointerenter');
  await wrapper.get('input').trigger('keydown', { key: 'Enter', isComposing: true });
  expect(wrapper.findComponent(CommandPaletteModalItem).emitted('select')).toBeUndefined();
  expect(wrapper.findComponent(CommandPaletteModal).emitted('update:open')).toBeUndefined();
  await wrapper.get('input').trigger('keydown', { key: 'Enter' });
  expect(wrapper.findComponent(CommandPaletteModalItem).emitted('select')).toHaveLength(1);
});
