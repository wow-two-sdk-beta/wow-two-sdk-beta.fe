import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, nextTick, ref } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import CanvasArea, { type CanvasViewport } from '@src/presentation/layout/canvasArea/CanvasArea.vue';
import {
  clampToContent,
  fitViewport,
  wheelPixels,
  wheelZoomFactor,
  zoomAt,
} from '@src/presentation/layout/canvasArea/CanvasMath';

/** The measured sizes every mounted area reports: the area box, and the plane's untransformed content. */
const sizes = { area: { width: 400, height: 300 }, plane: { width: 800, height: 600 } };

/** Spies on the prototype that owns a layout getter, so each element answers from `sizes`. */
function measureAs(property: 'clientWidth' | 'clientHeight' | 'offsetWidth' | 'offsetHeight'): void {
  let owner: object | null = HTMLDivElement.prototype;
  while (owner && !Object.getOwnPropertyDescriptor(owner, property)) owner = Object.getPrototypeOf(owner);
  if (!owner) throw new Error(`No ${property} getter to measure`);
  vi.spyOn(owner as HTMLElement, property, 'get').mockImplementation(function (this: HTMLElement) {
    const box = this.hasAttribute('data-canvas-plane') ? sizes.plane : sizes.area;
    return property.endsWith('Width') ? box.width : box.height;
  });
}

const wrappers: VueWrapper[] = [];
beforeEach(() => {
  sizes.area = { width: 400, height: 300 };
  sizes.plane = { width: 800, height: 600 };
  for (const property of ['clientWidth', 'clientHeight', 'offsetWidth', 'offsetHeight'] as const) measureAs(property);
});
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.restoreAllMocks();
});

function render(props: Record<string, unknown> = {}) {
  const wrapper = mount(CanvasArea, {
    props,
    slots: { default: () => h('button', { type: 'button', class: 'node' }, 'Service') },
    attachTo: document.body,
  });
  wrappers.push(wrapper);
  return wrapper;
}

/** Reads the plane's rendered translate and scale back out of its inline transform. */
function rendered(wrapper: VueWrapper): CanvasViewport {
  const style = wrapper.get('[data-canvas-plane]').attributes('style') ?? '';
  const match = /translate\((-?[\d.e-]+)px, (-?[\d.e-]+)px\) scale\(([\d.e-]+)\)/.exec(style);
  if (!match) throw new Error(`No transform in "${style}"`);
  return { x: Number(match[1]), y: Number(match[2]), zoom: Number(match[3]) };
}

function lastEmitted(wrapper: VueWrapper): CanvasViewport | undefined {
  return (wrapper.emitted('update:viewport')?.at(-1) as [CanvasViewport] | undefined)?.[0];
}

/** Builds a wheel event; happy-dom drops modifiers and coordinates from the init dictionary, so they are set after. */
function wheel(init: WheelEventInit): WheelEvent {
  const event = new WheelEvent('wheel', { cancelable: true, ...init });
  for (const key of ['ctrlKey', 'metaKey', 'shiftKey', 'clientX', 'clientY'] as const)
    if (init[key] !== undefined) Object.defineProperty(event, key, { value: init[key] });
  return event;
}

function pointer(type: string, init: PointerEventInit & { pointerId?: number }): PointerEvent {
  return new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, pointerType: 'mouse', ...init });
}

describe('canvas viewport math', () => {
  it('keeps the anchor over the same content point while zooming', () => {
    const next = zoomAt({ x: 10, y: 20, zoom: 1 }, 2, { x: 110, y: 70 });
    expect(next).toEqual({ x: -90, y: -30, zoom: 2 });
    // Content point under the anchor before: (110 - 10) / 1 = 100; after: (110 - -90) / 2 = 100.
  });
  it('centers a short axis and clamps a long one between its edges', () => {
    const area = { width: 400, height: 300 };
    const content = { width: 800, height: 100 };
    expect(clampToContent({ x: 50, y: -40, zoom: 1 }, area, content)).toEqual({ x: 0, y: 100, zoom: 1 });
    expect(clampToContent({ x: -900, y: 0, zoom: 1 }, area, content)).toEqual({ x: -400, y: 100, zoom: 1 });
  });
  it('fits all content, centered, never above the cap', () => {
    const fitted = fitViewport({ width: 400, height: 300 }, { width: 800, height: 600 }, 16, 0.25, 1);
    expect(fitted.zoom).toBeCloseTo(268 / 600);
    expect(fitted.x).toBeCloseTo((400 - 800 * fitted.zoom) / 2);
    expect(fitted.y).toBeCloseTo(16);
    expect(fitViewport({ width: 400, height: 300 }, { width: 100, height: 50 }, 16, 0.25, 1)).toEqual({
      x: 150,
      y: 125,
      zoom: 1,
    });
    expect(fitViewport({ width: 0, height: 0 }, { width: 100, height: 50 }, 16, 0.25, 1)).toEqual({
      x: 0,
      y: 0,
      zoom: 1,
    });
  });
  it('turns wheel units into pixels and a shifted vertical wheel sideways', () => {
    expect(wheelPixels(new WheelEvent('wheel', { deltaY: 3, deltaMode: 1 }), 300)).toEqual({ x: 0, y: 48 });
    expect(wheelPixels(new WheelEvent('wheel', { deltaY: 1, deltaMode: 2 }), 300)).toEqual({ x: 0, y: 300 });
    expect(wheelPixels(wheel({ deltaY: 30, shiftKey: true }), 300)).toEqual({ x: 30, y: 0 });
    expect(wheelZoomFactor(-100) * wheelZoomFactor(100)).toBeCloseTo(1);
    expect(wheelZoomFactor(-5000)).toBeCloseTo(wheelZoomFactor(-100));
  });
});

describe('canvas area viewport ownership', () => {
  it('opens at actual size at the top-left of content larger than the area', async () => {
    const wrapper = render();
    await nextTick();
    expect(rendered(wrapper)).toEqual({ x: 0, y: 0, zoom: 1 });
    expect(wrapper.get('[aria-label="100%, reset zoom"]').text()).toBe('100%');
  });
  it('seeds a fitted opening view without emitting intent', async () => {
    const wrapper = render({ initialZoom: 'fit' });
    await nextTick();
    const view = rendered(wrapper);
    expect(view.zoom).toBeCloseTo(268 / 600);
    expect(wrapper.emitted('update:viewport')).toBeUndefined();
  });
  it('zooms one step about the area center from the controls and reports it', async () => {
    const wrapper = render();
    await nextTick();
    await wrapper.get('[aria-label="Zoom in"]').trigger('click');
    const next = lastEmitted(wrapper);
    expect(next?.zoom).toBeCloseTo(1.25);
    // Center (200, 150) stays over content point (200, 150): 200 - 200 * 1.25 = -50.
    expect(next?.x).toBeCloseTo(-50);
    expect(next?.y).toBeCloseTo(-37.5);
    expect(rendered(wrapper)).toEqual(next);
    expect(wrapper.find('[aria-label="125%, reset zoom"]').exists()).toBe(true);
  });
  it('lets a controlled parent own the viewport', async () => {
    const viewport = ref<CanvasViewport>({ x: -100, y: -50, zoom: 1 });
    const outer = mount({
      setup: () => () =>
        h(
          CanvasArea,
          { viewport: viewport.value, 'onUpdate:viewport': (next: CanvasViewport) => (viewport.value = next) },
          { default: () => h('div', 'plane') },
        ),
    });
    wrappers.push(outer);
    await nextTick();
    const area = outer.findComponent(CanvasArea);
    expect(rendered(area)).toEqual({ x: -100, y: -50, zoom: 1 });
    await area.get('[aria-label="Zoom out"]').trigger('click');
    expect(viewport.value.zoom).toBeCloseTo(0.8);
    expect(rendered(area).zoom).toBeCloseTo(0.8);
  });
  it('disables the steps at the zoom bounds and fits from the control', async () => {
    const wrapper = render({ minZoom: 0.5, maxZoom: 1 });
    await nextTick();
    expect(wrapper.get('[aria-label="Zoom in"]').attributes('disabled')).toBeDefined();
    await wrapper.get('[aria-label="Fit to view"]').trigger('click');
    expect(lastEmitted(wrapper)?.zoom).toBeCloseTo(0.5);
    expect(wrapper.get('[aria-label="Zoom out"]').attributes('disabled')).toBeDefined();
  });
  it('replaces the built-in buttons through the controls slot', async () => {
    const wrapper = mount(CanvasArea, {
      slots: {
        default: () => h('div', 'plane'),
        controls: (controls: { percent: number; fit: () => void }) =>
          h('button', { type: 'button', class: 'custom', onClick: controls.fit }, `${controls.percent}`),
      },
    });
    wrappers.push(wrapper);
    await nextTick();
    expect(wrapper.find('[aria-label="Zoom in"]').exists()).toBe(false);
    expect(wrapper.get('.custom').text()).toBe('100');
  });
});

describe('canvas area input', () => {
  it('zooms about the pointer on a modified wheel and always claims it', async () => {
    const wrapper = render();
    await nextTick();
    const event = wheel({ deltaY: -100, ctrlKey: true, clientX: 100, clientY: 60 });
    wrapper.element.dispatchEvent(event);
    await nextTick();
    const next = lastEmitted(wrapper);
    expect(event.defaultPrevented).toBe(true);
    expect(next?.zoom).toBeCloseTo(Math.exp(0.2));
    expect(next?.x).toBeCloseTo(100 - 100 * Math.exp(0.2));
  });
  it('pans on a plain wheel and lets the page scroll once the edge is reached', async () => {
    const wrapper = render();
    await nextTick();
    const inward = new WheelEvent('wheel', { deltaY: 120, cancelable: true });
    wrapper.element.dispatchEvent(inward);
    expect(inward.defaultPrevented).toBe(true);
    expect(lastEmitted(wrapper)).toEqual({ x: 0, y: -120, zoom: 1 });
    const outward = new WheelEvent('wheel', { deltaY: -500, cancelable: true });
    wrapper.element.dispatchEvent(outward);
    const past = new WheelEvent('wheel', { deltaY: -10, cancelable: true });
    wrapper.element.dispatchEvent(past);
    expect(past.defaultPrevented).toBe(false);
  });
  it('zooms on a plain wheel when asked to', async () => {
    const wrapper = render({ wheel: 'zoom' });
    await nextTick();
    const event = new WheelEvent('wheel', { deltaY: 100, cancelable: true });
    wrapper.element.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(lastEmitted(wrapper)?.zoom).toBeCloseTo(Math.exp(-0.2));
  });
  it('pans on a drag and keeps the ending click from the content, but not a plain press', async () => {
    const clicks = vi.fn();
    const wrapper = mount(CanvasArea, {
      slots: { default: () => h('button', { type: 'button', class: 'node', onClick: clicks }, 'Service') },
      attachTo: document.body,
    });
    wrappers.push(wrapper);
    await nextTick();
    const node = wrapper.get('.node').element;
    node.dispatchEvent(pointer('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 }));
    node.dispatchEvent(pointer('pointermove', { pointerId: 1, clientX: 101, clientY: 101 }));
    expect(wrapper.emitted('update:viewport')).toBeUndefined();
    node.dispatchEvent(pointer('pointermove', { pointerId: 1, clientX: 60, clientY: 70 }));
    expect(lastEmitted(wrapper)).toEqual({ x: -40, y: -30, zoom: 1 });
    node.dispatchEvent(pointer('pointerup', { pointerId: 1, clientX: 60, clientY: 70 }));
    node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(clicks).not.toHaveBeenCalled();
    node.dispatchEvent(pointer('pointerdown', { pointerId: 2, clientX: 60, clientY: 70 }));
    node.dispatchEvent(pointer('pointerup', { pointerId: 2, clientX: 60, clientY: 70 }));
    node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(clicks).toHaveBeenCalledTimes(1);
  });
  it('pinch-zooms two pointers about their midpoint', async () => {
    const wrapper = render();
    await nextTick();
    const root = wrapper.element;
    root.dispatchEvent(pointer('pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 100 }));
    root.dispatchEvent(pointer('pointerdown', { pointerId: 2, pointerType: 'touch', clientX: 200, clientY: 100 }));
    root.dispatchEvent(pointer('pointermove', { pointerId: 2, pointerType: 'touch', clientX: 300, clientY: 100 }));
    const next = lastEmitted(wrapper);
    // Separation 100 → 200 doubles the zoom; the midpoint moved from 150 to 200 and carried the plane along.
    expect(next?.zoom).toBeCloseTo(2);
    expect(next?.x).toBeCloseTo(150 - 150 * 2 + 50);
  });
  it('answers zoom and pan keys, and leaves fields their own keys', async () => {
    const wrapper = mount(CanvasArea, {
      slots: { default: () => h('input', { class: 'field' }) },
      attachTo: document.body,
    });
    wrappers.push(wrapper);
    await nextTick();
    await wrapper.trigger('keydown', { key: '+' });
    expect(lastEmitted(wrapper)?.zoom).toBeCloseTo(1.25);
    await wrapper.trigger('keydown', { key: '0' });
    expect(lastEmitted(wrapper)?.zoom).toBe(1);
    await wrapper.trigger('keydown', { key: 'ArrowRight' });
    expect(lastEmitted(wrapper)?.x).toBeCloseTo(-40);
    const count = wrapper.emitted('update:viewport')?.length;
    await wrapper.get('.field').trigger('keydown', { key: '-' });
    expect(wrapper.emitted('update:viewport')?.length).toBe(count);
  });
  it('centers content smaller than the area, and pans an open plane past its edges', async () => {
    sizes.plane = { width: 100, height: 50 };
    const bounded = render();
    await nextTick();
    expect(rendered(bounded)).toEqual({ x: 150, y: 125, zoom: 1 });
    const open = render({ bounds: 'none' });
    await nextTick();
    const event = new WheelEvent('wheel', { deltaY: -100, cancelable: true });
    open.element.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(lastEmitted(open)).toEqual({ x: 0, y: 100, zoom: 1 });
  });
  it('detaches its wheel listener on unmount', async () => {
    const wrapper = render();
    await nextTick();
    const remove = vi.spyOn(wrapper.element, 'removeEventListener');
    wrapper.unmount();
    wrappers.splice(wrappers.indexOf(wrapper), 1);
    expect(remove).toHaveBeenCalledWith('wheel', expect.any(Function));
  });
});
