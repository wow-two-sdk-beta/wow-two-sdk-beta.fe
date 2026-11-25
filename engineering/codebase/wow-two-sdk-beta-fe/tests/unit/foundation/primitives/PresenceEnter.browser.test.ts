import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import { userEvent } from 'vitest/browser';
import { Presence } from '@src/foundation/primitives';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@src/presentation/nav/dropdownMenu';
import { MenuItem } from '@src/presentation/nav/menu';
import '@src/index.css';

/*
 * `Presence` used to mount an entering child at `data-state="closed"` and flip it to `open` two frames
 * later. `closed` is also the exit state, so every keyframe consumer (`data-[state=closed]:animate-pop-out`)
 * painted its EXIT animation first: the overlay appeared fully drawn, faded, then faded in again — the
 * account menu "twitch". The menu test samples every painted frame in a real engine; the transition test reads the
 * transition itself.
 */

let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

interface Frame {
  readonly state: string | undefined;
  readonly opacity: number;
  readonly animations: ReadonlyArray<string>;
}

/** Samples `read` once per frame until it has seen the element for `afterSeenMs`, or `capMs` passes. */
function sampleFrames(read: () => Frame | null, afterSeenMs: number, capMs: number): Promise<Frame[]> {
  const frames: Frame[] = [];
  const start = performance.now();
  let seenAt: number | null = null;
  return new Promise((resolve) => {
    const tick = (): void => {
      const now = performance.now();
      const frame = read();
      if (frame) {
        frames.push(frame);
        seenAt ??= now;
      }
      const done = (seenAt !== null && now - seenAt >= afterSeenMs) || now - start >= capMs;
      if (done) resolve(frames);
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** The menu surface and its animated panel, read as the opacity the reader sees. */
function readMenu(): Frame | null {
  const surface = document.querySelector<HTMLElement>('[role=menu]');
  if (!surface) return null;
  const panel = surface.firstElementChild as HTMLElement | null;
  const opacity = Number(getComputedStyle(surface).opacity) * Number(panel ? getComputedStyle(panel).opacity : 1);
  const animations = [surface, ...(panel ? [panel] : [])].flatMap((node) =>
    node.getAnimations().map((animation) => (animation as CSSAnimation).animationName ?? ''),
  );
  return { state: surface.dataset.state, opacity, animations };
}

describe('foundation/primitives — Presence enter in a real engine', () => {
  it('never paints the exit animation while a menu opens from a click that arrives with the pointer', async () => {
    wrapper = mount(
      defineComponent({
        setup: () => () =>
          h('div', { style: 'display: flex; justify-content: flex-end; padding: 40px' }, [
            h(DropdownMenu, null, () => [
              h(DropdownMenuTrigger, null, () => 'Account'),
              h(DropdownMenuContent, { class: 'w-48' }, () => [
                h(MenuItem, null, () => 'Profile'),
                h(MenuItem, null, () => 'Settings'),
              ]),
            ]),
          ]),
      }),
      { attachTo: document.body },
    );
    const trigger = document.querySelector<HTMLButtonElement>('button[aria-haspopup=menu]')!;

    /* The cap counts from here, click latency included: on a loaded runner the click alone can outlast 1.5 s. */
    const sampling = sampleFrames(readMenu, 120, 6000);
    /* No hover first: the pointer enters and clicks at once, as it does arriving from across the page. */
    await userEvent.click(trigger);
    const frames = await sampling;

    expect(frames.length, 'the menu never appeared').toBeGreaterThan(0);
    expect(
      frames.filter((frame) => frame.state !== 'open' || frame.animations.includes('pop-out')),
      'a frame was painted in the closed state, running the exit animation',
    ).toEqual([]);
    frames.forEach((frame, index) => {
      if (index === 0) return;
      expect(frame.opacity, `opacity fell at frame ${index}`).toBeGreaterThanOrEqual(
        frames[index - 1]!.opacity - 0.001,
      );
    });
  });

  /* `toggle` shows a mounted Presence; `mount` renders a Presence that is present from its first render. */
  it.each(['toggle', 'mount'] as const)('still runs a transition consumer from its closed values (%s)', async (how) => {
    const shown = ref(false);
    const fade = () =>
      h(Presence, { isPresent: how === 'mount' || shown.value }, () =>
        h('div', { id: 'fade', class: 'transition-opacity duration-200 data-[state=closed]:opacity-0' }, 'Body'),
      );
    wrapper = mount(defineComponent({ setup: () => () => (how === 'mount' && !shown.value ? null : fade()) }), {
      attachTo: document.body,
    });

    shown.value = true;
    await nextTick();

    /* The transition is read as an object, not sampled from a painted frame: a runner that is busy before its first
       frame advances the transition meanwhile in WebKit (CI run 45574221347 sampled 0.61 on a 200 ms fade), which
       says nothing about Presence. Whether the consumer left its closed values is Presence's: a consumer rendered
       open at first paint, or opened without the style flush, has no before-change style, so no transition exists. */
    const node = document.getElementById('fade')!;
    const transitions = node
      .getAnimations()
      .filter((animation): animation is CSSTransition => animation instanceof CSSTransition);
    expect(
      transitions.map((transition) => transition.transitionProperty),
      'no opacity transition started: the consumer had no closed state to leave',
    ).toEqual(['opacity']);
    expect(
      (transitions[0]!.effect as KeyframeEffect).getKeyframes().map((keyframe) => keyframe.opacity),
      'the transition did not run from the closed opacity to the open one',
    ).toEqual(['0', '1']);

    await transitions[0]!.finished;
    expect(getComputedStyle(node).opacity).toBe('1');
  });
});
