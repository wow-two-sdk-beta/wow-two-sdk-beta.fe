import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Component } from 'vue';
import { DataRegion } from '@src/presentation/feedback/dataRegion';
import { SkeletonStateLine } from '@src/presentation/feedback/skeletonState/SkeletonStateLine';
import '@src/index.css';

const isForcedColors = window.matchMedia('(forced-colors: active)').matches;

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

/** Mounts `render` twice over a reactive flag and returns the root after each state. */
async function mountToggle(render: (isSkeleton: boolean) => ReturnType<typeof h>): Promise<{
  readonly flip: () => Promise<void>;
  readonly root: HTMLElement;
}> {
  const isSkeleton = ref(true);
  wrapper = mount(defineComponent({ setup: () => () => h('div', { class: 'w-80 p-4' }, render(isSkeleton.value)) }), {
    attachTo: document.body,
  });
  await nextTick();
  return {
    root: wrapper.element as HTMLElement,
    flip: async () => {
      isSkeleton.value = !isSkeleton.value;
      await nextTick();
    },
  };
}

/** The element's border box, rounded to whole pixels so subpixel layout never decides a comparison. */
function box(element: Element): { width: number; height: number } {
  const rect = element.getBoundingClientRect();
  return { width: Math.round(rect.width), height: Math.round(rect.height) };
}

function expectSameBox(skeleton: { width: number; height: number }, loaded: { width: number; height: number }): void {
  expect(Math.abs(skeleton.width - loaded.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(skeleton.height - loaded.height)).toBeLessThanOrEqual(1);
}

describe('DataRegion first load in a real browser', () => {
  it('keeps the content out of reach until it loads, through a contents wrapper', async () => {
    const onClick = vi.fn();
    const isFirstLoad = ref(true);
    wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(DataRegion as Component, { isFirstLoad: isFirstLoad.value, class: 'grid grid-cols-2 gap-4' }, () => [
            h('button', { class: 'action', onClick }, 'Open'),
            h('p', { class: 'cell' }, 'Second'),
          ]),
      }),
      { attachTo: document.body },
    );
    const region = wrapper.element as HTMLElement;
    const action = region.querySelector<HTMLButtonElement>('.action')!;
    action.focus();
    expect(document.activeElement).not.toBe(action);
    /* The grid reaches the content through the `contents` wrapper: both children sit in one row. */
    expect(Math.round(action.getBoundingClientRect().top)).toBe(
      Math.round(region.querySelector('.cell')!.getBoundingClientRect().top),
    );
    isFirstLoad.value = false;
    await nextTick();
    const loaded = region.querySelector<HTMLButtonElement>('.action')!;
    loaded.focus();
    expect(document.activeElement).toBe(loaded);
  });
});

describe('text bars keep the text box', () => {
  it('draws one bar per line and keeps a wrapped paragraph its height', async () => {
    const text = 'Every host in the fleet reports its uptime, memory and disk once a minute.';
    const { root, flip } = await mountToggle((isSkeleton) =>
      h(
        'p',
        { class: 'para text-sm' },
        h(SkeletonStateLine, { isSkeleton }, () => text),
      ),
    );
    const paragraph = root.querySelector('.para')!;
    const skeleton = box(paragraph);
    const bar = root.querySelector('[data-skeleton-line]')!;
    expect(bar.getClientRects().length).toBeGreaterThan(1);
    if (!isForcedColors) expect(getComputedStyle(bar).color).toBe('rgba(0, 0, 0, 0)');
    else expect(getComputedStyle(bar).outlineStyle).toBe('solid');
    await flip();
    expectSameBox(skeleton, box(paragraph));
  });

  it('keeps one line for an empty value and for a fixed width', async () => {
    const { root, flip } = await mountToggle((isSkeleton) =>
      h('div', [
        h(
          'p',
          { class: 'empty text-base' },
          h(SkeletonStateLine, { isSkeleton }, () => (isSkeleton ? '' : 'Ada')),
        ),
        h(
          'p',
          { class: 'fixed text-base' },
          h(SkeletonStateLine, { isSkeleton, width: '50%' }, () => 'Ada'),
        ),
      ]),
    );
    const empty = box(root.querySelector('.empty')!);
    const fixed = root.querySelector('.fixed [data-skeleton-line]')!;
    const fixedWidth = Math.round(fixed.getBoundingClientRect().width);
    expect(fixedWidth).toBeGreaterThan(Math.round(root.querySelector('.fixed')!.getBoundingClientRect().width / 2) - 1);
    await flip();
    expectSameBox(empty, box(root.querySelector('.empty')!));
  });
});
