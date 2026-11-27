import { buildMeasurements, itemOffset, itemSize, measurementsTotalSize } from './Measurements';
import { computeRange } from './Windowing';
import { computed, nextTick, shallowRef, watch, type ComputedRef, type Ref, type ShallowRef } from 'vue';

/** The most items a window renders while it widens to keep a focused item mounted. */
export const MaxKeptWindowItems = 200;

/** Chooses a bounded page from the number of viewports consumed per second. */
export function continuationSize(speed: number, viewportSize: number, minimum: number, maximum: number): number {
  const screensPerSecond = (speed * 1000) / Math.max(1, viewportSize);
  return Math.min(maximum, minimum * Math.max(1, Math.ceil(screensPerSecond / 1.5)));
}

/** Configures windowing, measurement and continuation requests for an existing paged list. */
export interface UseAdaptiveWindowOptions {
  readonly count: () => number;
  readonly grid: () => boolean;
  /** `true` renders only the window; `false` renders every item. Requests follow `canLoad` alone. */
  readonly isWindowed: () => boolean;
  readonly canLoad: () => boolean;
  readonly pageSizes: () => { minimum: number; maximum: number };
  readonly load: (limit: number) => Promise<boolean>;
  readonly rowIndex: (element: Element) => number | undefined;
  /** An item the window keeps mounted (the focused one), up to `MaxKeptWindowItems` rendered items. */
  readonly keepIndex?: () => number | undefined;
  readonly estimatedRowHeight: number;
  /** A grid row's estimate before it is measured: card width / this ratio, plus the row gap. */
  readonly cardAspectRatio: number;
}

/** The window over the loaded items and the padding that stands in for the rest. */
export interface AdaptiveRange {
  readonly start: number;
  readonly end: number;
  readonly paddingStart: number;
  readonly paddingEnd: number;
}

/** What `useAdaptiveWindow` returns. */
export interface AdaptiveWindow {
  readonly range: ComputedRef<AdaptiveRange>;
  readonly columns: ComputedRef<number>;
  /** The list's part of the viewport: px of the list scrolled past, and the visible height. */
  readonly viewport: Readonly<ShallowRef<{ offset: number; height: number }>>;
  /** The nearest scrolling ancestor, `null` for the document. */
  readonly scroller: Readonly<ShallowRef<HTMLElement | null>>;
  /** Scrolls so `offset` px of the list sit above the viewport top. */
  scrollListTo(offset: number, behavior: ScrollBehavior): void;
  /**
   * Records the first item whose bottom is below the viewport top, identified by `keyAt(index)`; the returned restore,
   * after the DOM update, moves the scroller by how far that item's top moved.
   */
  anchor(keyAt: (index: number) => unknown): () => Promise<void>;
}

/** Windows the loaded content within its page scroller and prefetches using velocity and measured request latency. */
export function useAdaptiveWindow(list: Ref<HTMLElement | null>, options: UseAdaptiveWindowOptions): AdaptiveWindow {
  const layout = shallowRef({ width: 0, columns: 1, rowSize: options.estimatedRowHeight });
  const viewport = shallowRef({ offset: 0, height: 0 });
  const scroller = shallowRef<HTMLElement | null>(null);
  const heights = new Map<number, number>();
  const measurementVersion = shallowRef(0);
  const rowCount = computed(() => Math.ceil(options.count() / layout.value.columns));
  const measured = computed(() => {
    void measurementVersion.value;
    return buildMeasurements(rowCount.value, (index) => heights.get(index) ?? layout.value.rowSize);
  });
  const range = computed<AdaptiveRange>(() => {
    const count = options.count();
    if (!options.isWindowed() || !viewport.value.height)
      return { start: 0, end: count, paddingStart: 0, paddingEnd: 0 };
    const { columns } = layout.value;
    const rows = measured.value;
    const window = computeRange({
      scrollOffset: viewport.value.offset,
      viewportSize: viewport.value.height,
      itemCount: rowCount.value,
      getOffset: (index: number) => itemOffset(rows, index),
      overscan: options.grid() ? 2 : 6,
    });
    let first = window.startIndex;
    let last = window.endIndex;
    const keep = options.keepIndex?.();
    if (keep !== undefined && keep >= 0 && keep < count) {
      const row = Math.floor(keep / columns);
      const widened = { first: Math.min(first, row), last: Math.max(last, row) };
      if ((widened.last - widened.first + 1) * columns <= MaxKeptWindowItems) ({ first, last } = widened);
    }
    if (rowCount.value === 0) return { start: 0, end: 0, paddingStart: 0, paddingEnd: 0 };
    return {
      start: first * columns,
      end: Math.min(count, (last + 1) * columns),
      paddingStart: itemOffset(rows, first),
      paddingEnd: Math.max(0, measurementsTotalSize(rows) - itemOffset(rows, last) - itemSize(rows, last)),
    };
  });

  let queue: (() => void) | undefined;
  /* The request in flight belongs to the hook, not to one attachment: a switch between a list and a grid must not
     start a second. */
  let loading = false;
  watch(
    [list, options.grid],
    ([element], _previous, onCleanup) => {
      const window = element?.ownerDocument.defaultView;
      if (!element || !window) return;
      const document = element.ownerDocument;
      let found = element.parentElement;
      while (found && !/^(auto|scroll|overlay)$/.test(window.getComputedStyle(found).overflowY))
        found = found.parentElement;
      scroller.value = found;
      const scrollTarget = found ?? window;
      let frame = 0;
      let lastPosition = found?.scrollTop ?? window.scrollY;
      let lastMotion = window.performance.now();
      let speed = 0;
      let latency = 250;
      let attached = true;
      heights.clear();
      measurementVersion.value++;

      function read() {
        frame = 0;
        if (!element || !window) return;
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        const width = element.clientWidth;
        const grid = options.grid();
        const columns = grid ? Math.max(1, style.gridTemplateColumns.trim().split(/\s+/).length) : 1;
        const gap = grid ? Number.parseFloat(style.rowGap) || 0 : 0;
        const cardWidth = (width - (columns - 1) * gap) / columns;
        const rowSize = grid ? Math.max(1, cardWidth / options.cardAspectRatio + gap) : options.estimatedRowHeight;
        if (width !== layout.value.width || columns !== layout.value.columns || rowSize !== layout.value.rowSize) {
          layout.value = { width, columns, rowSize };
          heights.clear();
          measurementVersion.value++;
        }

        /* A grid row is as tall as its tallest rendered card plus the row gap; a list row is its own height. */
        const sizes = new Map<number, number>();
        for (const child of element.children) {
          const index = options.rowIndex(child);
          if (index === undefined) continue;
          const size = child.getBoundingClientRect().height;
          if (size <= 0) continue;
          const row = Math.floor(index / columns);
          sizes.set(row, Math.max(sizes.get(row) ?? 0, size + gap));
        }
        let changed = false;
        for (const [row, size] of sizes)
          if (heights.get(row) !== size) {
            heights.set(row, size);
            changed = true;
          }
        if (changed) measurementVersion.value++;

        const top = found ? found.getBoundingClientRect().top + found.clientTop : 0;
        const height = found?.clientHeight ?? document.documentElement.clientHeight;
        const bottom = top + height;
        const offset = Math.max(0, top - rect.top);
        const visibleHeight = Math.max(1, bottom - Math.max(top, rect.top));
        if (offset !== viewport.value.offset || visibleHeight !== viewport.value.height)
          viewport.value = { offset, height: visibleHeight };

        const now = window.performance.now();
        const position = found?.scrollTop ?? window.scrollY;
        const moved = position - lastPosition;
        if (moved !== 0) {
          const sample = Math.max(0, moved) / Math.max(16, now - lastMotion);
          speed = 0.35 * speed * Math.exp(-(now - lastMotion) / 300) + 0.65 * sample;
          lastMotion = now;
          lastPosition = position;
        }
        const velocity = speed * Math.exp(-(now - lastMotion) / 300);
        const lookahead = Math.min(4 * height, 0.75 * height + velocity * (latency + 150));
        if (options.canLoad() && !loading && height > 0 && rect.top < bottom && rect.bottom - bottom <= lookahead) {
          const { minimum, maximum } = options.pageSizes();
          loading = true;
          void options.load(continuationSize(velocity, height, minimum, maximum)).then(
            (loaded) => {
              loading = false;
              if (loaded && attached) {
                latency = 0.7 * latency + 0.3 * (window.performance.now() - now);
                schedule();
              }
            },
            () => {
              loading = false;
            },
          );
        }
      }

      function schedule() {
        if (!frame && window) frame = window.requestAnimationFrame(read);
      }

      queue = schedule;
      scrollTarget.addEventListener('scroll', schedule, { passive: true });
      const observer = new ResizeObserver(schedule);
      observer.observe(element);
      if (found) observer.observe(found);
      window.addEventListener('resize', schedule);
      schedule();
      onCleanup(() => {
        attached = false;
        queue = undefined;
        scrollTarget.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        observer.disconnect();
        window.cancelAnimationFrame(frame);
      });
    },
    { flush: 'post' },
  );

  watch([options.count, options.isWindowed, options.canLoad, range], () => queue?.(), { flush: 'post' });

  function viewportTop(): number {
    return scroller.value ? scroller.value.getBoundingClientRect().top + scroller.value.clientTop : 0;
  }

  function scrollBy(delta: number, behavior: ScrollBehavior) {
    const window = list.value?.ownerDocument.defaultView;
    if (!delta || !window) return;
    if (scroller.value) {
      if (typeof scroller.value.scrollBy === 'function') scroller.value.scrollBy({ top: delta, behavior });
      else scroller.value.scrollTop += delta;
    } else window.scrollBy({ top: delta, behavior });
  }

  function scrollListTo(offset: number, behavior: ScrollBehavior) {
    const element = list.value;
    if (!element) return;
    scrollBy(element.getBoundingClientRect().top - viewportTop() + offset, behavior);
  }

  function anchor(keyAt: (index: number) => unknown): () => Promise<void> {
    const element = list.value;
    if (!element) return () => Promise.resolve();
    const top = viewportTop();
    let key: unknown;
    let before = 0;
    for (const child of element.children) {
      const index = options.rowIndex(child);
      if (index === undefined) continue;
      const rect = child.getBoundingClientRect();
      if (rect.bottom > top) {
        key = keyAt(index);
        before = rect.top;
        break;
      }
    }
    return async () => {
      await nextTick();
      if (key === undefined || !list.value) return;
      for (const child of list.value.children) {
        const index = options.rowIndex(child);
        if (index === undefined || keyAt(index) !== key) continue;
        scrollBy(child.getBoundingClientRect().top - before, 'auto');
        return;
      }
    };
  }

  return {
    range,
    columns: computed(() => layout.value.columns),
    viewport,
    scroller,
    scrollListTo,
    anchor,
  };
}
