import { expect, it } from 'vitest';
import { defineComponent, h, nextTick, shallowRef } from 'vue';
import { mount } from '@vue/test-utils';
import {
  CommandsProvider,
  createCommandRegistry,
  useCommand,
  useCommands,
  useRegisterCommands,
  type CommandRegistry,
} from '@src/foundation/commands';

it('moves scoped registrations and live reads when the provider registry changes', async () => {
  const first = createCommandRegistry();
  const second = createCommandRegistry();
  const active = shallowRef(first);
  let client!: CommandRegistry;
  const icon = shallowRef('old');
  const Child = defineComponent({
    setup() {
      client = useCommands();
      useRegisterCommands(() => [{ id: 'save', title: 'Save', icon: icon.value, run: () => undefined }]);
      const command = useCommand('save');
      return () => h('span', String(command.value?.icon ?? 'missing'));
    },
  });
  const wrapper = mount(
    defineComponent({ setup: () => () => h(CommandsProvider, { registry: active.value }, () => h(Child)) }),
  );
  expect(wrapper.text()).toBe('old');
  icon.value = 'new';
  await nextTick();
  expect(wrapper.text()).toBe('new');
  active.value = second;
  await nextTick();
  expect(first.get('save')).toBeUndefined();
  expect(second.get('save')?.title).toBe('Save');
  expect(client.get('save')).toBe(second.get('save'));
  expect(wrapper.text()).toBe('new');
  wrapper.unmount();
  expect(second.get('save')).toBeUndefined();
});
