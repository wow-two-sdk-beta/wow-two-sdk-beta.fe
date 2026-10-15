<script lang="ts">
import type { Breakpoint } from '../appShell/AppShell.vue';

export interface ListDetailLayoutProps {
  /** Whether a detail is open. Below `breakpoint` it replaces the list; drive it from the route so back works. */
  readonly isDetailOpen?: boolean;

  /** The panes sit side by side from this breakpoint; below it one shows at a time. Default `lg`. */
  readonly breakpoint?: Breakpoint;

  /** The list column's width from `breakpoint` up, any CSS length. Default `20rem`. */
  readonly listWidth?: string;

  /** The back control's label. Default the locale's `Back`. */
  readonly backLabel?: string;
}

/* Static per-breakpoint classes, so Tailwind finds every one in the source. */
const SideBySideClass: Record<Breakpoint, string> = {
  sm: 'sm:grid-cols-[var(--ui-list-detail-list-width)_minmax(0,1fr)]',
  md: 'md:grid-cols-[var(--ui-list-detail-list-width)_minmax(0,1fr)]',
  lg: 'lg:grid-cols-[var(--ui-list-detail-list-width)_minmax(0,1fr)]',
  xl: 'xl:grid-cols-[var(--ui-list-detail-list-width)_minmax(0,1fr)]',
  '2xl': '2xl:grid-cols-[var(--ui-list-detail-list-width)_minmax(0,1fr)]',
};

const NarrowHiddenClass: Record<Breakpoint, string> = {
  sm: 'max-sm:hidden',
  md: 'max-md:hidden',
  lg: 'max-lg:hidden',
  xl: 'max-xl:hidden',
  '2xl': 'max-2xl:hidden',
};

const WideHiddenClass: Record<Breakpoint, string> = {
  sm: 'sm:hidden',
  md: 'md:hidden',
  lg: 'lg:hidden',
  xl: 'xl:hidden',
  '2xl': '2xl:hidden',
};

/** The list item a return focuses when the activating control is gone: the one marked selected or current. */
const SelectedItemSelector =
  '[aria-current]:not([aria-current="false"]), [aria-selected="true"], [aria-pressed="true"], [data-selected]';

/** The controls a click in the list may have activated. */
const ActivatorSelector = 'a[href], button, input, select, textarea, summary, [tabindex]';

/** How long a click in the list stays the activator of a detail that opens after it (a route push in between). */
const ActivatorWindowMs = 1000;

/** The detail's focus target on open: an explicit marker first, then its first heading. */
const HeadingSelectors = ['[data-list-detail-heading]', 'h1, h2, h3, h4, h5, h6'] as const;

interface ScrollMark {
  readonly element: Element;
  readonly top: number;
  readonly left: number;
}
</script>

<script setup lang="ts">
import { computed, nextTick, normalizeStyle, useAttrs, useTemplateRef, watch } from 'vue';
import { ChevronLeft } from 'lucide-vue-next';
import { useLocale } from '../../../foundation/i18n';
import { cn } from '../../../foundation/styles';

/**
 * Renders a master-detail page: list and detail side by side from `breakpoint`, one at a time below it. The
 * consumer owns `isDetailOpen`; the layout moves focus and keeps the list's scroll across the swap.
 */
defineOptions({ name: 'ListDetailLayout', inheritAttrs: false });

defineSlots<{
  /** The list pane — items the reader picks a detail from. */
  list(): unknown;
  /** The detail pane's content. Its first heading takes focus when it replaces the list. */
  detail(): unknown;
  /** Replaces the back control shown above the detail below `breakpoint`; call `back` to return to the list. */
  back?(props: { back: () => void; label: string }): unknown;
}>();

const props = withDefaults(defineProps<ListDetailLayoutProps>(), {
  isDetailOpen: false,
  breakpoint: 'lg',
  listWidth: '20rem',
  backLabel: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader asks to return to the list; set `isDetailOpen` to `false` (or step the route back). */
  back: [];
}>();

const attrs = useAttrs();
const locale = useLocale();
const el = useTemplateRef<HTMLDivElement>('el');
const listPane = useTemplateRef<HTMLDivElement>('listPane');
const detailPane = useTemplateRef<HTMLDivElement>('detailPane');

const label = computed(() => props.backLabel ?? locale.t('ListDetailLayout.back', undefined, 'Back'));

const classes = computed(() =>
  cn('grid grid-cols-1', SideBySideClass[props.breakpoint], attrs.class as string | undefined),
);

const rootStyle = computed(() => normalizeStyle([{ '--ui-list-detail-list-width': props.listWidth }, attrs.style]));

const listClasses = computed(() =>
  cn('min-w-0 outline-none', props.isDetailOpen && NarrowHiddenClass[props.breakpoint]),
);

const detailClasses = computed(() =>
  cn('min-w-0 outline-none', !props.isDetailOpen && NarrowHiddenClass[props.breakpoint]),
);

const backRowClasses = computed(() => cn('mb-2', WideHiddenClass[props.breakpoint]));

/** Everything but `class` / `style`, both re-applied above. */
const rest = computed(() => {
  const { class: _class, style: _style, ...others } = attrs;
  return others;
});

function back(): void {
  emit('back');
}

/* What the reader activated in the list, and the list's scroll offsets, captured as the detail replaces it. */
let activator: Element | null = null;
let scrollMarks: ScrollMark[] = [];

/* The last click in the list. WebKit never focuses a clicked button, so focus alone cannot name the activator. */
let lastClick: { readonly target: Element; readonly at: number } | null = null;

function rememberClick(event: Event): void {
  const target = (event.target as Element | null)?.closest?.(ActivatorSelector);
  lastClick = target ? { target, at: performance.now() } : null;
}

function activatorIn(list: Element): Element | null {
  const focused = document.activeElement;
  if (focused && focused !== list && list.contains(focused)) return focused;
  if (lastClick && performance.now() - lastClick.at <= ActivatorWindowMs) return lastClick.target;
  return null;
}

function isHidden(element: Element | null): boolean {
  return element !== null && getComputedStyle(element).display === 'none';
}

/** The nearest ancestor that scrolls vertically, or the document's scroller. */
function scrollParent(element: Element): Element {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const overflow = getComputedStyle(node).overflowY;
    if (/(auto|scroll|overlay)/.test(overflow) && node.scrollHeight > node.clientHeight) return node;
  }
  return document.scrollingElement ?? document.documentElement;
}

function captureScroll(root: Element, list: Element): ScrollMark[] {
  const marks: ScrollMark[] = [];
  const outer = scrollParent(root);
  marks.push({ element: outer, top: outer.scrollTop, left: outer.scrollLeft });
  for (const element of [list, ...list.querySelectorAll('*')]) {
    if (element.scrollTop > 0 || element.scrollLeft > 0)
      marks.push({ element, top: element.scrollTop, left: element.scrollLeft });
  }
  return marks;
}

function restoreScroll(marks: ReadonlyArray<ScrollMark>): void {
  for (const mark of marks) {
    if (!mark.element.isConnected) continue;
    mark.element.scrollTop = mark.top;
    mark.element.scrollLeft = mark.left;
  }
}

function focusWithoutScroll(element: HTMLElement): void {
  if (!element.hasAttribute('tabindex') && element.tabIndex < 0) element.setAttribute('tabindex', '-1');
  element.focus({ preventScroll: true });
}

/** Brings the layout's top edge into view when the swap left it above the scroller's visible area. */
function revealTop(root: HTMLElement): void {
  const outer = scrollParent(root);
  const visibleTop = outer === document.scrollingElement ? 0 : outer.getBoundingClientRect().top;
  if (root.getBoundingClientRect().top < visibleTop) root.scrollIntoView({ block: 'start' });
}

function focusDetail(pane: HTMLElement): void {
  const heading = HeadingSelectors.map((selector) => pane.querySelector<HTMLElement>(selector)).find(Boolean);
  focusWithoutScroll(heading ?? pane);
}

function focusList(pane: HTMLElement): void {
  const remembered = activator?.isConnected && pane.contains(activator) ? (activator as HTMLElement) : null;
  const selected = pane.querySelector<HTMLElement>(SelectedItemSelector);
  focusWithoutScroll(remembered ?? selected ?? pane);
}

/*
 * Runs before the DOM updates, while the outgoing pane is still laid out: that is the only moment its scroll
 * offsets and focus can be read. The swap only happens below `breakpoint` — the incoming pane is hidden — so
 * side by side nothing moves.
 */
watch(
  () => props.isDetailOpen,
  async (isOpen) => {
    const root = el.value;
    const list = listPane.value;
    const detail = detailPane.value;
    if (!root || !list || !detail) return;
    if (isOpen) {
      if (!isHidden(detail)) return;
      activator = activatorIn(list);
      scrollMarks = captureScroll(root, list);
      await nextTick();
      if (!isHidden(list)) return;
      activator ??= list.querySelector(SelectedItemSelector);
      revealTop(root);
      focusDetail(detail);
    } else {
      if (!isHidden(list)) return;
      await nextTick();
      if (isHidden(list)) return;
      restoreScroll(scrollMarks);
      focusList(list);
      scrollMarks = [];
      activator = null;
    }
  },
);

defineExpose({ el });
</script>

<template>
  <div ref="el" v-bind="rest" :style="rootStyle" :class="classes" :data-view="props.isDetailOpen ? 'detail' : 'list'">
    <div ref="listPane" data-list-detail-pane="list" tabindex="-1" :class="listClasses" @click.capture="rememberClick">
      <slot name="list" />
    </div>
    <div ref="detailPane" data-list-detail-pane="detail" tabindex="-1" :class="detailClasses">
      <div :class="backRowClasses">
        <slot name="back" :back="back" :label="label">
          <button
            type="button"
            data-list-detail-back
            class="-ms-2 inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            @click="back"
          >
            <ChevronLeft class="size-4 rtl:-scale-x-100" aria-hidden="true" />
            {{ label }}
          </button>
        </slot>
      </div>
      <slot name="detail" />
    </div>
  </div>
</template>
