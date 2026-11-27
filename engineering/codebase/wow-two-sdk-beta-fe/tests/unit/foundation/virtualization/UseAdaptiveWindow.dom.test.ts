import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, effectScope, h, nextTick, reactive, shallowRef } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAdaptiveWindow, type UseAdaptiveWindowOptions } from '@src/foundation/virtualization';

/*
 * happy-dom lays nothing out, so the geometry the hook reads — rects, client sizes, the scroll position, the grid's
 * computed columns — comes from `scene`, and time and animation frames are driven by hand. Each frame runs the hook's
 * `read()`, which is where every measurement, window and continuation request happens.
 */

const view = document.defaultView!;

interface Scene {
  scrollTop: number;
  viewport: number;
  listTop: number;
  width: number;
  columns: number;
  gap: number;
  contentHeight: () => number;
  rowHeight: (index: number) => number | undefined;
}

let scene: Scene;
let now = 1000;
let frames = new Map<number, FrameRequestCallback>();
let nextFrame = 1;
let scroller: HTMLElement | null = null;
let list: HTMLElement;

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  readonly observed = new Set<Element>();
  disconnected = false;

  constructor(readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }

  observe(target: Element): void {
    this.observed.add(target);
  }

  unobserve(target: Element): void {
    this.observed.delete(target);
  }

  disconnect(): void {
    this.observed.clear();
    this.disconnected = true;
  }

  /** Reports a size change, as the browser does for any observed element. */
  trigger(): void {
    this.callback([], this as unknown as ResizeObserver);
  }
}

function rectFor(element: Element): DOMRect {
  let top = 0;
  let height = 0;
  if (element === scroller) height = scene.viewport;
  else if (element === list) {
    top = scene.listTop - scene.scrollTop;
    height = scene.contentHeight();
  } else {
    const row = element.getAttribute('data-row');
    height = row === null ? 0 : (scene.rowHeight(Number(row)) ?? 0);
  }
  return {
    top,
    bottom: top + height,
    height,
    left: 0,
    right: scene.width,
    width: scene.width,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

const originalComputedStyle = view.getComputedStyle.bind(view);
const originalScrollY = Object.getOwnPropertyDescriptor(view, 'scrollY');

beforeEach(() => {
  scene = {
    scrollTop: 0,
    viewport: 500,
    listTop: 0,
    width: 320,
    columns: 3,
    gap: 10,
    contentHeight: () => 0,
    rowHeight: () => undefined,
  };
  now = 1000;
  frames = new Map();
  nextFrame = 1;
  FakeResizeObserver.instances = [];
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  vi.spyOn(view, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.set(nextFrame, callback);
    return nextFrame++;
  });
  vi.spyOn(view, 'cancelAnimationFrame').mockImplementation((id) => {
    frames.delete(id);
  });
  vi.spyOn(view.performance, 'now').mockImplementation(() => now);
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return rectFor(this);
  });
  vi.spyOn(view, 'getComputedStyle').mockImplementation((element, pseudo) => {
    const style = originalComputedStyle(element, pseudo);
    if (element !== list) return style;
    return {
      ...style,
      gridTemplateColumns: Array.from({ length: scene.columns }, () => '100px').join(' '),
      rowGap: `${scene.gap}px`,
    } as CSSStyleDeclaration;
  });
  Object.defineProperty(view, 'scrollY', { configurable: true, get: () => scene.scrollTop });
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, get: () => scene.viewport });
});

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (originalScrollY) Object.defineProperty(view, 'scrollY', originalScrollY);
  else Reflect.deleteProperty(view, 'scrollY');
  Reflect.deleteProperty(document.documentElement, 'clientHeight');
});

/** Runs the animation frames that are queued now; returns how many ran. */
function runFrames(): number {
  const queued = [...frames.entries()];
  frames.clear();
  for (const [, callback] of queued) callback(now);
  return queued.length;
}

/** Lets promises, Vue's flush and the follow-up frames they schedule play out until nothing is left to do. */
async function settle(): Promise<void> {
  for (let round = 0; round < 40; round += 1) {
    await flushPromises();
    if (runFrames() === 0) {
      await flushPromises();
      if (frames.size === 0) return;
    }
  }
  throw new Error('the window never settled');
}

interface State {
  count: number;
  grid: boolean;
  enabled: boolean;
  canLoad: boolean;
  minimum: number;
  maximum: number;
}

type Load = (limit: number) => Promise<boolean>;

interface Options {
  /** Mounts the list inside a scrolling element; without it the page itself scrolls. */
  readonly isScrollable?: boolean;
  readonly state?: Partial<State>;
  /** Builds the load; the default request never answers, so one request stays in flight. */
  readonly load?: (state: State) => Load;
  /** The height the list reports, where the rows' own estimate would not do. */
  readonly contentHeight?: number;
}

/** A load whose answers the test gives: `answers[n]` settles the nth request. */
function manualLoad() {
  const answers: Array<{ resolve: (loaded: boolean) => void; reject: (reason: unknown) => void }> = [];
  const load: Load = () =>
    new Promise<boolean>((resolve, reject) => {
      answers.push({ resolve, reject });
    });
  return { load, answers };
}

/** Mounts a harness that renders one `li` per windowed item, and settles the first measurement. */
async function mountWindow(options: Options = {}) {
  const state = reactive<State>({
    count: 100,
    grid: false,
    enabled: true,
    canLoad: false,
    minimum: 20,
    maximum: 100,
    ...options.state,
  });
  const load = vi.fn<Load>(options.load?.(state) ?? (() => new Promise<boolean>(() => undefined)));
  const listRef = shallowRef<HTMLElement | null>(null);
  let range!: ReturnType<typeof useAdaptiveWindow>['range'];
  const hookOptions: UseAdaptiveWindowOptions = {
    count: () => state.count,
    grid: () => state.grid,
    isWindowed: () => state.enabled,
    canLoad: () => state.canLoad,
    pageSizes: () => ({ minimum: state.minimum, maximum: state.maximum }),
    load,
    rowIndex: (element) => (element.hasAttribute('data-row') ? Number(element.getAttribute('data-row')) : undefined),
    estimatedRowHeight: 100,
    cardAspectRatio: 1.5,
  };
  scene.contentHeight = () => options.contentHeight ?? state.count * 100;

  const wrapper = mount(
    defineComponent({
      setup() {
        range = useAdaptiveWindow(listRef, hookOptions).range;
        return () =>
          h(
            'div',
            { class: 'scroller', style: options.isScrollable === false ? '' : 'overflow-y: auto' },
            h(
              'ul',
              { ref: listRef },
              Array.from({ length: range.value.end - range.value.start }, (_, offset) => {
                const index = range.value.start + offset;
                return h('li', { key: index, ...(state.grid ? {} : { 'data-row': index }) });
              }),
            ),
          );
      },
    }),
    { attachTo: document.body },
  );
  wrappers.push(wrapper);
  await nextTick();
  scroller = options.isScrollable === false ? null : (wrapper.get('.scroller').element as HTMLElement);
  list = wrapper.get('ul').element as HTMLElement;
  if (scroller) Object.defineProperty(scroller, 'scrollTop', { configurable: true, get: () => scene.scrollTop });
  Object.defineProperty(list, 'clientWidth', { configurable: true, get: () => scene.width });
  if (scroller) Object.defineProperty(scroller, 'clientHeight', { configurable: true, get: () => scene.viewport });
  await settle();
  return { wrapper, state, load, range: () => range.value };
}

/** Moves the scroll position `after` milliseconds from now, as the browser does: a scroll event, then a frame. */
async function scrollTo(position: number, after = 0): Promise<void> {
  scene.scrollTop = position;
  now += after;
  (scroller ?? view).dispatchEvent(new Event('scroll'));
  await settle();
}

describe('useAdaptiveWindow range', () => {
  it('renders the whole list until the viewport is measured', () => {
    const scope = effectScope();
    scope.run(() => {
      const state = reactive({ count: 30 });
      const { range } = useAdaptiveWindow(shallowRef<HTMLElement | null>(null), {
        count: () => state.count,
        grid: () => false,
        isWindowed: () => true,
        canLoad: () => false,
        pageSizes: () => ({ minimum: 10, maximum: 50 }),
        load: async () => false,
        rowIndex: () => undefined,
        estimatedRowHeight: 80,
        cardAspectRatio: 1,
      });
      expect(range.value).toEqual({ start: 0, end: 30, paddingStart: 0, paddingEnd: 0 });
      state.count = 12;
      expect(range.value).toEqual({ start: 0, end: 12, paddingStart: 0, paddingEnd: 0 });
    });
    scope.stop();
  });

  it('windows a list from its estimated row height, with six rows of overscan', async () => {
    const { range } = await mountWindow();
    /* Rows 0-4 fill the 500px viewport, and six more render below them. */
    expect(range()).toEqual({ start: 0, end: 11, paddingStart: 0, paddingEnd: 8900 });
  });

  it('moves the window as the page scrolls, padding what it skips', async () => {
    const { range } = await mountWindow();
    await scrollTo(3000);
    /* Rows 30-34 are visible; six rows of overscan reach 24 and 40. */
    expect(range()).toEqual({ start: 24, end: 41, paddingStart: 2400, paddingEnd: 5900 });
  });

  it('ends the window at the last row at the bottom of the list', async () => {
    const { range } = await mountWindow();
    await scrollTo(9500);
    expect(range()).toEqual({ start: 89, end: 100, paddingStart: 8900, paddingEnd: 0 });
  });

  it('clamps a scroll position past the end to the last window', async () => {
    const { range } = await mountWindow();
    await scrollTo(99999);
    expect(range().end).toBe(100);
    expect(range().paddingEnd).toBe(0);
  });

  it('replaces the estimate with the height of each row that rendered', async () => {
    const { range } = await mountWindow();
    scene.rowHeight = () => 50;
    /* A resize makes the hook read again: the rendered rows are 50px, not the estimated 100px. */
    FakeResizeObserver.instances[0]!.trigger();
    await settle();
    /* Rows 0-9 fill the viewport and six more render; the 84 rows that never rendered keep the 100px estimate. */
    expect(range()).toEqual({ start: 0, end: 16, paddingStart: 0, paddingEnd: 8400 });
  });

  it('weighs each row by its own measured height', async () => {
    const { range } = await mountWindow();
    scene.rowHeight = (index) => (index < 3 ? 400 : 100);
    FakeResizeObserver.instances[0]!.trigger();
    await settle();
    /* Rows 0 and 1 (400px each) are the only rows that start inside the viewport; six more render. */
    expect(range()).toEqual({ start: 0, end: 8, paddingStart: 0, paddingEnd: 9200 });
  });

  it('shows the whole list while the window is disabled, and windows it once enabled', async () => {
    const { range, state } = await mountWindow({ state: { enabled: false } });
    expect(range()).toEqual({ start: 0, end: 100, paddingStart: 0, paddingEnd: 0 });
    state.enabled = true;
    await settle();
    expect(range()).toEqual({ start: 0, end: 11, paddingStart: 0, paddingEnd: 8900 });
  });

  it('follows the item count', async () => {
    const { range, state } = await mountWindow();
    state.count = 8;
    await settle();
    expect(range()).toEqual({ start: 0, end: 8, paddingStart: 0, paddingEnd: 0 });
    state.count = 0;
    await settle();
    expect(range()).toEqual({ start: 0, end: 0, paddingStart: 0, paddingEnd: 0 });
  });

  it('counts the scroll into the list from where the list starts in the scroller', async () => {
    const { range } = await mountWindow();
    scene.listTop = 200;
    await scrollTo(200);
    /* Scrolled 200px, the list's first row meets the scroller's top edge. */
    expect(range().start).toBe(0);
    await scrollTo(1200);
    /* 1000px into the list: rows 10-14 are visible. */
    expect(range()).toEqual({ start: 4, end: 21, paddingStart: 400, paddingEnd: 7900 });
  });

  it('windows against the page when no ancestor scrolls', async () => {
    const { range } = await mountWindow({ isScrollable: false });
    expect(range()).toEqual({ start: 0, end: 11, paddingStart: 0, paddingEnd: 8900 });
    await scrollTo(3000);
    expect(range()).toEqual({ start: 24, end: 41, paddingStart: 2400, paddingEnd: 5900 });
  });
});

describe('useAdaptiveWindow grid', () => {
  /* A 320px list of three columns with 10px gaps has 100px cards; at a 1.5 ratio a row is 100 / 1.5 + 10 = 76.7px. */
  const RowSize = 100 / 1.5 + 10;

  it('windows whole rows of cards, with two rows of overscan', async () => {
    const { range } = await mountWindow({ state: { grid: true, count: 50 } });
    /* 17 rows in all: rows 0-6 start inside the 500px viewport, two more render. */
    expect(range().start).toBe(0);
    expect(range().end).toBe(27);
    expect(range().paddingStart).toBe(0);
    expect(range().paddingEnd).toBeCloseTo((17 - 9) * RowSize);
  });

  it('starts and ends the window on a row, however far it scrolls', async () => {
    const { range } = await mountWindow({ state: { grid: true, count: 50 } });
    for (const position of [0, 123, 400, 777, 5000]) {
      await scrollTo(position);
      const { start, end } = range();
      expect(start % 3, `start at ${position}`).toBe(0);
      expect(end % 3 === 0 || end === 50, `end at ${position}`).toBe(true);
    }
  });

  it('pads the rows it skips at the row height', async () => {
    const { range } = await mountWindow({ state: { grid: true, count: 50 } });
    await scrollTo(400);
    /* Row 5 is first in view; two rows of overscan start the window at row 3, and row 11 is last in view. */
    expect(range().start).toBe(9);
    expect(range().paddingStart).toBeCloseTo(3 * RowSize);
    expect(range().end).toBe(42);
  });

  it('counts the columns again when the width changes', async () => {
    const { range } = await mountWindow({ state: { grid: true, count: 50 } });
    scene.columns = 2;
    scene.width = 210;
    FakeResizeObserver.instances[0]!.trigger();
    await settle();
    /* Two 100px cards and a 10px gap make rows of two, so the window ends on an even item. */
    expect(range().start).toBe(0);
    expect(range().end).toBe(18);
  });

  it('reads the layout again when the list switches between a list and a grid', async () => {
    const { range, state } = await mountWindow({ state: { count: 50 } });
    expect(range().end).toBe(11);
    state.grid = true;
    await settle();
    expect(range().end).toBe(27);
    state.grid = false;
    await settle();
    expect(range().end).toBe(11);
  });

  it('reads the layout again on a window resize', async () => {
    const { range } = await mountWindow({ state: { grid: true, count: 50 } });
    scene.columns = 1;
    scene.width = 100;
    view.dispatchEvent(new Event('resize'));
    await settle();
    expect(range().end).toBe(9);
  });
});

describe('useAdaptiveWindow continuation', () => {
  it('loads nothing while loading is not allowed', async () => {
    const { load } = await mountWindow({ state: { count: 6, canLoad: false } });
    expect(load).not.toHaveBeenCalled();
  });

  it('still requests while windowing is off, because requests follow canLoad alone', async () => {
    const { load, range } = await mountWindow({ state: { count: 6, canLoad: true, enabled: false } });
    expect(load).toHaveBeenCalledTimes(1);
    expect(range()).toEqual({ start: 0, end: 6, paddingStart: 0, paddingEnd: 0 });
  });

  it('loads nothing while canLoad is false', async () => {
    const { load } = await mountWindow({ state: { count: 6, canLoad: false } });
    expect(load).not.toHaveBeenCalled();
  });

  it('requests the minimum page when the end of the list is within 75 percent of a viewport', async () => {
    const { load } = await mountWindow({ state: { count: 6, canLoad: true } });
    /* The list ends 100px below the 500px viewport, inside the 375px of lookahead. */
    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith(20);
  });

  it('waits while the end of the list is farther away than the lookahead', async () => {
    const { load } = await mountWindow({ state: { count: 20, canLoad: true } });
    expect(load).not.toHaveBeenCalled();
  });

  it.each([
    [875, 1],
    [876, 0],
  ])('draws the lookahead line at 75 percent of the viewport: a %ipx list asks %i times', async (height, calls) => {
    /* The list ends 375px below the viewport at 875px: on the line. At 876px it is one pixel beyond it. */
    const { load } = await mountWindow({ state: { canLoad: true }, contentHeight: height });
    expect(load).toHaveBeenCalledTimes(calls);
  });

  it('loads once the end comes into range by scrolling', async () => {
    const { load } = await mountWindow({ state: { count: 15, canLoad: true } });
    expect(load).not.toHaveBeenCalled();
    /* Slowly: 1000px in ten seconds, which leaves the list ending at the viewport's foot. */
    await scrollTo(1000, 10_000);
    expect(load).toHaveBeenCalledWith(20);
  });

  it('starts loading when loading becomes allowed', async () => {
    const { load, state } = await mountWindow({ state: { count: 6, canLoad: false } });
    expect(load).not.toHaveBeenCalled();
    state.canLoad = true;
    await settle();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('keeps one request in flight, however often the page scrolls or resizes', async () => {
    const { load } = await mountWindow({ state: { count: 6, canLoad: true } });
    expect(load).toHaveBeenCalledTimes(1);

    await scrollTo(10, 5000);
    FakeResizeObserver.instances[0]!.trigger();
    await settle();
    view.dispatchEvent(new Event('resize'));
    await settle();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('keeps one request in flight across a switch between a list and a grid, and asks again once it lands', async () => {
    const answers = manualLoad();
    const { load, state } = await mountWindow({ state: { count: 6, canLoad: true }, load: () => answers.load });
    expect(load).toHaveBeenCalledTimes(1);
    state.grid = true;
    await settle();
    expect(load).toHaveBeenCalledTimes(1);

    answers.answers[0]!.resolve(false);
    await flushPromises();
    await scrollTo(5, 1000);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('asks again after a page lands while the end is still within range, until it is out of range', async () => {
    const { load, state } = await mountWindow({
      state: { count: 6, canLoad: true },
      load: (state) => async () => {
        state.count += 1;
        return true;
      },
    });
    /* Each page adds a 100px row: the list ends 100, 200 and 300px below the viewport, then 400px, past the 375px. */
    expect(load).toHaveBeenCalledTimes(3);
    expect(state.count).toBe(9);
  });

  it('follows a page that landed with another read, and a page that did not with none', async () => {
    const answers = manualLoad();
    await mountWindow({ state: { count: 6, canLoad: true }, load: () => answers.load });
    expect(frames.size).toBe(0);

    answers.answers[0]!.resolve(true);
    await flushPromises();
    expect(frames.size).toBe(1);
  });

  it('schedules no follow-up when the load reports nothing more, and asks again on the next scroll', async () => {
    const answers = manualLoad();
    const { load } = await mountWindow({ state: { count: 6, canLoad: true }, load: () => answers.load });
    expect(load).toHaveBeenCalledTimes(1);

    answers.answers[0]!.resolve(false);
    await flushPromises();
    expect(frames.size).toBe(0);
    expect(load).toHaveBeenCalledTimes(1);

    /* Only `canLoad` ends the asking: the next scroll still finds the end in range. */
    await scrollTo(5, 1000);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('survives a rejected load: no follow-up, and the next scroll tries again', async () => {
    const answers = manualLoad();
    const { load } = await mountWindow({ state: { count: 6, canLoad: true }, load: () => answers.load });
    answers.answers[0]!.reject(new Error('offline'));
    await flushPromises();
    expect(frames.size).toBe(0);
    expect(load).toHaveBeenCalledTimes(1);

    await scrollTo(5, 1000);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('requests a larger page the faster the reader scrolls', async () => {
    const { load } = await mountWindow({ state: { count: 15, canLoad: true, maximum: 200 } });
    expect(load).not.toHaveBeenCalled();
    /*
     * 300px in 100ms is 3px/ms; the smoothed speed is 0.65 * 3 = 1.95px/ms, 3.9 viewports a second: three pages of 20.
     * The faster pace also stretches the lookahead to 375 + 1.95 * 400 = 1155px, so the list ending 700px below
     * the viewport is now in range.
     */
    await scrollTo(300, 100);
    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith(60);
  });

  it('does not reach for a distant end when the same distance is scrolled slowly', async () => {
    const { load } = await mountWindow({ state: { count: 15, canLoad: true, maximum: 200 } });
    /* The same 300px over ten seconds is 0.0195px/ms: a lookahead of 383px, short of the 700px to the end. */
    await scrollTo(300, 10_000);
    expect(load).not.toHaveBeenCalled();
  });

  it('caps a fast scroll at the maximum page', async () => {
    const { load } = await mountWindow({ state: { count: 30, canLoad: true, maximum: 50 } });
    await scrollTo(2000, 20);
    expect(load).toHaveBeenCalledWith(50);
  });

  it('reads the page sizes when it asks, so changed limits apply at once', async () => {
    const { load, state } = await mountWindow({ state: { count: 6, canLoad: false } });
    state.minimum = 35;
    state.canLoad = true;
    await settle();
    expect(load).toHaveBeenLastCalledWith(35);
  });

  it('shortens the lookahead as the last answer arrives quicker than the 250ms it starts from', async () => {
    const answers = manualLoad();
    const { load } = await mountWindow({ state: { count: 17, canLoad: true }, load: () => answers.load });
    expect(load).not.toHaveBeenCalled();
    /* Scrolled 300px at 1.95px/ms, a 1700px list ends 900px below the viewport, inside the 1155px lookahead. */
    await scrollTo(300, 100);
    expect(load).toHaveBeenCalledTimes(1);

    /*
     * The answer takes 100ms: latency becomes 0.7 * 250 + 0.3 * 100 = 205ms. Its follow-up read sees the speed decayed
     * by exp(-100 / 300) to 1.397px/ms, a lookahead of 375 + 1.397 * (205 + 150) = 871px, short of the 900px that
     * remain. With the starting latency of 250ms it would be 934px, and the hook would ask again.
     */
    now += 100;
    answers.answers[0]!.resolve(true);
    await settle();
    expect(load).toHaveBeenCalledTimes(1);
  });
});

describe('useAdaptiveWindow lifetime', () => {
  it('observes the list and the scroller, and disconnects at unmount', async () => {
    const { wrapper } = await mountWindow();
    const observer = FakeResizeObserver.instances[0]!;
    expect([...observer.observed]).toEqual([list, scroller]);
    wrapper.unmount();
    wrappers.pop();
    expect(observer.disconnected).toBe(true);
  });

  it('stops reading after unmount: scrolls and resizes schedule nothing', async () => {
    const { wrapper } = await mountWindow();
    wrapper.unmount();
    wrappers.pop();
    frames.clear();
    scroller!.dispatchEvent(new Event('scroll'));
    view.dispatchEvent(new Event('resize'));
    expect(frames.size).toBe(0);
  });

  it('cancels the frame that is waiting at unmount', async () => {
    const { wrapper } = await mountWindow();
    scroller!.dispatchEvent(new Event('scroll'));
    expect(frames.size).toBe(1);
    wrapper.unmount();
    wrappers.pop();
    expect(frames.size).toBe(0);
  });

  it('does not read again when a load lands after unmount', async () => {
    const answers = manualLoad();
    const { wrapper, load } = await mountWindow({ state: { count: 6, canLoad: true }, load: () => answers.load });
    expect(load).toHaveBeenCalledTimes(1);
    wrapper.unmount();
    wrappers.pop();
    answers.answers[0]!.resolve(true);
    await flushPromises();
    expect(frames.size).toBe(0);
  });

  it('listens on the window for a page scroll, and detaches from it at unmount', async () => {
    const add = vi.spyOn(view, 'addEventListener');
    const remove = vi.spyOn(view, 'removeEventListener');
    const { wrapper } = await mountWindow({ isScrollable: false });
    expect(add.mock.calls.map(([type]) => type)).toEqual(expect.arrayContaining(['scroll', 'resize']));
    wrapper.unmount();
    wrappers.pop();
    expect(remove.mock.calls.map(([type]) => type)).toEqual(expect.arrayContaining(['scroll', 'resize']));
  });
});
