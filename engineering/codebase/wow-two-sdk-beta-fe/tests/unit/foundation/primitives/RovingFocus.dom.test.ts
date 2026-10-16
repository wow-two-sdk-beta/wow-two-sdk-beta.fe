import { afterEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import { RovingFocusGroup, useRovingFocusItem } from '@src/foundation/primitives/rovingFocusGroup';

const Item = defineComponent({
  props: { label: { type: String, required: true }, replacement: Boolean },
  setup(props) {
    const item = useRovingFocusItem();
    return () =>
      h(props.replacement ? 'a' : 'button', { ...item, href: props.replacement ? '#' : undefined }, props.label);
  },
});
const wrappers: Array<ReturnType<typeof mount>> = [];
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
});

describe('roving focus live DOM ownership', () => {
  it('navigates keyed children in their current DOM order', async () => {
    const order = ref(['a', 'b', 'c']);
    const wrapper = mount(
      defineComponent({
        setup: () => () => h(RovingFocusGroup, {}, () => order.value.map((label) => h(Item, { key: label, label }))),
      }),
      { attachTo: document.body },
    );
    wrappers.push(wrapper);
    order.value = ['a', 'c', 'b'];
    await nextTick();
    const buttons = wrapper.findAll('button');
    buttons[0]!.element.focus();
    await buttons[0]!.trigger('keydown', { key: 'ArrowRight' });
    expect(document.activeElement?.textContent).toBe('c');
  });

  it('tracks a replaced item root and its disabled attributes', async () => {
    const replacement = ref(false);
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(RovingFocusGroup, {}, () => [
            h(Item, { label: 'a', replacement: replacement.value }),
            h(Item, { label: 'b' }),
          ]),
      }),
      { attachTo: document.body },
    );
    wrappers.push(wrapper);
    replacement.value = true;
    await nextTick();
    wrapper.get('a').element.setAttribute('aria-disabled', 'true');
    await new Promise((resolve) => setTimeout(resolve, 0));
    await nextTick();
    expect(wrapper.get('a').attributes('tabindex')).toBe('-1');
    expect(wrapper.get('button').attributes('tabindex')).toBe('0');
  });
});
