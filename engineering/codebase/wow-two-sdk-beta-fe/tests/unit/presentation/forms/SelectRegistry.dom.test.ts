import { afterEach, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, ref, type Component } from 'vue';
import SelectPicker from '@src/presentation/forms/selectPicker/SelectPicker.vue';
import SelectPickerItem from '@src/presentation/forms/selectPicker/SelectPickerItem.vue';
import ListboxPicker from '@src/presentation/forms/listboxPicker/ListboxPicker.vue';
import { useSelectContext } from '@src/presentation/forms/selectPicker/SelectPickerContext';

const wrappers: VueWrapper[] = [];
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));

it('removes replaced option keys from search and closed-trigger navigation', async () => {
  const key = ref('old');
  const visible = ref(true);
  const Probe = defineComponent({
    setup() {
      const context = useSelectContext();
      return () => h('output', context.items.map((item) => item.itemKey).join(','));
    },
  });
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(SelectPicker as Component, {}, () => [
          h(Probe),
          h(ListboxPicker, {}, () =>
            visible.value ? h(SelectPickerItem, { itemKey: key.value, label: key.value }) : null,
          ),
        ]),
    }),
  );
  wrappers.push(wrapper);
  await wrapper.vm.$nextTick();
  expect(wrapper.get('output').text()).toBe('old');
  key.value = 'new';
  await wrapper.vm.$nextTick();
  expect(wrapper.get('output').text()).toBe('new');
  visible.value = false;
  await wrapper.vm.$nextTick();
  expect(wrapper.get('output').text()).toBe('');
});
