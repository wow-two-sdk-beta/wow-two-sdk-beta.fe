<script lang="ts">
import {
  computed,
  defineComponent,
  shallowRef,
  useAttrs,
  useTemplateRef,
  watch,
  type PropType,
  type StyleValue,
} from 'vue';

import type { NoticePriority } from '../../../feedback';
import { cn, OverlayPosition, Severity, Side } from '../../../foundation/styles';
import { ToastSurface } from '../toast/ToastSurface';
import type { ToastNode } from './ToastNode';
import type { ToastSeverity } from './ToastSeverity';

/** Defines how a toast shows the time left before it dismisses itself. */
export const ToastTimer = {
  /** Refers to no countdown — the toast still expires on time. */
  None: 'none',
  /** Refers to a bar draining along the toast's bottom edge. */
  Bar: 'bar',
  /** Refers to a ring draining beside the close button. */
  Ring: 'ring',
  /** Refers to a ring around the close button, with a dim arc for elapsed time. */
  CloseRing: 'closeRing',
  /** Refers to the whole seconds left, counted beside the close button. */
  Seconds: 'seconds',
} as const;

export type ToastTimer = (typeof ToastTimer)[keyof typeof ToastTimer];

/** Defines the entry and exit motion of a toast stack. */
export const ToastMotion = {
  /** Refers to a horizontal slide in from the side of the selected corner. */
  SideSlide: 'sideSlide',
  /** Refers to a short move toward the selected top or bottom edge. */
  ShortSlide: 'shortSlide',
  /** Refers to a move by the card's height toward the selected top or bottom edge. */
  EdgeSlide: 'edgeSlide',
  /** Refers to a move toward the edge while scaling to full size. */
  SlideAndSettle: 'slideAndSettle',
} as const;

export type ToastMotion = (typeof ToastMotion)[keyof typeof ToastMotion];

/** Defines how a group shows a new arrival. */
export const ToastGroupMotion = {
  /** Refers to a preview that passes over the stack and merges into its group. */
  Card: 'card',
  /** Refers to an in-place update whose count briefly glows. */
  Highlight: 'highlight',
} as const;

export type ToastGroupMotion = (typeof ToastGroupMotion)[keyof typeof ToastGroupMotion];

/** Defines props for the toast viewport. */
export interface ToastHostProps {
  /** The corner or centered edge the stack grows from. Defaults to top-right. */
  readonly position?: OverlayPosition;

  /** The entry and exit motion of the cards. Defaults to `ToastMotion.SideSlide`. */
  readonly motion?: ToastMotion;

  /** The motion a group shows for a new arrival. Defaults to `ToastGroupMotion.Highlight`. */
  readonly groupMotion?: ToastGroupMotion;

  /** The maximum number of cards shown at rest, subject to viewport height. Default 5. */
  readonly max?: number;

  /** The time cards take to slide together after an exit, in ms. Default 200. Set to 0 for an instant reflow. */
  readonly moveDuration?: number;

  /**
   * The auto-dismiss delay in ms for a severity missing from `durations`; per-toast `duration` overrides.
   * Default 5000. `Infinity` to disable.
   */
  readonly defaultDuration?: number;

  /**
   * The auto-dismiss delay in ms per severity; per-toast `duration` overrides, and a severity left out falls
   * back to `defaultDuration`. Default `DefaultToastDurations` — errors stay 8 seconds. Replaces, never merges.
   */
  readonly durations?: Readonly<Partial<Record<ToastSeverity, number>>>;

  /** The display lifetime in ms per priority; unclassified notices count as Normal. */
  readonly priorityDurations?: Readonly<Partial<Record<NoticePriority, number>>>;

  /** The switch for holding the expiry clocks while the stack is hovered or focused. Default `true`. */
  readonly canPauseOnHover?: boolean;

  /** The default for showing Pin on timed cards; a toast's `canPin` overrides. Default `true`. */
  readonly canPin?: boolean;

  /** The space between cards, in px. Default 8. */
  readonly gap?: number;

  /**
   * The display each auto-dismissing toast shows its time left in; a toast's `timer` overrides. Every display
   * pauses with the expiry timer and restarts on update. Pinned, sticky and running toasts show none. Reduced
   * motion drops bars and rings. Custom `content` uses a bar for any visible timer. Default `ToastTimer.None`.
   */
  readonly timer?: ToastTimer;

  /** The switch for each severity's glyph on toasts given no `icon`; a toast's `showSeverityIcon` overrides. */
  readonly showSeverityIcon?: boolean;

  /** The card material; a toast's `surface` overrides. Default `ToastSurface.Solid`. */
  readonly surface?: ToastSurface;

  /**
   * The key that moves focus to the card nearest the anchor, or `false` for none; Escape returns it. The stack's
   * name includes it. Default `'F8'`.
   */
  readonly hotkey?: string | false;
}

/** @internal The vertical presets: entry offset and scale, entry and exit durations, and easing. */
const VerticalMotions = {
  [ToastMotion.ShortSlide]: {
    offset: '12px',
    scale: 1,
    enter: '200ms',
    exit: '150ms',
    easing: 'cubic-bezier(0, 0, 0.2, 1)',
  },
  [ToastMotion.EdgeSlide]: {
    offset: 'calc(100% + 1rem)',
    scale: 1,
    enter: '260ms',
    exit: '180ms',
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
  [ToastMotion.SlideAndSettle]: {
    offset: '24px',
    scale: 0.97,
    enter: '240ms',
    exit: '140ms',
    easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  },
} as const;

/** @internal Renders a `ToastNode` — either a plain string or a caller-built VNode. */
const ToastNodeView = defineComponent({
  name: 'ToastNodeView',
  props: { node: { type: [String, Object] as PropType<ToastNode>, required: true } },
  setup: (nodeProps) => () => nodeProps.node,
});
</script>

<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next';

import { AnimationDefaults } from '../../../foundation/animation';
import { useReducedMotion } from '../../../foundation/device';
import { dataAttr, Key } from '../../../foundation/dom';
import { useLocale } from '../../../foundation/i18n';
import { Icon } from '../../../foundation/icons';
import { Announce, Portal, Presence } from '../../../foundation/primitives';
import { Button } from '../../actions/button';
import ReportAction from '../reportAction/ReportAction.vue';
import Toast from '../toast/Toast.vue';
import { compareOrder, toastHost } from './ToastHostStore';
import {
  GroupArrivalClass,
  GroupCountClass,
  ItemClass,
  OverflowButtonClass,
  PositionClasses,
  SideSlideClasses,
  StackClass,
  StackInsets,
  UpdateHighlightClass,
  VerticalSlideClass,
} from './ToastHostStyles';
import type { ToastOptions } from './ToastOptions';
import ToastProgress from './ToastProgress.vue';
import ToastRing from './ToastRing.vue';
import ToastSeconds from './ToastSeconds.vue';
import { DefaultToastDurations, useResolvedToasts, type VisibleToast } from './UseResolvedToasts';
import { useToastAnnouncer } from './UseToastAnnouncer';
import { useToastCapacity } from './UseToastCapacity';
import { useToastClock } from './UseToastClock';
import { useToastEntries } from './UseToastEntries';
import { useToastExits } from './UseToastExits';
import { ToastChange, useToastGroupMotion } from './UseToastGroupMotion';
import { useToastHotkey } from './UseToastHotkey';
import { useToastPins } from './UseToastPins';
import { useToastStackMotion } from './UseToastStackMotion';
import { useToastSwipe } from './UseToastSwipe';

/**
 * Renders the app's transient notification stack. Mount once per app.
 * A caller's `class` and `style` attrs land on the stack container.
 */
defineOptions({ name: 'ToastHost', inheritAttrs: false });

const props = withDefaults(defineProps<ToastHostProps>(), {
  position: OverlayPosition.TopRight,
  motion: ToastMotion.SideSlide,
  groupMotion: ToastGroupMotion.Highlight,
  max: 5,
  moveDuration: AnimationDefaults.duration,
  defaultDuration: 5000,
  durations: () => DefaultToastDurations,
  canPauseOnHover: true,
  canPin: true,
  gap: 8,
  timer: undefined,
  showSeverityIcon: true,
  surface: undefined,
  hotkey: 'F8',
});

const attrs = useAttrs();
const locale = useLocale();
const reducedMotion = useReducedMotion();
const stack = useTemplateRef<HTMLDivElement>('stack');
const overflowButton = useTemplateRef<InstanceType<typeof Button>>('overflowButton');

const expandedDetails = shallowRef<ReadonlySet<string>>(new Set());

/** The stack's position — the prop, else top-right when it names no known position. */
const position = computed(() =>
  Object.hasOwn(PositionClasses, props.position) ? props.position : OverlayPosition.TopRight,
);
const verticalMotion = computed(() =>
  props.motion === ToastMotion.SideSlide ? undefined : VerticalMotions[props.motion],
);

const resolved = useResolvedToasts(useToastEntries(), props);
const pins = useToastPins(resolved, props);
const { overflowOpen, needsScroll, overflowCount, visible, copyOf, measureCapacity, toggleOverflow, ...capacity } =
  useToastCapacity(
    { stack, overflowButton: () => overflowButton.value?.el, cards: resolved, ordered: pins.ordered },
    props,
  );
const activeIds = computed(() => new Set(resolved.value.map((card) => card.id)));
const visibleIds = computed(() => new Set(visible.value.map((card) => card.id)));
const { exiting, removeExiting } = useToastExits(stack, visible, visibleIds, activeIds);

const { swiping, onPointerDown: onSwipeStart } = useToastSwipe({
  stack,
  position: () => position.value,
  reducedMotion,
  dismiss: (id) => toastHost.dismiss(id),
});

const { pausedIds, hasCountdown, countdownKey, timerElapsed, ...clock } = useToastClock(
  {
    stack,
    cards: resolved,
    visible,
    activeIds,
    visibleIds,
    exiting,
    expandedDetails,
    pins,
    browsing: () => overflowOpen.value,
    swiping: () => swiping.value,
    expire: (id) => toastHost.dismiss(id),
  },
  props,
);
const { captureToastChange } = useToastGroupMotion(
  {
    stack,
    visible,
    position: () => position.value,
    groupMotion: () => props.groupMotion,
    reducedMotion,
    scrolls: () => overflowOpen.value || needsScroll.value,
    isExpanded: (id) => expandedDetails.value.has(id),
    copyOf,
  },
  props,
);
const { captureGap } = useToastStackMotion(
  { stack, visible, position: () => position.value, reducedMotion, browsing: () => overflowOpen.value },
  props,
);
const { polite: politeMessage, assertive: assertiveMessage } = useToastAnnouncer(resolved, locale);
const hotkey = useToastHotkey({
  stack,
  hotkey: () => props.hotkey,
  hasCards: () => visible.value.length > 0,
});

const rendered = computed(() =>
  [
    ...visible.value.map((toast) => ({ ...toast, present: true, copy: copyOf(toast) })),
    ...exiting.value.map((toast) => ({ ...toast, present: false, copy: copyOf(toast) })),
  ].sort(compareOrder),
);

const regionLabel = computed(() => {
  const label = locale.t('ToastHost.notifications', undefined, 'Notifications');
  const key = hotkey.label.value;
  return key ? locale.t('ToastHost.notificationsHotkey', { label, hotkey: key }, '{label} ({hotkey})') : label;
});

const overflowLabel = computed(() =>
  overflowOpen.value
    ? locale.t('ToastHost.showFewer', undefined, 'Show fewer notifications')
    : locale.t('ToastHost.showMore', { count: overflowCount.value }, 'Show {count} more notifications'),
);

const stackClasses = computed(() =>
  cn(
    StackClass,
    PositionClasses[position.value],
    (overflowOpen.value || needsScroll.value) && 'overflow-y-auto overscroll-contain',
    overflowOpen.value &&
      (position.value.startsWith('top')
        ? 'scroll-pb-(--toast-overflow-control-height)'
        : 'scroll-pt-(--toast-overflow-control-height)'),
    attrs.class as string | undefined,
  ),
);

const itemClasses = computed(() => {
  const [vertical, horizontal] = position.value.split('-');
  const edge =
    horizontal === Side.Left || horizontal === Side.Right
      ? horizontal
      : vertical === Side.Bottom
        ? Side.Bottom
        : Side.Top;
  return cn(ItemClass, verticalMotion.value ? VerticalSlideClass : SideSlideClasses[edge]);
});

/** The stack's own inline style — insets, gap and group duration, plus the vertical motion's properties. */
const ownStyle = computed(() => {
  const base = { ...StackInsets, gap: `${props.gap}px`, '--toast-group-duration': `${props.moveDuration}ms` };
  const slide = verticalMotion.value;
  if (!slide) return base;
  const bottom = position.value.startsWith('bottom');
  const offset = bottom ? `calc(-1 * ${slide.offset})` : slide.offset;
  return {
    ...base,
    '--toast-motion-origin': bottom ? 'center bottom' : 'center top',
    '--toast-motion-transform': `translateY(${offset}) scale(${slide.scale})`,
    '--toast-motion-enter': slide.enter,
    '--toast-motion-exit': slide.exit,
    '--toast-motion-ease': slide.easing,
  };
});

/** The stack's inline style — its own, then a caller's `style` attr (`--toast-top-offset: 4rem`), which wins. */
const stackStyle = computed<StyleValue>(() => [ownStyle.value, attrs.style as StyleValue]);

// Open details close with their card's exit, or once the card has no details left to show.
watch(
  [resolved, exiting],
  ([cards, leaving]) => {
    if (expandedDetails.value.size === 0) return;
    const open = new Set([...cards.filter((card) => card.details), ...leaving].map((card) => card.id));
    const kept = [...expandedDetails.value].filter((id) => open.has(id));
    if (kept.length !== expandedDetails.value.size) expandedDetails.value = new Set(kept);
  },
  { flush: 'post' },
);

watch(
  () => rendered.value.length,
  (count) => {
    if (count > 0) return;
    clock.release();
    capacity.reset();
  },
);

// The last card leaving hands focus back to where the hotkey found it.
watch(
  () => visible.value.length === 0,
  (empty) => {
    if (empty) hotkey.release();
  },
);

/** Opens or closes a card's details, animating a group's resize. */
function setDetails(id: string, expanded: boolean): void {
  const next = new Set(expandedDetails.value);
  if (expanded) next.add(id);
  else next.delete(id);
  expandedDetails.value = next;
  if (visible.value.some((card) => card.id === id && card.group && card.group.count > 1)) {
    captureToastChange(id, ToastChange.Resize);
  }
}

/** Collapses an open overflow list on Escape first, then returns focus to where the hotkey found it. */
function onKeydown(event: KeyboardEvent): void {
  if (event.key !== Key.Escape) return;
  if (overflowOpen.value) capacity.onEscape(event);
  else hotkey.returnFocus(event);
}

function onFocusout(event: FocusEvent): void {
  clock.onFocusout(event);
  hotkey.onFocusout(event);
}

/** Resolves the card material — the toast's own, the host's, then solid. */
function surfaceOf(t: ToastOptions) {
  return t.surface ?? props.surface ?? ToastSurface.Solid;
}

/** Resolves the timer display a toast gets — its own `timer`, then the host's. Custom `content` uses a bar. */
function timerFor(t: VisibleToast): ToastTimer {
  if (!hasCountdown(t)) return ToastTimer.None;
  const requested = t.timer ?? props.timer ?? ToastTimer.None;
  return t.content && requested !== ToastTimer.None ? ToastTimer.Bar : requested;
}

/** Builds the props a countdown display mirrors from the toast's clock; an exiting card's display holds. */
function countdownOf(t: VisibleToast & { present: boolean }) {
  return {
    duration: t.resolvedDuration,
    elapsed: timerElapsed(t),
    isPaused: !t.present || pausedIds.value.has(t.id),
    severity: t.severity ?? Severity.Neutral,
  };
}
</script>

<template>
  <Portal>
    <div
      v-if="rendered.length > 0"
      ref="stack"
      role="region"
      :data-toast-position="position"
      :aria-label="regionLabel"
      :style="stackStyle"
      :class="stackClasses"
      :data-toast-expanded="dataAttr(overflowOpen)"
      @pointerenter="clock.onPointerEnter"
      @pointerleave="clock.onPointerLeave"
      @pointerdown="onSwipeStart"
      @focusin="clock.onFocusin"
      @focusout="onFocusout"
      @keydown="onKeydown"
    >
      <Presence v-for="t in rendered" :key="t.id" :is-present="t.present">
        <!-- `Presence` keeps this node mounted until the exit ends; `@vue:unmounted` signals it. -->
        <div
          :class="[
            itemClasses,
            t.present ? 'pointer-events-auto motion-safe:data-[state=closed]:opacity-0' : 'pointer-events-none',
            t.group && props.groupMotion === ToastGroupMotion.Card ? 'overflow-visible' : 'overflow-hidden',
          ]"
          :data-toast-exiting="dataAttr(!t.present)"
          :data-toast-id="t.id"
          :data-toast-swiping="dataAttr(t.present && swiping === t.id)"
          tabindex="-1"
          :inert="t.present ? undefined : true"
          @vue:mounted="measureCapacity()"
          @vue:before-unmount="t.present ? undefined : captureGap()"
          @vue:unmounted="t.present ? undefined : removeExiting(t.id)"
        >
          <!-- The host announcer is the only speaker: the card drops `ToastSimple`'s `status` live region. -->
          <ToastNodeView v-if="t.content" :node="t.content" />
          <Toast
            v-else
            :role="undefined"
            aria-live="off"
            :severity="t.severity"
            :surface="surfaceOf(t)"
            :progress="t.progress"
            :show-severity-icon="t.showSeverityIcon ?? props.showSeverityIcon"
            :is-pinned="pins.canPin(t) ? pins.isPinned(t) : undefined"
            :details-open="expandedDetails.has(t.id)"
            :is-compact="overflowOpen"
            :is-grouped="!!t.group && t.group.count > 1"
            :on-delete="t.onDelete"
            @close="toastHost.dismiss(t.id)"
            @toggle-pin="pins.toggle(t.id)"
            @update:details-open="setDetails(t.id, $event)"
          >
            <template v-if="t.icon" #icon><ToastNodeView :node="t.icon" /></template>
            <template v-if="t.copy.title" #title><ToastNodeView :node="t.copy.title" /></template>
            <template v-if="t.copy.description" #description>
              <span v-if="t.group && t.group.count > 1" data-toast-group-count-highlight :class="GroupCountClass">
                <ToastNodeView :node="t.copy.description" />
              </span>
              <ToastNodeView v-else :node="t.copy.description" />
            </template>
            <template v-if="t.action || t.report" #actions>
              <ToastNodeView v-if="t.action" :node="t.action" />
              <ReportAction v-if="t.report" :send="t.report" />
            </template>
            <template v-if="t.details" #details><ToastNodeView :node="t.details" /></template>
            <template v-if="timerFor(t) === ToastTimer.Ring" #trailing>
              <ToastRing :key="countdownKey(t)" v-bind="countdownOf(t)" :data-toast-timer="ToastTimer.Ring" />
            </template>
            <template v-else-if="timerFor(t) === ToastTimer.Seconds" #trailing>
              <ToastSeconds :key="countdownKey(t)" v-bind="countdownOf(t)" :data-toast-timer="ToastTimer.Seconds" />
            </template>
            <template v-if="timerFor(t) === ToastTimer.CloseRing" #closeIndicator>
              <ToastRing
                :key="countdownKey(t)"
                v-bind="countdownOf(t)"
                :data-toast-timer="ToastTimer.CloseRing"
                is-around-close
              />
            </template>
          </Toast>
          <ToastProgress v-if="timerFor(t) === ToastTimer.Bar" :key="countdownKey(t)" v-bind="countdownOf(t)" />
          <span v-if="!t.content" aria-hidden="true" data-toast-update-highlight :class="UpdateHighlightClass" />
          <Toast
            v-if="t.group && t.group.count > 1 && props.groupMotion === ToastGroupMotion.Card"
            data-toast-group-arrival
            aria-hidden="true"
            aria-live="off"
            role="presentation"
            inert
            :class="GroupArrivalClass"
            :title="t.group.latest.title ?? locale.t('ToastHost.groupArrival', undefined, 'New notification')"
            :description="t.group.latest.description"
            :severity="t.group.latest.severity"
            :surface="surfaceOf(t)"
            :progress="t.progress"
            :show-severity-icon="props.showSeverityIcon"
          />
        </div>
      </Presence>
      <Button
        v-if="overflowCount > 0 || overflowOpen"
        ref="overflowButton"
        variant="outline"
        size="sm"
        data-toast-overflow
        :data-toast-surface="props.surface === ToastSurface.Glass ? ToastSurface.Glass : undefined"
        :aria-expanded="overflowOpen"
        :class="[OverflowButtonClass, position.startsWith('top') ? 'bottom-0' : 'top-0']"
        @click="toggleOverflow"
      >
        <span class="min-w-0 [overflow-wrap:anywhere]">{{ overflowLabel }}</span>
        <template #trailing>
          <Icon
            :icon="ChevronDown"
            :size="14"
            class="shrink-0"
            :class="{ 'rotate-180': position.startsWith('bottom') !== overflowOpen }"
          />
        </template>
      </Button>
    </div>
    <Announce politeness="polite" data-toast-announcer="polite">{{ politeMessage }}</Announce>
    <Announce politeness="assertive" data-toast-announcer="assertive">{{ assertiveMessage }}</Announce>
  </Portal>
</template>
