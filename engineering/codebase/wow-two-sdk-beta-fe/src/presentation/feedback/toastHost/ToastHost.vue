<script lang="ts">
import type { VNode } from 'vue';
import type { OverlayPosition } from '../../../foundation/styles';
import type { ReportSend } from '../../../reporting';
import type { ToastSimpleVariants } from '../toastSimple/ToastSimple.variants';

export type ToastSeverity = NonNullable<ToastSimpleVariants['severity']>;

/** Defines how a toast shows the time left before it dismisses itself. */
export const ToastTimer = {
  /** Refers to no countdown — the toast still expires on time. */
  None: 'none',
  /** Refers to a bar draining along the toast's bottom edge. */
  Bar: 'bar',
  /** Refers to a ring draining beside the close button. */
  Ring: 'ring',
  /** Refers to the whole seconds left, counted beside the close button. */
  Seconds: 'seconds',
} as const;

export type ToastTimer = (typeof ToastTimer)[keyof typeof ToastTimer];

/** Provides the per-severity expiry a `ToastHost` starts from — an error stays long enough to read and report. */
export const DefaultToastDurations: Readonly<Partial<Record<ToastSeverity, number>>> = Object.freeze({
  danger: 8000,
});

/**
 * A renderable slice of a toast. These travel through the imperative
 * `toastHost.toast()` payload, not through a slot, so a caller who wants
 * markup builds it with `h()`.
 */
export type ToastNode = string | VNode;

export interface ToastOptions {
  title?: ToastNode;
  description?: ToastNode;
  icon?: ToastNode;
  severity?: ToastSeverity;
  /**
   * ms before auto-dismiss. Default: the ToastHost's `durations` entry for the severity, then its
   * `defaultDuration`. `Infinity` = sticky.
   */
  duration?: number;
  action?: ToastNode;
  /**
   * Sends a one-click report of the failure this toast shows; the toast renders a Report action that walks
   * sending → reported (with the reference) → retry on failure. Pairs with `/reporting`'s `capture(error).send`.
   */
  report?: ReportSend;
  /** Shows the severity's own glyph when no `icon` is given. Default: the ToastHost's `showSeverityIcon`. */
  showSeverityIcon?: boolean;
  /**
   * Fully custom body — replaces the default `Toast` chrome (icon/title/description/close).
   * Still animates + auto-dismisses; the content owns its close via the returned id.
   */
  content?: ToastNode;
  /**
   * Fired when the toast is removed — auto-dismiss, close button, `dismiss(id)`, or `dismissAll()`.
   * Not fired on a dedup-update. For undo cleanup / analytics.
   */
  onDismiss?: () => void;
  /** Deletes an explicitly retained notification; omitted for transient toasts. */
  onDelete?: () => void;
  /**
   * Dedup key — a `toast` whose `key` is already showing updates that toast in place,
   * refreshing its timer instead of stacking a duplicate.
   */
  key?: string;
  /** How this toast shows its time left. Default: the ToastHost's `timer`. */
  timer?: ToastTimer;
  /**
   * Shows or hides this toast's countdown bar.
   * @deprecated Use `timer` — `ToastTimer.Bar` or `ToastTimer.None`.
   */
  progress?: boolean;
}

/** Content for a `toastHost.promise` phase — a title string, or a full partial options object. */
export type ToastContent = string | Partial<ToastOptions>;

/**
 * Options for `toastHost.promise` — loading / success / error content
 * (success + error may be a fn of the settled value).
 */
export interface ToastPromiseOptions<T> {
  loading: ToastContent;
  success: ToastContent | ((value: T) => ToastContent);
  error: ToastContent | ((err: unknown) => ToastContent);
  /** Auto-dismiss (ms) for the settled toast; defaults to the ToastHost's `defaultDuration`. */
  duration?: number;
}

function normalizeContent(content: ToastContent): Partial<ToastOptions> {
  return typeof content === 'string' ? { title: content } : content;
}

interface ToastEntry extends ToastOptions {
  id: string;
  /** Bumped on every `update` / dedup so the viewport can reset that toast's auto-dismiss timer. */
  nonce: number;
}

type Listener = (toasts: ReadonlyArray<ToastEntry>) => void;

class ToastHostStore {
  private items: ReadonlyArray<ToastEntry> = [];
  private listeners = new Set<Listener>();
  private idSeq = 0;

  toast(opts: ToastOptions): string {
    if (opts.key !== undefined) {
      const existing = this.items.find((t) => t.key === opts.key);
      if (existing) {
        this.update(existing.id, opts);
        return existing.id;
      }
    }
    const id = `t_${++this.idSeq}`;
    this.items = [...this.items, { id, ...opts, nonce: 0 }];
    this.emit();
    return id;
  }

  /** Merges a patch into an existing toast (content + severity + duration), refreshing its timer. */
  update(id: string, patch: Partial<ToastOptions>): void {
    this.items = this.items.map((t) => (t.id === id ? { ...t, ...patch, nonce: t.nonce + 1 } : t));
    this.emit();
  }

  /** Shows a sticky loading toast; returns the full content-update and promise settlement chain. */
  promise<T>(promise: Promise<T>, opts: ToastPromiseOptions<T>): Promise<T> {
    const id = this.toast({ ...normalizeContent(opts.loading), severity: 'info', duration: Infinity });
    const settle = (content: ToastContent, severity: ToastSeverity) =>
      this.update(id, { ...normalizeContent(content), severity, duration: opts.duration });
    return promise.then(
      (value) => {
        settle(typeof opts.success === 'function' ? opts.success(value) : opts.success, 'success');
        return value;
      },
      (err: unknown) => {
        settle(typeof opts.error === 'function' ? opts.error(err) : opts.error, 'danger');
        throw err;
      },
    );
  }

  dismiss(id: string): void {
    const entry = this.items.find((t) => t.id === id);
    this.items = this.items.filter((t) => t.id !== id);
    try {
      entry?.onDismiss?.();
    } finally {
      this.emit();
    }
  }

  dismissAll(): void {
    const gone = this.items;
    this.items = [];
    try {
      for (const t of gone) t.onDismiss?.();
    } finally {
      this.emit();
    }
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.items);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    for (const fn of this.listeners) fn(this.items);
  }
}

export const toastHost = new ToastHostStore();

/**
 * The imperative toast API, bound to the app-wide store. A plain object — the
 * store is a module singleton, so there is nothing per-instance to memoize.
 */
export function useToastHost() {
  return {
    toast: (opts: ToastOptions) => toastHost.toast(opts),
    update: (id: string, patch: Partial<ToastOptions>) => toastHost.update(id, patch),
    promise: <T,>(promise: Promise<T>, opts: ToastPromiseOptions<T>) => toastHost.promise(promise, opts),
    dismiss: (id: string) => toastHost.dismiss(id),
    dismissAll: () => toastHost.dismissAll(),
  };
}

const PositionClasses = 'top-4 right-4 items-end';

/** Toasts enter from the right; reduced-motion users get an instant swap. */
const MotionClasses =
  'motion-safe:data-[state=open]:animate-(--animate-slide-in-right) motion-safe:data-[state=closed]:animate-(--animate-slide-out-right) motion-reduce:animate-none';

export interface ToastHostProps {
  /** @deprecated Toasts always anchor top-right. Accepted for one release, without changing placement. */
  readonly position?: OverlayPosition;
  readonly max?: number;
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
  readonly canPauseOnHover?: boolean;
  readonly gap?: number;
  /**
   * How each auto-dismissing toast shows its time left; a toast's `timer` overrides. Every display pauses with
   * the expiry timer and restarts when the toast updates; sticky toasts show none, and reduced motion drops the
   * bar and the ring. Custom `content` has no close button to sit beside, so it takes the bar for a ring or
   * seconds. Default `ToastTimer.None`.
   */
  readonly timer?: ToastTimer;
  /**
   * Shows a countdown bar along the bottom of each auto-dismissing toast.
   * @deprecated Use `timer` — `ToastTimer.Bar`.
   */
  readonly showProgress?: boolean;
  /** Shows each severity's glyph on toasts given no `icon`; a toast's `showSeverityIcon` overrides. Default `true`. */
  readonly showSeverityIcon?: boolean;
}

interface VisibleToast extends ToastEntry {
  resolvedDuration: number;
}

/** Countdown fill per severity; the neutral countdown uses the brand primary. */
const ProgressClasses: Record<ToastSeverity, string> = {
  neutral: 'bg-primary',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
};

/** Countdown-ring stroke per severity — the bar's tones, drawn as an arc. */
const RingClasses: Record<ToastSeverity, string> = {
  neutral: 'stroke-primary',
  info: 'stroke-info',
  success: 'stroke-success',
  warning: 'stroke-warning',
  danger: 'stroke-destructive',
};

/** The ring's radius in the 16×16 view box; the circumference is the dash the countdown drains. */
const RingRadius = 6;
const RingCircumference = 2 * Math.PI * RingRadius;

/** How often the seconds display re-reads its clock — a quarter second keeps a whole-second flip on time. */
const SecondsTickMs = 250;
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import {
  computed,
  defineComponent,
  h,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  useAttrs,
  watch,
  type PropType,
} from 'vue';
import { cn, OverlayPosition as OverlayPositionToken } from '../../../foundation/styles';
import { Announce, Portal, Presence } from '../../../foundation/primitives';
import Toast from '../toast/Toast.vue';
import ReportAction from '../reportAction/ReportAction.vue';

const locale = useLocale();

/** Renders a `ToastNode` — either a plain string or a caller-built VNode. */
const ToastNodeView = defineComponent({
  name: 'ToastNodeView',
  props: { node: { type: [String, Object] as PropType<ToastNode>, required: true } },
  setup: (nodeProps) => () => nodeProps.node,
});

/** The props every countdown display shares — it mirrors the host's expiry timer, never drives it. */
const CountdownProps = {
  duration: { type: Number, required: true },
  paused: { type: Boolean, default: false },
  severity: { type: String as PropType<ToastSeverity>, default: 'neutral' },
} as const;

/**
 * Runs one Web Animations API countdown on a template ref, paused and resumed in step with the host's expiry
 * timer; environments without `animate` leave the element static at full.
 */
function useCountdownAnimation(
  element: () => Element | null,
  keyframes: Keyframe[],
  countdown: { readonly duration: number; readonly paused: boolean },
): void {
  let animation: Animation | undefined;
  onMounted(() => {
    const target = element();
    if (!target || typeof target.animate !== 'function') return;
    animation = target.animate(keyframes, { duration: countdown.duration, easing: 'linear', fill: 'forwards' });
    if (countdown.paused) animation.pause();
  });
  watch(
    () => countdown.paused,
    (isPaused) => {
      if (isPaused) animation?.pause();
      else animation?.play();
    },
  );
  onUnmounted(() => animation?.cancel());
}

/** The countdown bar — a scale transform draining along the toast's bottom edge. */
const ToastProgress = defineComponent({
  name: 'ToastProgress',
  props: CountdownProps,
  setup(countdown) {
    const fill = ref<HTMLElement | null>(null);
    useCountdownAnimation(() => fill.value, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], countdown);
    return () =>
      h(
        'div',
        {
          'aria-hidden': 'true',
          'data-toast-progress': '',
          class: 'absolute inset-x-0 bottom-0 h-1 motion-reduce:hidden',
        },
        [
          h('div', {
            ref: fill,
            class: cn('h-full w-full origin-left opacity-80', ProgressClasses[countdown.severity]),
          }),
        ],
      );
  },
});

/** The countdown ring — an arc draining clockwise from twelve o'clock, drawn beside the close button. */
const ToastRing = defineComponent({
  name: 'ToastRing',
  props: CountdownProps,
  setup(countdown) {
    const arc = ref<SVGCircleElement | null>(null);
    useCountdownAnimation(
      () => arc.value,
      [{ strokeDashoffset: '0' }, { strokeDashoffset: `${RingCircumference}` }],
      countdown,
    );
    return () =>
      h(
        'svg',
        {
          'aria-hidden': 'true',
          'data-toast-timer': ToastTimer.Ring,
          viewBox: '0 0 16 16',
          class: 'size-4 -rotate-90 motion-reduce:hidden',
        },
        [
          h('circle', { cx: 8, cy: 8, r: RingRadius, fill: 'none', 'stroke-width': 2, class: 'stroke-border' }),
          h('circle', {
            ref: arc,
            cx: 8,
            cy: 8,
            r: RingRadius,
            fill: 'none',
            'stroke-width': 2,
            'stroke-linecap': 'round',
            'stroke-dasharray': `${RingCircumference}`,
            class: RingClasses[countdown.severity],
          }),
        ],
      );
  },
});

/**
 * The seconds display — the whole seconds left, rounded up so it reads `1s` until the toast goes. It keeps its
 * own clock, advancing only while unpaused; the announcement region already carries the toast, so it is hidden.
 */
const ToastSeconds = defineComponent({
  name: 'ToastSeconds',
  props: CountdownProps,
  setup(countdown) {
    const left = ref(countdown.duration);
    let lastTick = 0;
    let handle: number | undefined;
    const tick = () => {
      const now = Date.now();
      left.value = Math.max(0, left.value - (now - lastTick));
      lastTick = now;
    };
    const start = () => {
      if (handle !== undefined) return;
      lastTick = Date.now();
      handle = window.setInterval(tick, SecondsTickMs);
    };
    const stop = () => {
      if (handle === undefined) return;
      tick();
      window.clearInterval(handle);
      handle = undefined;
    };
    onMounted(() => {
      if (!countdown.paused) start();
    });
    watch(
      () => countdown.paused,
      (isPaused) => (isPaused ? stop() : start()),
    );
    onUnmounted(() => {
      if (handle !== undefined) window.clearInterval(handle);
    });
    return () =>
      h(
        'span',
        {
          'aria-hidden': 'true',
          'data-toast-timer': ToastTimer.Seconds,
          class: 'text-xs tabular-nums text-muted-foreground',
        },
        `${Math.ceil(left.value / 1000)}s`,
      );
  },
});

/**
 * Renders the toast viewport — subscribes to the global `toastHost` store and stacks `Toast` cards.
 * Mount once, per app.
 *
 * A caller's `class` attr lands on the stack container.
 */
defineOptions({ name: 'ToastHost', inheritAttrs: false });

const props = withDefaults(defineProps<ToastHostProps>(), {
  position: OverlayPositionToken.TopRight,
  max: 5,
  defaultDuration: 5000,
  durations: () => DefaultToastDurations,
  canPauseOnHover: true,
  gap: 8,
  timer: undefined,
  showProgress: false,
  showSeverityIcon: true,
});

const attrs = useAttrs();

const items = shallowRef<ReadonlyArray<ToastEntry>>([]);
const hovered = ref(false);
const focused = ref(false);
const paused = computed(() => props.canPauseOnHover && (hovered.value || focused.value));

/* Non-reactive state — mutated across ticks, never rendered. */
const timers = new Map<string, number>();
const remaining = new Map<string, number>();
const startedAt = new Map<string, number>();
const nonces = new Map<string, number>();

let unsubscribe: (() => void) | undefined;
onMounted(() => {
  unsubscribe = toastHost.subscribe((next) => {
    items.value = next;
  });
});

// Visible window (FIFO).
const visible = computed<ReadonlyArray<VisibleToast>>(() =>
  items.value.slice(0, props.max).map((t) => ({
    ...t,
    resolvedDuration: t.duration ?? props.durations[t.severity ?? 'neutral'] ?? props.defaultDuration,
  })),
);
const visibleIds = computed(() => new Set(visible.value.map((v) => v.id)));

// Toasts that just left `visible` (dismissed, or pushed out of the FIFO
// window) but must still play their exit animation. Kept mounted with
// `data-state="closed"` until `Presence` unmounts the child — the `@vue:unmounted`
// hook below then prunes the entry here.
const exiting = shallowRef<ReadonlyArray<VisibleToast>>([]);
let prevVisible: ReadonlyArray<VisibleToast> = [];

watch(
  visibleIds,
  (ids) => {
    const gone = prevVisible.filter((p) => !ids.has(p.id));
    prevVisible = visible.value;
    const current = exiting.value;
    const known = new Set(current.map((e) => e.id));
    // Add newly-gone toasts; drop any that re-entered `visible`.
    const merged = [...current, ...gone.filter((g) => !known.has(g.id))].filter((e) => !ids.has(e.id));
    if (merged.length !== current.length || !merged.every((e, i) => e.id === current[i]?.id)) {
      exiting.value = merged;
    }
  },
  { immediate: true, flush: 'post' },
);

const removeExiting = (id: string) => {
  exiting.value = exiting.value.filter((e) => e.id !== id);
};

// Visible (present) first, then the ones animating out.
const rendered = computed<Array<VisibleToast & { present: boolean }>>(() => [
  ...visible.value.map((v) => ({ ...v, present: true })),
  ...exiting.value.map((e) => ({ ...e, present: false })),
]);

const latestTitle = computed(() => {
  const last = visible.value[visible.value.length - 1];
  if (typeof last?.title === 'string') return last.title;
  if (typeof last?.description === 'string') return last.description;
  return '';
});

// Schedule auto-dismiss timers.
watch(
  [items, () => props.max, () => props.defaultDuration, () => props.durations, paused],
  () => {
    const ids = visibleIds.value;
    // Clear timers for items that are no longer visible.
    for (const [id, handle] of timers) {
      if (!ids.has(id)) {
        window.clearTimeout(handle);
        timers.delete(id);
        remaining.delete(id);
        startedAt.delete(id);
      }
    }
    for (const id of nonces.keys()) {
      if (!ids.has(id)) nonces.delete(id);
    }
    if (paused.value) return;
    // A content update / dedup bumps `nonce` — clear that toast's timer so it reschedules fresh.
    for (const v of visible.value) {
      const seen = nonces.get(v.id);
      if (seen !== undefined && seen !== v.nonce) {
        const handle = timers.get(v.id);
        if (handle !== undefined) window.clearTimeout(handle);
        timers.delete(v.id);
        remaining.delete(v.id);
        startedAt.delete(v.id);
      }
      nonces.set(v.id, v.nonce);
    }
    for (const v of visible.value) {
      if (v.resolvedDuration === Infinity) continue;
      if (timers.has(v.id)) continue;
      const left = remaining.get(v.id) ?? v.resolvedDuration;
      const handle = window.setTimeout(() => {
        toastHost.dismiss(v.id);
      }, left);
      timers.set(v.id, handle);
      startedAt.set(v.id, Date.now());
      remaining.set(v.id, left);
    }
  },
  { immediate: true, flush: 'post' },
);

// Cleanup on unmount.
onUnmounted(() => {
  unsubscribe?.();
  for (const handle of timers.values()) window.clearTimeout(handle);
  timers.clear();
});

watch(
  paused,
  (isPaused) => {
    if (!isPaused) return;
    for (const [id, handle] of timers) {
      window.clearTimeout(handle);
      const start = startedAt.get(id) ?? Date.now();
      remaining.set(id, Math.max(0, (remaining.get(id) ?? 0) - (Date.now() - start)));
    }
    timers.clear();
  },
  { flush: 'sync' },
);

watch(
  () => rendered.value.length,
  (count) => {
    if (count === 0) {
      hovered.value = false;
      focused.value = false;
    }
  },
);

function onFocusout(event: FocusEvent): void {
  const stack = event.currentTarget as HTMLElement;
  if (!(event.relatedTarget instanceof Node) || !stack.contains(event.relatedTarget)) focused.value = false;
}

const stackClasses = computed(() =>
  cn('pointer-events-none fixed z-toast flex flex-col', PositionClasses, attrs.class as string | undefined),
);

const itemClasses = computed(() => cn('pointer-events-auto relative w-80 overflow-hidden rounded-md', MotionClasses));

/** The display a toast asked for — its own `timer`, its deprecated `progress`, then the host's two. */
function requestedTimer(t: VisibleToast): ToastTimer {
  if (t.timer !== undefined) return t.timer;
  if (t.progress !== undefined) return t.progress ? ToastTimer.Bar : ToastTimer.None;
  if (props.timer !== undefined) return props.timer;
  return props.showProgress ? ToastTimer.Bar : ToastTimer.None;
}

/**
 * The display a toast gets — none while exiting or sticky, and the bar for custom `content`, which has no close
 * button for a ring or seconds to sit beside.
 */
function timerFor(t: VisibleToast & { present: boolean }): ToastTimer {
  if (!t.present || !Number.isFinite(t.resolvedDuration)) return ToastTimer.None;
  const requested = requestedTimer(t);
  return t.content && requested !== ToastTimer.None ? ToastTimer.Bar : requested;
}

/** Whether a toast's display sits beside the close button rather than along the bottom edge. */
const isTrailingTimer = (timer: ToastTimer): boolean => timer === ToastTimer.Ring || timer === ToastTimer.Seconds;

/** Vue does not auto-suffix numeric style values with `px`. */
const stackStyle = computed(() => ({ gap: `${props.gap}px` }));
</script>

<template>
  <Portal>
    <div
      v-if="rendered.length > 0"
      role="region"
      :aria-label="locale.t('ToastHost.notifications', undefined, 'Notifications')"
      :style="stackStyle"
      :class="stackClasses"
      @mouseenter="hovered = true"
      @mouseleave="hovered = false"
      @focusin="focused = true"
      @focusout="onFocusout"
    >
      <Presence v-for="t in rendered" :key="t.id" :is-present="t.present">
        <!--
          `Presence` clones `data-state` onto this node and keeps it mounted
          until the exit animation ends; the `@vue:unmounted` hook is that
          "exit finished" signal (the read-only `Presence` API exposes no
          callback).
        -->
        <div :class="itemClasses" @vue:unmounted="t.present ? undefined : removeExiting(t.id)">
          <ToastNodeView v-if="t.content" :node="t.content" />
          <Toast
            v-else
            :severity="t.severity"
            :show-severity-icon="t.showSeverityIcon ?? props.showSeverityIcon"
            v-on="t.onDelete ? { delete: t.onDelete } : {}"
            @close="toastHost.dismiss(t.id)"
          >
            <template v-if="t.icon" #icon><ToastNodeView :node="t.icon" /></template>
            <template v-if="t.title" #title><ToastNodeView :node="t.title" /></template>
            <template v-if="t.description" #description>
              <ToastNodeView :node="t.description" />
            </template>
            <template v-if="t.action || t.report" #actions>
              <ToastNodeView v-if="t.action" :node="t.action" />
              <ReportAction v-if="t.report" :send="t.report" />
            </template>
            <template v-if="isTrailingTimer(timerFor(t))" #trailing>
              <ToastRing
                v-if="timerFor(t) === ToastTimer.Ring"
                :key="`${t.id}:${t.nonce}`"
                :duration="t.resolvedDuration"
                :paused="paused"
                :severity="t.severity ?? 'neutral'"
              />
              <ToastSeconds
                v-else
                :key="`${t.id}:${t.nonce}`"
                :duration="t.resolvedDuration"
                :paused="paused"
                :severity="t.severity ?? 'neutral'"
              />
            </template>
          </Toast>
          <ToastProgress
            v-if="timerFor(t) === ToastTimer.Bar"
            :key="`${t.id}:${t.nonce}`"
            :duration="t.resolvedDuration"
            :paused="paused"
            :severity="t.severity ?? 'neutral'"
          />
        </div>
      </Presence>
    </div>
    <Announce politeness="polite">{{ latestTitle }}</Announce>
  </Portal>
</template>
