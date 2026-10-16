import { expect } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Component, type VNode } from 'vue';
import { DataRegion } from '@src/presentation/feedback/dataRegion';

/** Whether the run emulates forced colours, where colour and shadow reads are the system's, not ours. */
export const isForcedColors = typeof window !== 'undefined' && window.matchMedia('(forced-colors: active)').matches;

/** A box read for shape comparison: whole pixels, so subpixel layout never decides a comparison. */
export interface ShapeRead {
  readonly width: number;
  readonly height: number;
  readonly radius: string;
}

export function readShape(element: Element): ShapeRead {
  const rect = element.getBoundingClientRect();
  return {
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    radius: getComputedStyle(element).borderTopLeftRadius,
  };
}

/** Asserts a skeleton box matches its loaded box within 1px, with the same corner radius. */
export function expectSameShape(name: string, skeleton: ShapeRead, loaded: ShapeRead): void {
  expect(Math.abs(skeleton.width - loaded.width), `${name} width`).toBeLessThanOrEqual(1);
  expect(Math.abs(skeleton.height - loaded.height), `${name} height`).toBeLessThanOrEqual(1);
  expect(skeleton.radius, `${name} radius`).toBe(loaded.radius);
}

/**
 * Mounts `content` in a `DataRegion` on its first load, reads every selector, settles the load, reads again, and
 * asserts each skeleton box matches its loaded box. Returns the wrapper for further reads; the caller unmounts it.
 */
export async function expectRegionShapeParity(
  content: (isFirstLoad: boolean) => VNode | VNode[],
  selectors: ReadonlyArray<string>,
  width = 'w-96',
): Promise<VueWrapper> {
  const isFirstLoad = ref(true);
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h('div', { class: `${width} p-4` }, [
          h(DataRegion as Component, { isFirstLoad: isFirstLoad.value }, () => content(isFirstLoad.value)),
        ]),
    }),
    { attachTo: document.body },
  );
  await nextTick();
  const read = (): ReadonlyArray<ShapeRead> =>
    selectors.map((selector) => {
      const element = wrapper.element.querySelector(selector);
      expect(element, selector).not.toBeNull();
      return readShape(element!);
    });
  const skeleton = read();
  isFirstLoad.value = false;
  await nextTick();
  const loaded = read();
  selectors.forEach((selector, index) => expectSameShape(selector, skeleton[index]!, loaded[index]!));
  isFirstLoad.value = true;
  await nextTick();
  return wrapper;
}
