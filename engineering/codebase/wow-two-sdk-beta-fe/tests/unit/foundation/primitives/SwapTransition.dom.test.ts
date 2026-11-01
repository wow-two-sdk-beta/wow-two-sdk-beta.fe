import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, shallowRef } from 'vue';
import { SwapTransition, SwapTransitionAttribute } from '@src/foundation/primitives';

/*
 * happy-dom has no layout and no Web Animations API, so this file supplies both: every element reports the height
 * its `data-height`, its inline `height` or its children give it, and `element.animate` returns a fake animation the
 * test finishes by hand. That makes each phase of a swap observable on its own. Real layout and motion:
 * `SwapTransition.browser.test.ts`.
 */

interface FakeAnimation {
  readonly element: HTMLElement;
  readonly keyframes: Keyframe[];
  readonly options: KeyframeAnimationOptions;
  isSettled: boolean;
  finish(): void;
  cancel(): void;
}

let animations: FakeAnimation[] = [];
let isReducedMotion = false;
const wrappers: VueWrapper[] = [];

function heightOf(element: Element): number {
  const html = element as HTMLElement;
  if (html.dataset?.height) return Number(html.dataset.height);
  if (html.style?.height) return parseFloat(html.style.height);
  return Array.from(element.children).reduce((sum, child) => sum + heightOf(child), 0);
}

beforeEach(() => {
  animations = [];
  isReducedMotion = false;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return new DOMRect(0, 0, 320, heightOf(this));
  });
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: query.includes('prefers-reduced-motion') && isReducedMotion,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  );
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    configurable: true,
    value(this: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
      const listeners = new Map<string, Array<() => void>>();
      const settle = (type: string): void => {
        if (animation.isSettled) return;
        animation.isSettled = true;
        for (const listener of listeners.get(type) ?? []) listener();
      };
      const animation: FakeAnimation & Partial<Animation> = {
        element: this,
        keyframes,
        options,
        isSettled: false,
        finish: () => settle('finish'),
        cancel: () => settle('cancel'),
        pause: () => undefined,
        play: () => undefined,
        addEventListener: ((type: string, listener: () => void) => {
          listeners.set(type, [...(listeners.get(type) ?? []), listener]);
        }) as Animation['addEventListener'],
      };
      animations.push(animation);
      return animation;
    },
  });
});

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

/** Two panes of different heights behind one `v-if` / `v-else`, each with a button to hold focus. */
function mountSwap(props: Record<string, unknown> = {}) {
  const pane = shallowRef<'a' | 'b' | null>('a');
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(SwapTransition, { 'data-testid': 'box', ...props }, () =>
          pane.value === 'a'
            ? h('div', { key: 'a', 'data-pane': 'a', 'data-height': '100' }, [h('button', 'A')])
            : pane.value === 'b'
              ? h('div', { key: 'b', 'data-pane': 'b', 'data-height': '160' }, [h('button', 'B')])
              : null,
        ),
    }),
    // Test Utils stubs `<Transition>` by default, which would make every swap instant.
    { attachTo: document.body, global: { stubs: { transition: false } } },
  );
  wrappers.push(wrapper);
  const box = wrapper.get<HTMLElement>('[data-testid=box]').element;
  const content = box.firstElementChild as HTMLElement;
  return { wrapper, pane, box, content };
}

/** Finishes the one running animation and lets the swap's continuation and Vue's re-render land. */
async function finishRunning(): Promise<FakeAnimation> {
  const running = animations.filter((animation) => !animation.isSettled);
  expect(running).toHaveLength(1);
  running[0]!.finish();
  await flushPromises();
  await nextTick();
  return running[0]!;
}

function paneShown(box: HTMLElement): string[] {
  return Array.from(box.querySelectorAll<HTMLElement>('[data-pane]')).map((pane) => pane.dataset.pane!);
}

describe('SwapTransition', () => {
  it('does nothing on the first render', async () => {
    const { box, content } = mountSwap();
    await flushPromises();

    expect(paneShown(box)).toEqual(['a']);
    expect(animations).toHaveLength(0);
    expect(box.hasAttribute(SwapTransitionAttribute)).toBe(false);
    expect(box.style.height).toBe('');
    expect(content.style.opacity).toBe('');
  });

  it('fades the old content out, animates the height, then fades the new content in', async () => {
    const { pane, box, content } = mountSwap();
    pane.value = 'b';
    await nextTick();

    // Fade out: the old content stays, inert, in a box held at its height.
    expect(paneShown(box)).toEqual(['a']);
    expect(box.hasAttribute(SwapTransitionAttribute)).toBe(true);
    expect(box.style.height).toBe('100px');
    expect(box.style.overflow).toBe('hidden');
    expect(content.inert).toBe(true);
    const fadeOut = await finishRunning();
    expect(fadeOut.element).toBe(content);
    expect(fadeOut.keyframes).toEqual([{ opacity: '1' }, { opacity: '0' }]);
    expect(fadeOut.options.duration).toBe(120);

    // Height: the new content is in, transparent, while the box grows to it.
    expect(paneShown(box)).toEqual(['b']);
    expect(content.style.opacity).toBe('0');
    expect(content.inert).toBe(false);
    expect(box.style.height).toBe('160px');
    const grow = await finishRunning();
    expect(grow.element).toBe(box);
    expect(grow.keyframes).toEqual([{ height: '100px' }, { height: '160px' }]);
    expect(grow.options.duration).toBe(200);

    // Fade in, then the box hands its height back to the content.
    const fadeIn = await finishRunning();
    expect(fadeIn.element).toBe(content);
    expect(fadeIn.keyframes).toEqual([{ opacity: '0' }, { opacity: '1' }]);
    expect(box.hasAttribute(SwapTransitionAttribute)).toBe(false);
    expect(box.style.height).toBe('');
    expect(box.style.overflow).toBe('');
    expect(content.style.opacity).toBe('');
  });

  it('takes its phase lengths and easing from the props', async () => {
    const { pane } = mountSwap({ duration: 320, fadeDuration: 60, easing: 'linear' });
    pane.value = 'b';
    await nextTick();
    const fadeOut = await finishRunning();
    const grow = await finishRunning();

    expect(fadeOut.options).toMatchObject({ duration: 60, easing: 'linear' });
    expect(grow.options).toMatchObject({ duration: 320, easing: 'linear' });
  });

  it('swaps back from the middle of a swap, continuing from the height and opacity on screen', async () => {
    const { pane, box, content } = mountSwap();
    pane.value = 'b';
    await nextTick();
    await finishRunning();
    const grow = animations.at(-1)!;

    // The entering pane is cancelled mid-height and leaves at once — it is still transparent; the first pane returns.
    pane.value = 'a';
    await flushPromises();
    await nextTick();
    expect(grow.isSettled).toBe(true);
    expect(paneShown(box)).toEqual(['a']);
    const shrink = await finishRunning();
    expect(shrink.keyframes).toEqual([{ height: '160px' }, { height: '100px' }]);
    await finishRunning();

    expect(animations.every((animation) => animation.isSettled)).toBe(true);
    expect(box.hasAttribute(SwapTransitionAttribute)).toBe(false);
    expect(box.style.height).toBe('');
    expect(content.style.opacity).toBe('');
  });

  it('swaps instantly under prefers-reduced-motion', async () => {
    isReducedMotion = true;
    const { pane, box, content } = mountSwap();
    await nextTick();
    pane.value = 'b';
    await flushPromises();

    expect(paneShown(box)).toEqual(['b']);
    expect(animations).toHaveLength(0);
    expect(box.hasAttribute(SwapTransitionAttribute)).toBe(false);
    expect(box.style.height).toBe('');
    expect(content.style.opacity).toBe('');
  });

  it('swaps instantly when disabled', async () => {
    const { pane, box } = mountSwap({ isEnabled: false });
    pane.value = 'b';
    await flushPromises();

    expect(paneShown(box)).toEqual(['b']);
    expect(animations).toHaveLength(0);
  });

  it('animates the height down to empty content when the child goes away', async () => {
    const { pane, box } = mountSwap();
    pane.value = null;
    await nextTick();
    await finishRunning();

    expect(paneShown(box)).toEqual([]);
    const shrink = await finishRunning();
    expect(shrink.keyframes).toEqual([{ height: '100px' }, { height: '0px' }]);
    expect(box.hasAttribute(SwapTransitionAttribute)).toBe(false);
    expect(box.style.height).toBe('');
  });

  it('moves focus out of the leaving content to the box, and drops the marks once focus moves on', async () => {
    const { pane, box } = mountSwap();
    box.querySelector<HTMLButtonElement>('button')!.focus();
    pane.value = 'b';
    await nextTick();

    expect(document.activeElement).toBe(box);
    expect(box.getAttribute('tabindex')).toBe('-1');
    expect(box.hasAttribute('data-focus-target')).toBe(true);

    await finishRunning();
    await finishRunning();
    await finishRunning();
    box.querySelector<HTMLButtonElement>('button')!.focus();
    expect(box.hasAttribute('tabindex')).toBe(false);
    expect(box.hasAttribute('data-focus-target')).toBe(false);
  });

  it('leaves focus outside the swapped content alone', async () => {
    const outside = document.createElement('button');
    document.body.append(outside);
    const { pane, box } = mountSwap();
    outside.focus();
    pane.value = 'b';
    await nextTick();

    expect(document.activeElement).toBe(outside);
    expect(box.hasAttribute('tabindex')).toBe(false);
  });

  it('cancels its running phase on unmount', async () => {
    const { wrapper, pane } = mountSwap();
    pane.value = 'b';
    await nextTick();
    const fadeOut = animations[0]!;
    wrapper.unmount();
    wrappers.splice(wrappers.indexOf(wrapper), 1);

    expect(fadeOut.isSettled).toBe(true);
  });
});
