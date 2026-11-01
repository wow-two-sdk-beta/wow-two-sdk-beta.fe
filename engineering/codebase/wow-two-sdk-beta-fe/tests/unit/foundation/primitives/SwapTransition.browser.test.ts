import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, shallowRef } from 'vue';
import { SwapTransition, SwapTransitionAttribute } from '@src/foundation/primitives';
import { nativeTab } from '../../../BrowserKeyboard';
import '@src/index.css';

/*
 * Real layout and real Web Animations: the box's height on screen moves through the values between two panes, the
 * box follows a pane that grows while shown, and focus held in a leaving pane stays in the region.
 */

const wrappers: VueWrapper[] = [];

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

function mountSwap(props: Record<string, unknown> = {}) {
  const pane = shallowRef<'a' | 'b'>('a');
  const heightB = shallowRef(200);
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(SwapTransition, { 'data-testid': 'box', style: 'width: 320px', ...props }, () =>
          pane.value === 'a'
            ? h('div', { key: 'a', 'data-pane': 'a', style: 'height: 100px' }, [
                h('button', { onClick: () => (pane.value = 'b') }, 'To B'),
              ])
            : h('div', { key: 'b', 'data-pane': 'b', style: `height: ${heightB.value}px` }, [h('button', 'In B')]),
        ),
    }),
    { attachTo: document.body, global: { stubs: { transition: false } } },
  );
  wrappers.push(wrapper);
  const box = wrapper.get<HTMLElement>('[data-testid=box]').element;
  return { pane, heightB, box, content: box.firstElementChild as HTMLElement };
}

const frame = (): Promise<number> => new Promise((resolve) => requestAnimationFrame(resolve));

/** Samples `read` once per frame until `isDone` holds, for at most two seconds. */
async function sampleUntil<T>(read: () => T, isDone: () => boolean): Promise<T[]> {
  const samples: T[] = [];
  const end = performance.now() + 2000;
  while (performance.now() < end) {
    await frame();
    samples.push(read());
    if (isDone()) break;
  }
  return samples;
}

const heightOf = (element: HTMLElement): number => Math.round(element.getBoundingClientRect().height);
const isSettled = (box: HTMLElement): boolean => !box.hasAttribute(SwapTransitionAttribute);

describe('SwapTransition in a browser', () => {
  it('renders the first content at its height with no animation', async () => {
    const { box } = mountSwap();
    await frame();

    expect(heightOf(box)).toBe(100);
    expect(box.getAnimations({ subtree: true })).toHaveLength(0);
  });

  it('fades out, moves the box through the heights between the panes, and fades in', async () => {
    const { pane, box, content } = mountSwap();
    await frame();
    pane.value = 'b';
    await nextTick();

    const samples = await sampleUntil(
      () => ({
        pane: box.querySelector<HTMLElement>('[data-pane]')?.dataset.pane,
        height: heightOf(box),
        opacity: Number(getComputedStyle(content).opacity),
      }),
      () => isSettled(box),
    );

    expect(samples.some((sample) => sample.pane === 'a' && sample.opacity < 1)).toBe(true);
    expect(samples.some((sample) => sample.height > 100 && sample.height < 200)).toBe(true);
    expect(samples.some((sample) => sample.pane === 'b' && sample.height === 200 && sample.opacity < 1)).toBe(true);
    expect(isSettled(box)).toBe(true);
    expect(heightOf(box)).toBe(200);
    expect(box.style.height).toBe('');
    expect(getComputedStyle(content).opacity).toBe('1');
  });

  it('follows its content growing while shown', async () => {
    const { pane, heightB, box } = mountSwap({ duration: 300 });
    pane.value = 'b';
    await sampleUntil(
      () => 0,
      () => isSettled(box) && box.querySelector('[data-pane=b]') !== null,
    );

    heightB.value = 300;
    await nextTick();
    const heights = await sampleUntil(
      () => heightOf(box),
      () => box.style.height === '' && heightOf(box) === 300,
    );

    expect(heights.some((height) => height > 200 && height < 300)).toBe(true);
    expect(heightOf(box)).toBe(300);
    expect(box.style.height).toBe('');
  });

  it('swaps and resizes instantly under prefers-reduced-motion', async () => {
    const matchMedia = window.matchMedia.bind(window);
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) =>
      query === '(prefers-reduced-motion: reduce)'
        ? ({
            matches: true,
            media: query,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
          } as unknown as MediaQueryList)
        : matchMedia(query),
    );
    const { pane, heightB, box } = mountSwap();
    await frame();
    pane.value = 'b';
    await frame();

    expect(box.querySelector('[data-pane=b]')).not.toBeNull();
    expect(heightOf(box)).toBe(200);
    expect(box.getAnimations({ subtree: true })).toHaveLength(0);

    heightB.value = 260;
    await nextTick();
    await frame();
    expect(heightOf(box)).toBe(260);
    expect(box.getAnimations({ subtree: true })).toHaveLength(0);
  });

  it('keeps focus in the region, ringless, and lets Tab reach the new content', async () => {
    const { box } = mountSwap();
    await frame();
    // A keyboard press on the pane's own button starts the swap, as a reader switching panes does.
    box.querySelector<HTMLButtonElement>('button')!.focus();
    box.querySelector<HTMLButtonElement>('button')!.click();
    await nextTick();

    expect(document.activeElement).toBe(box);
    expect(getComputedStyle(box).outlineStyle).toBe('none');

    await sampleUntil(
      () => 0,
      () => isSettled(box) && box.querySelector('[data-pane=b]') !== null,
    );
    await nativeTab();
    expect(document.activeElement?.textContent).toBe('In B');
    expect(box.hasAttribute('tabindex')).toBe(false);
  });
});
