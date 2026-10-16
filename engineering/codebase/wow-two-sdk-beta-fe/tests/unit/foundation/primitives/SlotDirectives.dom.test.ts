import { expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, vShow, withDirectives } from 'vue';
import { Primitive } from '@src/foundation/primitives/slot';

it('preserves child directives when a primitive merges into the slot', async () => {
  const visible = ref(false);
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(Primitive, { asChild: true }, () => withDirectives(h('button', 'Action'), [[vShow, visible.value]])),
    }),
  );
  try {
    expect(wrapper.get('button').element.style.display).toBe('none');
    visible.value = true;
    await nextTick();
    expect(wrapper.get('button').element.style.display).toBe('');
    visible.value = false;
    await nextTick();
    expect(wrapper.get('button').element.style.display).toBe('none');
  } finally {
    wrapper.unmount();
  }
});
