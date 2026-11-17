import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import { cdp, server, userEvent } from 'vitest/browser';
/* Brings the Playwright provider's typing of `cdp()` (its `send`) into the test's type graph. */
import type {} from '@vitest/browser-playwright';
import {
  Carousel,
  CarouselControls,
  CarouselNavVariant,
  CarouselNext,
  CarouselPrev,
  CarouselSlide,
  CarouselSlides,
  CarouselViewport,
} from '@src/presentation/display';
import '@src/index.css';

/*
 * F09 with real layout and real input (harvest v0.2 #19–#21): hover-revealed arrows, a swipe that steps one slide, a
 * tap that still reaches the link it pressed, and one-slide arrows a click passes through. Chromium drives a finger
 * through the DevTools protocol; WebKit replays the pointer stream a finger produces and clicks with the mouse.
 */

const isChromium = server.browser === 'chromium';

let wrapper: VueWrapper | null = null;
let indexes: number[] = [];
let linkClicks: Array<{ readonly slide: number; readonly wasPrevented: boolean }> = [];

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  indexes = [];
  linkClicks = [];
  document.body.innerHTML = '';
});

interface Options {
  readonly slides?: number;
  readonly controls?: CarouselControls;
}

/** Vue drops an event stamped in the millisecond its listener attached — wait for the clock to move. */
async function settle(): Promise<void> {
  const start = Date.now();
  while (Date.now() === start) await new Promise((resolve) => setTimeout(resolve, 1));
  await nextTick();
}

/** A 320 px card carousel, clear of the page corner where the mouse rests, each slide one full-size link. */
async function mountCard(options: Options = {}): Promise<void> {
  const slides = Array.from({ length: options.slides ?? 3 }, (_unused, i) => i);
  wrapper = mount(
    {
      render: () =>
        h('div', { style: 'width: 320px; margin: 120px 40px' }, [
          h(Carousel, { controls: options.controls, 'onUpdate:index': (index: number) => indexes.push(index) }, () => [
            h(CarouselViewport, null, () =>
              h(CarouselSlides, null, () =>
                slides.map((i) =>
                  h(CarouselSlide, { key: i }, () =>
                    h(
                      'a',
                      {
                        href: `#slide-${i}`,
                        style: 'display: block; height: 180px',
                        onClick: (event: MouseEvent) => {
                          linkClicks.push({ slide: i, wasPrevented: event.defaultPrevented });
                          event.preventDefault();
                        },
                      },
                      `Slide ${i + 1}`,
                    ),
                  ),
                ),
              ),
            ),
            h(CarouselPrev, { variant: CarouselNavVariant.Glass }),
            h(CarouselNext, { variant: CarouselNavVariant.Glass }),
          ]),
        ]),
    },
    { attachTo: document.body },
  );
  await settle();
}

const next = (): HTMLButtonElement => document.querySelector<HTMLButtonElement>('[aria-label="Next slide"]')!;
const prev = (): HTMLButtonElement => document.querySelector<HTMLButtonElement>('[aria-label="Previous slide"]')!;
const viewport = (): HTMLElement => document.querySelector<HTMLElement>('[aria-roledescription="carousel"]')!;
const link = (slide: number): HTMLAnchorElement =>
  document.querySelector<HTMLAnchorElement>(`[href="#slide-${slide}"]`)!;
const opacity = (element: Element): string => getComputedStyle(element).opacity;

/** The test frame is scaled into the runner's window; the protocol speaks the window's coordinates. */
function toWindow(x: number, y: number): { x: number; y: number } {
  const frame = window.frameElement?.getBoundingClientRect();
  const scale = frame ? frame.width / window.innerWidth : 1;
  return { x: (frame?.left ?? 0) + x * scale, y: (frame?.top ?? 0) + y * scale };
}

/** A finger down at `from`, moved in steps to `to`, then lifted — Chromium only. */
async function finger(from: { x: number; y: number }, to: { x: number; y: number } = from): Promise<void> {
  const session = cdp();
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [toWindow(from.x, from.y)] });
  const steps = from.x === to.x && from.y === to.y ? 0 : 8;
  for (let step = 1; step <= steps; step += 1) {
    const point = toWindow(from.x + ((to.x - from.x) * step) / steps, from.y + ((to.y - from.y) * step) / steps);
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

/** The pointer stream a finger produces, for engines without a touch driver; implicit capture keeps it on `target`. */
function replayTouch(target: Element, from: { x: number; y: number }, to: { x: number; y: number }): void {
  const fire = (type: string, x: number, y: number): void => {
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 11,
        pointerType: 'touch',
        isPrimary: true,
        button: type === 'pointermove' ? -1 : 0,
        clientX: x,
        clientY: y,
      }),
    );
  };
  fire('pointerdown', from.x, from.y);
  for (let step = 1; step <= 8; step += 1) {
    fire('pointermove', from.x + ((to.x - from.x) * step) / 8, from.y + ((to.y - from.y) * step) / 8);
  }
  fire('pointerup', to.x, to.y);
}

/** A finger stroke across the viewport, from `fromX` to `toX` (fractions of its width), above the arrows. */
async function swipe(fromX: number, toX: number): Promise<void> {
  const box = viewport().getBoundingClientRect();
  const y = box.top + box.height / 4;
  const from = { x: box.left + box.width * fromX, y };
  const to = { x: box.left + box.width * toX, y: y + 6 };
  if (isChromium) await finger(from, to);
  else replayTouch(document.elementFromPoint(from.x, from.y)!, from, to);
  await new Promise((resolve) => setTimeout(resolve, 50));
}

describe('Carousel hover controls', () => {
  it('keeps the arrows hidden until the carousel is hovered or holds focus', async () => {
    await mountCard({ controls: CarouselControls.Hover });
    expect(opacity(next())).toBe('0');
    expect(opacity(prev())).toBe('0');

    await userEvent.hover(viewport());
    await expect.poll(() => opacity(next())).toBe('1');
    /* The first slide's back arrow has nowhere to go: revealed, but dimmed. */
    await expect.poll(() => opacity(prev())).toBe('0.4');

    await userEvent.unhover(viewport());
    await expect.poll(() => opacity(next())).toBe('0');

    viewport().focus();
    await expect.poll(() => opacity(next())).toBe('1');
    viewport().blur();
    await expect.poll(() => opacity(next())).toBe('0');
  });

  it('shows the arrows from the start by default', async () => {
    await mountCard();
    expect(opacity(next())).toBe('1');
  });
});

describe('Carousel swipe', () => {
  it('moves exactly one slide per swipe, however far it travels', async () => {
    await mountCard();
    await swipe(0.95, 0.02);
    await expect.poll(() => indexes).toEqual([1]);
    await swipe(0.95, 0.02);
    await expect.poll(() => indexes).toEqual([1, 2]);
    await swipe(0.05, 0.98);
    await expect.poll(() => indexes).toEqual([1, 2, 1]);
    /* A swipe is not a tap: the link it started on stays unclicked. */
    expect(linkClicks).toEqual([]);
  });

  it('leaves a tap to the link it pressed', async () => {
    await mountCard();
    if (isChromium) {
      const box = link(0).getBoundingClientRect();
      await finger({ x: box.left + box.width / 2, y: box.top + box.height / 2 });
      await expect.poll(() => linkClicks).toEqual([{ slide: 0, wasPrevented: false }]);
      linkClicks = [];
    }
    await userEvent.click(link(0));
    await expect.poll(() => linkClicks).toEqual([{ slide: 0, wasPrevented: false }]);
    expect(indexes).toEqual([]);
  });
});

describe('Carousel with one slide', () => {
  it('disables both arrows and lets a click on them through to the slide', async () => {
    await mountCard({ slides: 1 });
    for (const arrow of [prev(), next()]) {
      expect(arrow.disabled).toBe(true);
      expect(getComputedStyle(arrow).pointerEvents).toBe('none');
      expect(opacity(arrow)).toBe('0.4');
    }
    await userEvent.click(next(), { force: true });
    await expect.poll(() => linkClicks).toEqual([{ slide: 0, wasPrevented: false }]);
    expect(indexes).toEqual([]);
  });
});
