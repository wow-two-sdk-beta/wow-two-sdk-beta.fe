import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import { cdp, page, server, userEvent } from 'vitest/browser';
/* Brings the Playwright provider's typing of `cdp()` (its `send`) into the test's type graph. */
import type {} from '@vitest/browser-playwright';
import { BottomSheet, BottomSheetTitle, Drawer, DrawerContent, DrawerTitle } from '@src/presentation/overlays';
import '@src/index.css';

/*
 * Outside dismissal and touch drag with real input. The modal focus scope makes everything outside the panel inert,
 * the scrim beside it included, so only real hit testing shows whether an outside tap reaches anything; and only a
 * real touch shows whether the browser keeps a handle drag or takes it back as a scroll with `pointercancel`.
 * Chromium drives a finger through the DevTools protocol; the other engines click with the mouse and replay the
 * pointer stream a finger produces.
 */

const Phone = { width: 390, height: 844 } as const;

let wrapper: VueWrapper | null = null;
let changes: boolean[] = [];

beforeAll(async () => {
  await page.viewport(Phone.width, Phone.height);
});

afterAll(async () => {
  await page.viewport(414, 896);
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  changes = [];
  document.body.innerHTML = '';
});

const dialog = (): HTMLElement | null => document.querySelector<HTMLElement>('[role=dialog]');

/** Waits for the open state, then jumps the entry motion to its resting frame. */
async function settle(): Promise<HTMLElement> {
  await expect.poll(() => dialog()?.getAttribute('data-state')).toBe('open');
  for (const animation of document.getAnimations()) animation.finish();
  await new Promise((resolve) => setTimeout(resolve, 250));
  return dialog()!;
}

/** The test frame is scaled into the runner's window; the protocol speaks the window's coordinates. */
function toWindow(x: number, y: number): { x: number; y: number } {
  const frame = window.frameElement?.getBoundingClientRect();
  const scale = frame ? frame.width / window.innerWidth : 1;
  return { x: (frame?.left ?? 0) + x * scale, y: (frame?.top ?? 0) + y * scale };
}

/** A finger down at the first point, through the rest, then up — Chromium only. */
async function finger(
  start: { x: number; y: number },
  path: ReadonlyArray<{ x: number; y: number }> = [],
): Promise<void> {
  const session = cdp();
  const first = toWindow(start.x, start.y);
  const rest = path.map((point) => toWindow(point.x, point.y));
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first] });
  for (const point of rest) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

/** A tap where a finger (Chromium) or the mouse lands, hit-tested by the browser. */
async function tapAt(x: number, y: number): Promise<void> {
  if (server.browser === 'chromium') await finger({ x, y });
  else await userEvent.click(page.elementLocator(document.documentElement), { position: { x, y }, force: true });
}

/** The pointer stream a finger produces on the element, for engines without a touch driver. */
function replayTouch(target: Element, fromY: number, toY: number, end: 'pointerup' | 'pointercancel'): void {
  const fire = (type: string, clientY: number): void => {
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 11,
        pointerType: 'touch',
        isPrimary: true,
        button: type === 'pointermove' ? -1 : 0,
        clientX: Phone.width / 2,
        clientY,
      }),
    );
  };
  fire('pointerdown', fromY);
  for (let step = 1; step <= 10; step += 1) fire('pointermove', fromY + ((toY - fromY) * step) / 10);
  fire(end, toY);
}

function mountSheet(props: Record<string, unknown> = {}): void {
  wrapper = mount(BottomSheet, {
    props: {
      open: true,
      snapPoints: [390, '85vh'],
      'onUpdate:open': (value: boolean) => changes.push(value),
      ...props,
    },
    slots: {
      default: () => [h(BottomSheetTitle, null, () => 'More'), h('p', { style: 'height: 200px' }, 'Places')],
    },
    attachTo: document.body,
  });
}

describe('BottomSheet on a phone', () => {
  it('closes on a tap outside the sheet, and not on a tap inside it', async () => {
    mountSheet();
    const panel = await settle();
    const inside = panel.getBoundingClientRect();
    await tapAt(Phone.width / 2, inside.top + inside.height / 2);
    await nextTick();
    expect(changes).toEqual([]);

    await tapAt(Phone.width / 2, 120);
    await expect.poll(() => changes).toEqual([false]);
  });

  it('stays open on an outside tap when outside dismissal is off', async () => {
    mountSheet({ canDismissOnOutsideClick: false });
    await settle();
    await tapAt(Phone.width / 2, 120);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(changes).toEqual([]);
  });

  it('keeps a finger drag on its handle and closes when dragged below the lowest height', async () => {
    mountSheet();
    const panel = await settle();
    const handle = panel.querySelector<HTMLElement>('[role=separator]')!;
    expect(getComputedStyle(handle).touchAction).toBe('none');
    const box = handle.getBoundingClientRect();
    const start = box.top + box.height / 2;

    if (server.browser === 'chromium') {
      const path = Array.from({ length: 10 }, (_, step) => ({ x: Phone.width / 2, y: start + (step + 1) * 30 }));
      await finger({ x: Phone.width / 2, y: start }, path);
    } else {
      replayTouch(handle, start, start + 300, 'pointerup');
    }
    await expect.poll(() => changes).toEqual([false]);
  });

  it('returns to its height when the browser cancels the drag', async () => {
    mountSheet();
    const panel = await settle();
    const handle = panel.querySelector<HTMLElement>('[role=separator]')!;
    const box = handle.getBoundingClientRect();
    replayTouch(handle, box.top + 4, box.top + 304, 'pointercancel');
    await nextTick();
    expect(changes).toEqual([]);
    expect(panel.style.height).toBe('390px');
  });
});

describe('Drawer', () => {
  it('closes on a click outside the panel, and not on one inside it', async () => {
    wrapper = mount(Drawer, {
      props: { open: true, side: 'left', 'onUpdate:open': (value: boolean) => changes.push(value) },
      slots: {
        default: () =>
          h(DrawerContent, { style: 'width: 280px' }, () => [
            h(DrawerTitle, null, () => 'Navigation'),
            h('p', 'Places'),
          ]),
      },
      attachTo: document.body,
    });
    await settle();
    await tapAt(100, 400);
    await nextTick();
    expect(changes).toEqual([]);

    await tapAt(340, 400);
    await expect.poll(() => changes).toEqual([false]);
  });
});
