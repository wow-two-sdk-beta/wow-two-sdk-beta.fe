import { afterEach, describe, expect, it, vi } from 'vitest';
import { h, nextTick, ref } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import Layout from '@src/presentation/layout/resizablePanelsLayout/ResizablePanelsLayout.vue';
import Panel from '@src/presentation/layout/resizablePanelsLayout/ResizablePanel.vue';
import Separator from '@src/presentation/layout/resizablePanelsLayout/ResizableSeparator.vue';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.restoreAllMocks();
  document.body.removeAttribute('style');
});
function render(props = {}, panelProps = {}) {
  const wrapper = mount(Layout, {
    props,
    slots: { default: () => [h(Panel, panelProps), h(Separator), h(Panel, panelProps)] },
  });
  wrappers.push(wrapper);
  return wrapper;
}

describe('resizable pair state and ownership', () => {
  it('does not overwrite controlled sizes while children register', async () => {
    const sizes = ref<ReadonlyArray<number>>([60, 40]);
    const wrapper = mount({
      setup: () => () =>
        h(
          Layout,
          {
            sizes: sizes.value,
            'onUpdate:sizes': (next) => {
              sizes.value = next;
            },
          },
          { default: () => [h(Panel), h(Separator), h(Panel)] },
        ),
    });
    wrappers.push(wrapper);
    await nextTick();
    expect(sizes.value).toEqual([60, 40]);
    expect(wrapper.findComponent(Layout).emitted('update:sizes')).toBeUndefined();
    expect(wrapper.get('[role="separator"]').attributes('aria-valuenow')).toBe('60');
  });
  it('keeps pair reset finite when both default weights are zero', async () => {
    const wrapper = render({ defaultSizes: [60, 40] }, { defaultSize: 0 });
    await nextTick();
    await wrapper.get('[role="separator"]').trigger('dblclick');
    expect(wrapper.emitted('update:sizes')?.at(-1)).toEqual([[50, 50]]);
  });
  it('does not emit an impossible pair when constraints cannot share the existing total', async () => {
    const wrapper = render({ defaultSizes: [50, 50] }, { minSize: 60, maxSize: 80 });
    await nextTick();
    await wrapper.get('[role="separator"]').trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.emitted('update:sizes')).toBeUndefined();
  });
  it('clamps both panels through one feasible pair interval', async () => {
    const wrapper = render({ defaultSizes: [50, 50] }, { minSize: 45, maxSize: 55 });
    await nextTick();
    await wrapper.get('[role="separator"]').trigger('keydown', { key: 'ArrowRight', shiftKey: true });
    expect(wrapper.emitted('update:sizes')?.at(-1)).toEqual([[55, 45]]);
  });
  it('restores authored body styles and releases global listeners on unmount', async () => {
    const wrapper = render({ defaultSizes: [50, 50] });
    await nextTick();
    vi.spyOn(wrapper.element, 'getBoundingClientRect').mockReturnValue({ width: 1000, height: 400 } as DOMRect);
    document.body.style.setProperty('cursor', 'crosshair', 'important');
    document.body.style.userSelect = 'text';
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    await wrapper.get('[role="separator"]').trigger('mousedown', { button: 0, clientX: 500 });
    expect(document.body.style.cursor).toBe('col-resize');
    const owned = add.mock.calls.filter(([type]) => type === 'mousemove' || type === 'mouseup');
    wrapper.unmount();
    wrappers.splice(wrappers.indexOf(wrapper), 1);
    expect(document.body.style.cursor).toBe('crosshair');
    expect(document.body.style.getPropertyPriority('cursor')).toBe('important');
    expect(document.body.style.userSelect).toBe('text');
    for (const [type, listener] of owned) expect(remove).toHaveBeenCalledWith(type, listener);
  });
});
