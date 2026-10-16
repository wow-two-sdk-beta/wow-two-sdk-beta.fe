import { afterEach, expect, it } from 'vitest';
import { h, nextTick } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import {
  NumberInput,
  TextInput,
  NodeEditor,
  SortableGroup,
  SortableGroupItem,
  SortableGroupMoveButton,
} from '@src/presentation/forms';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
});
const settleReset = async () => {
  await Promise.resolve();
  await nextTick();
  await nextTick();
};

it('commits finite numeric values and null for a cleared number', async () => {
  const wrapper = mount(NumberInput);
  wrappers.push(wrapper);
  await wrapper.get('input').setValue('12.5');
  await wrapper.get('input').setValue('');
  expect(wrapper.emitted('update:modelValue')).toEqual([[12.5], [null]]);
  await wrapper.setProps({ readonly: true });
  expect(wrapper.findAll('button').every((button) => button.attributes('disabled') !== undefined)).toBe(true);
});

it('resets uncontrolled state to the original seed and respects cancelled resets', async () => {
  const wrapper = mount(
    { render: () => h('form', null, h(TextInput, { defaultValue: 'seed' })) },
    { attachTo: document.body },
  );
  wrappers.push(wrapper);
  const input = wrapper.get('input');
  await input.setValue('edited');
  (wrapper.get('form').element as HTMLFormElement).reset();
  await settleReset();
  expect((input.element as HTMLInputElement).value).toBe('seed');
  await input.setValue('keep');
  wrapper.get('form').element.addEventListener('reset', (event) => event.preventDefault(), { once: true });
  (wrapper.get('form').element as HTMLFormElement).reset();
  await settleReset();
  expect((input.element as HTMLInputElement).value).toBe('keep');
});

it('requests a controlled reset without replacing the caller value in the DOM', async () => {
  const wrapper = mount(
    { render: () => h('form', null, h(TextInput, { modelValue: 'external', defaultValue: 'seed' })) },
    { attachTo: document.body },
  );
  wrappers.push(wrapper);
  (wrapper.get('form').element as HTMLFormElement).reset();
  await settleReset();
  expect(wrapper.findComponent(TextInput).emitted('update:modelValue')).toEqual([['seed']]);
  expect((wrapper.get('input').element as HTMLInputElement).value).toBe('external');
});

it('provides bounded pointer buttons for reordering', async () => {
  const wrapper = mount(SortableGroup, {
    slots: {
      default: () =>
        [0, 1].map((index) =>
          h(SortableGroupItem, { index }, () => [
            h(SortableGroupMoveButton, { direction: 'previous' }),
            h(SortableGroupMoveButton, { direction: 'next' }),
          ]),
        ),
    },
  });
  wrappers.push(wrapper);
  await nextTick();
  const buttons = wrapper.findAll('button');
  expect(buttons[0]!.attributes('disabled')).toBeDefined();
  expect(buttons[3]!.attributes('disabled')).toBeDefined();
  await buttons[1]!.trigger('click');
  expect(wrapper.emitted('reorder')).toEqual([[0, 1]]);
});

it('moves graph nodes through click and keyboard intent without mutating the caller array', async () => {
  const nodes = [
    { id: 'a', x: 0, y: 0 },
    { id: 'b', x: 100, y: 100 },
  ];
  const wrapper = mount(NodeEditor, { props: { nodes, edges: [{ id: 'edge', source: 'a', target: 'b' }] } });
  wrappers.push(wrapper);
  await wrapper.get('button[aria-label="Move node right"]').trigger('click');
  expect(wrapper.emitted('update:nodes')?.[0]).toEqual([[{ id: 'a', x: 10, y: 0 }, nodes[1]]]);
  await wrapper.get('[data-node]').trigger('keydown', { key: 'ArrowDown' });
  expect(wrapper.emitted('update:nodes')?.[1]).toEqual([[{ id: 'a', x: 0, y: 10 }, nodes[1]]]);
  expect(nodes[0]).toEqual({ id: 'a', x: 0, y: 0 });
  await wrapper.get('g[role="button"]').trigger('keydown', { key: 'Enter' });
  expect(wrapper.emitted('edge-click')).toHaveLength(1);
});
