import { defineComponent, h } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { expect, it } from 'vitest';
import { FlagsProvider, createFlagClient, staticFlagProvider, useFlags, useFlag, type FlagClient } from '@src/flags';
it('imperative and computed reads both follow provider client replacement', async () => {
  let flags!: FlagClient;
  const Child = defineComponent({
    setup() {
      flags = useFlags();
      const value = useFlag('test', false);
      return () => h('p', String(value.value));
    },
  });
  const first = createFlagClient({ provider: staticFlagProvider({ test: false }) });
  const second = createFlagClient({ provider: staticFlagProvider({ test: true }) });
  const wrapper = mount(FlagsProvider, { props: { client: first }, slots: { default: () => h(Child) } });
  expect(flags.getBoolean('test', false)).toBe(false);
  await wrapper.setProps({ client: second });
  await flushPromises();
  expect(flags.getBoolean('test', false)).toBe(true);
  expect(wrapper.text()).toBe('true');
  wrapper.unmount();
});
it('provider-free imperative contexts cannot leak between independent roots', () => {
  const clients: FlagClient[] = [];
  const Child = defineComponent({
    setup() {
      clients.push(useFlags());
      return () => null;
    },
  });
  const first = mount(Child);
  const second = mount(Child);
  clients[0]!.setContext({ targetingKey: 'private' });
  expect(clients[1]!.getContext()).toEqual({});
  first.unmount();
  second.unmount();
});
