import { afterEach, describe, expect, it, vi } from 'vitest';
import { h, nextTick } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
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

/*
 * F09: hover-only arrows, the glass arrow, one-slide arrows that let a click through, and a capture-free touch swipe
 * (harvest v0.2 #19–#21). Layout and real hover live in `CarouselSwipe.browser.test.ts`; this file pins the classes,
 * the attributes and the swipe arithmetic.
 */

const mounted: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
  document.body.innerHTML = '';
});

interface Options {
  readonly slides?: number;
  readonly controls?: CarouselControls;
  readonly variant?: CarouselNavVariant;
  readonly canLoop?: boolean;
  readonly canSwipe?: boolean;
  readonly onSlideClick?: () => void;
}

/** Vue drops an event stamped in the millisecond its listener attached — wait for the clock to move. */
async function settle(): Promise<void> {
  const start = Date.now();
  while (Date.now() === start) await new Promise((resolve) => setTimeout(resolve, 1));
  await nextTick();
}

async function mountCarousel(options: Options = {}): Promise<VueWrapper> {
  const slides = Array.from({ length: options.slides ?? 3 }, (_unused, i) => i);
  const wrapper = mount(
    {
      render: () =>
        h(Carousel, { controls: options.controls, canLoop: options.canLoop }, () => [
          h(CarouselViewport, { canSwipe: options.canSwipe }, () =>
            h(CarouselSlides, null, () =>
              slides.map((i) =>
                h(CarouselSlide, { key: i }, () => [
                  h('a', { href: `#slide-${i}`, onClick: options.onSlideClick }, `Slide ${i + 1}`),
                  h('input', { type: 'range', 'aria-label': `Range ${i + 1}` }),
                ]),
              ),
            ),
          ),
          h(CarouselPrev, { variant: options.variant }),
          h(CarouselNext, { variant: options.variant }),
        ]),
    },
    { attachTo: document.body },
  );
  mounted.push(wrapper);
  await settle();
  return wrapper;
}

const prev = (wrapper: VueWrapper): HTMLButtonElement =>
  wrapper.get<HTMLButtonElement>('[aria-label="Previous slide"]').element;
const next = (wrapper: VueWrapper): HTMLButtonElement =>
  wrapper.get<HTMLButtonElement>('[aria-label="Next slide"]').element;
const viewport = (wrapper: VueWrapper): HTMLElement =>
  wrapper.get<HTMLElement>('[aria-roledescription="carousel"]').element;
const indexOf = (wrapper: VueWrapper): number | undefined =>
  wrapper.findComponent(Carousel).emitted<[number]>('update:index')?.at(-1)?.[0];
const moves = (wrapper: VueWrapper): number => wrapper.findComponent(Carousel).emitted('update:index')?.length ?? 0;

/** A pointer stroke on `target`, bubbling to the viewport the way implicit touch capture delivers it. */
async function stroke(
  target: Element,
  from: { x: number; y: number },
  to: { x: number; y: number },
  pointerType = 'touch',
  end: 'pointerup' | 'pointercancel' = 'pointerup',
): Promise<void> {
  const init = { bubbles: true, cancelable: true, pointerId: 7, pointerType, isPrimary: true, button: 0 };
  target.dispatchEvent(new PointerEvent('pointerdown', { ...init, clientX: from.x, clientY: from.y }));
  target.dispatchEvent(new PointerEvent('pointermove', { ...init, clientX: to.x, clientY: to.y }));
  target.dispatchEvent(new PointerEvent(end, { ...init, clientX: to.x, clientY: to.y }));
  await nextTick();
}

describe('Carousel controls', () => {
  it('shows the arrows always by default', async () => {
    const wrapper = await mountCarousel();
    expect(wrapper.get('div').classes()).toContain('group/carousel');
    expect(next(wrapper).className).not.toContain('opacity-0');
  });

  it('hides the arrows until hover or focus within, and keeps them where the device cannot hover', async () => {
    const wrapper = await mountCarousel({ controls: CarouselControls.Hover, canLoop: true });
    for (const arrow of [prev(wrapper), next(wrapper)]) {
      expect(arrow.className).toContain('opacity-0');
      expect(arrow.className).toContain('group-hover/carousel:opacity-100');
      expect(arrow.className).toContain('group-focus-within/carousel:opacity-100');
      expect(arrow.className).toContain('[@media(hover:none)]:opacity-100');
    }
  });

  it('paints the glass arrow, and the surface arrow by default', async () => {
    const glass = await mountCarousel({ variant: CarouselNavVariant.Glass });
    expect(next(glass).className).toContain('backdrop-blur-md');
    expect(next(glass).className).toContain('text-white');
    expect(next(glass).className).not.toContain('ring-border');
    const surface = await mountCarousel();
    expect(next(surface).className).toContain('ring-border');
  });

  it('disables, dims and makes inert both arrows of a one-slide carousel, looping or not', async () => {
    for (const canLoop of [false, true]) {
      const wrapper = await mountCarousel({ slides: 1, canLoop });
      for (const arrow of [prev(wrapper), next(wrapper)]) {
        expect(arrow.disabled).toBe(true);
        expect(arrow.hasAttribute('inert')).toBe(true);
        expect(arrow.className).toContain('pointer-events-none');
        expect(arrow.className).toContain('opacity-40');
      }
    }
  });

  it('dims a one-slide hover arrow to 40% on reveal rather than full strength', async () => {
    const wrapper = await mountCarousel({ slides: 1, controls: CarouselControls.Hover });
    const classes = next(wrapper).className.split(' ');
    expect(classes).toContain('opacity-0');
    expect(classes).toContain('group-hover/carousel:opacity-40');
    expect(classes).not.toContain('group-hover/carousel:opacity-100');
  });

  it('keeps an edge arrow disabled but reachable to assistive technology', async () => {
    const wrapper = await mountCarousel({ slides: 2 });
    expect(prev(wrapper).disabled).toBe(true);
    expect(prev(wrapper).hasAttribute('inert')).toBe(false);
    expect(next(wrapper).disabled).toBe(false);
  });
});

describe('Carousel swipe', () => {
  it('steps exactly one slide per swipe, either way', async () => {
    const wrapper = await mountCarousel();
    const link = wrapper.get('a').element;
    await stroke(link, { x: 300, y: 40 }, { x: 20, y: 50 });
    expect(indexOf(wrapper)).toBe(1);
    expect(moves(wrapper)).toBe(1);
    await stroke(viewport(wrapper), { x: 20, y: 40 }, { x: 200, y: 40 });
    expect(indexOf(wrapper)).toBe(0);
    expect(moves(wrapper)).toBe(2);
  });

  it('ignores a short stroke, a mostly vertical one, a cancelled one and a mouse drag', async () => {
    const wrapper = await mountCarousel();
    const target = viewport(wrapper);
    await stroke(target, { x: 200, y: 40 }, { x: 160, y: 40 });
    await stroke(target, { x: 200, y: 40 }, { x: 120, y: 160 });
    await stroke(target, { x: 300, y: 40 }, { x: 20, y: 40 }, 'touch', 'pointercancel');
    await stroke(target, { x: 300, y: 40 }, { x: 20, y: 40 }, 'mouse');
    expect(moves(wrapper)).toBe(0);
  });

  it('leaves a stroke that starts on a form control to that control', async () => {
    const wrapper = await mountCarousel();
    await stroke(wrapper.get('input').element, { x: 300, y: 40 }, { x: 20, y: 40 });
    expect(moves(wrapper)).toBe(0);
  });

  it('does not swipe when turned off or with one slide, and only then leaves touch-action alone', async () => {
    const off = await mountCarousel({ canSwipe: false });
    await stroke(viewport(off), { x: 300, y: 40 }, { x: 20, y: 40 });
    expect(moves(off)).toBe(0);
    expect(viewport(off).className).not.toContain('touch-pan-y');

    const single = await mountCarousel({ slides: 1 });
    await stroke(viewport(single), { x: 300, y: 40 }, { x: 20, y: 40 });
    expect(moves(single)).toBe(0);
    expect(viewport(single).className).not.toContain('touch-pan-y');

    const on = await mountCarousel();
    expect(viewport(on).className).toContain('touch-pan-y');
    expect(viewport(on).className).toContain('touch-pinch-zoom');
  });

  it('swallows the click a swipe release fires, and no later one', async () => {
    const onSlideClick = vi.fn();
    const wrapper = await mountCarousel({ onSlideClick });
    const link = wrapper.get('a').element;
    await stroke(link, { x: 300, y: 40 }, { x: 20, y: 40 }, 'pen');
    link.click();
    expect(onSlideClick).not.toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, 5));
    link.click();
    expect(onSlideClick).toHaveBeenCalledTimes(1);
  });

  it('lets a tap click the link it pressed', async () => {
    const onSlideClick = vi.fn();
    const wrapper = await mountCarousel({ onSlideClick });
    const link = wrapper.get('a').element;
    await stroke(link, { x: 100, y: 40 }, { x: 103, y: 41 });
    link.click();
    expect(onSlideClick).toHaveBeenCalledTimes(1);
    expect(moves(wrapper)).toBe(0);
  });

  it('drops the stroke when a second finger lands', async () => {
    const wrapper = await mountCarousel();
    const target = viewport(wrapper);
    const init = { bubbles: true, cancelable: true, pointerType: 'touch', button: 0 };
    target.dispatchEvent(new PointerEvent('pointerdown', { ...init, pointerId: 1, isPrimary: true, clientX: 300 }));
    target.dispatchEvent(new PointerEvent('pointerdown', { ...init, pointerId: 2, isPrimary: false, clientX: 320 }));
    target.dispatchEvent(new PointerEvent('pointerup', { ...init, pointerId: 1, isPrimary: true, clientX: 20 }));
    await nextTick();
    expect(moves(wrapper)).toBe(0);
  });
});
