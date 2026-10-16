import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { StepCard, TabsGroup, TabsGroupList } from '@src/presentation/display';
import { measureRect } from '@src/foundation/animation';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
});

/** A consumer accepts the documented native handle, not a Vue instance or private SFC helper type. */
function inspectHandle(element: HTMLElement | null): HTMLElement {
  expect(element).toBeInstanceOf(HTMLElement);
  const node = element!;
  node.focus();
  expect(node.ownerDocument.activeElement).toBe(node);
  expect(measureRect(node)).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  return node;
}

describe('public component root handles', () => {
  it('forwards a nested Card DOM handle for focus/measurement and releases it on unmount', () => {
    const target = ref<InstanceType<typeof StepCard> | null>(null);
    const wrapper = mount(
      defineComponent({
        setup: () => () => h(StepCard, { ref: target, step: 1, title: 'First step', tabindex: 0 }),
      }),
      { attachTo: document.body },
    );
    wrappers.push(wrapper);
    const instance = target.value!;
    const node = inspectHandle(instance.el);
    expect(node).toBe(wrapper.element);
    expect('el' in node).toBe(false);
    wrapper.unmount();
    wrappers.pop();
    expect(target.value).toBe(null);
    expect(instance.el).toBe(null);
  });

  it('forwards the RovingFocusGroup native root through a provider-owned list', () => {
    const target = ref<InstanceType<typeof TabsGroupList> | null>(null);
    const wrapper = mount(
      defineComponent({
        setup: () => () => h(TabsGroup, {}, { default: () => h(TabsGroupList, { ref: target, tabindex: 0 }) }),
      }),
      { attachTo: document.body },
    );
    wrappers.push(wrapper);
    const node = inspectHandle(target.value!.el);
    expect(node.getAttribute('role')).toBe('tablist');
  });
});
