<script lang="ts">
import type { Ref } from 'vue';

/** Defines the side a TourPopover tooltip is placed on, relative to its target. */
export const Placement = {
  /** Refers to placement above the target. */
  Top: 'top',
  /** Refers to placement to the right of the target. */
  Right: 'right',
  /** Refers to placement below the target. */
  Bottom: 'bottom',
  /** Refers to placement to the left of the target. */
  Left: 'left',
} as const;

export type Placement = (typeof Placement)[keyof typeof Placement];

export interface TourPopoverStep {
  /** A CSS selector, or a template ref holding the element to spotlight. */
  readonly target: string | Ref<HTMLElement | null>;
  readonly title?: string;
  readonly body?: string;
  readonly placement?: Placement;
  /** Requires a real click inside the spotlighted target before Next is enabled. */
  readonly completeOn?: 'target-click';
  /** Short instruction shown while a required task is incomplete. */
  readonly taskHint?: string;
}

export interface TourPopoverProps {
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly steps: ReadonlyArray<TourPopoverStep>;
  readonly currentStep?: number;
  readonly defaultCurrentStep?: number;
  readonly padding?: number;
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, nextTick, ref, shallowRef, watch } from 'vue';
import { cn } from '../../../foundation/styles';
import { Key } from '../../../foundation/dom';
import { useControlled } from '../../../foundation/state';
import { useId } from '../../../foundation/identifiers';
import { useReducedMotion } from '../../../foundation/device';
import { Announce, Portal, Presence } from '../../../foundation/primitives';

const locale = useLocale();

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function rectFromTarget(target: TourPopoverStep['target']): Rect | null {
  const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target.value;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function targetElement(target: TourPopoverStep['target']): HTMLElement | null {
  return typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target.value;
}

/**
 * Renders a multi-step tour — a click-through spotlight around each step's target, plus a step tooltip.
 * The tooltip carries Next / Prev / Skip / Done.
 *
 * `TourPopoverStep.title` / `.body` are plain `string`: steps are data passed as a
 * prop, not slot content, and the announcement already required a string.
 */
defineOptions({ name: 'TourPopover', inheritAttrs: false });

const props = withDefaults(defineProps<TourPopoverProps>(), {
  /* `steps` stays declared-required — Vue still warns when it is missing — but a
     default keeps an absent (or transiently-undefined) value out of the indexed read
     in `step` below. Everything downstream already handles an absent step
     (`step.value?.…`, and the template gates on `v-if="mounted && step"`). */
  steps: () => [],
  defaultOpen: false,
  defaultCurrentStep: 0,
  padding: 8,
  /* `open` is the controlled-mode signal, and `useControlled` keys on `=== undefined`.
     A `boolean` prop is Boolean-castable, so without this explicit `undefined` Vue turns an
     ABSENT `open` into `false` — which reads as "controlled, and closed", pinning the tour
     shut and making `defaultOpen` dead. `currentStep` needs no such default: `number` is not
     Boolean-castable, so it already arrives as `undefined`. */
  open: undefined,
});

const emit = defineEmits<{
  /** Fires when the tour opens or closes — a close follows Done, Skip, or Escape. */
  'update:open': [open: boolean];

  /** Fires when the reader moves to a different step. */
  'update:currentStep': [index: number];

  /** Fires when the reader presses Done on the last step. */
  complete: [];

  /** Fires when the reader abandons the tour — the Skip button, or Escape. */
  skip: [];

  /** Fires after the current step's required interaction happens on its live target. */
  'task-complete': [index: number];
}>();

const openCtl = useControlled<boolean>({
  controlled: () => props.open,
  default: () => props.defaultOpen,
  onChange: (value) => emit('update:open', value),
});
const stepCtl = useControlled<number>({
  controlled: () => props.currentStep,
  default: () => props.defaultCurrentStep,
  onChange: (value) => emit('update:currentStep', value),
});

const resolvedOpen = computed(() => openCtl.value.value);
const stepIndex = computed(() => stepCtl.value.value);

const rect = shallowRef<Rect | null>(null);
const tooltipPanel = shallowRef<HTMLElement | null>(null);
const nextButton = shallowRef<HTMLButtonElement | null>(null);
const tooltipSize = shallowRef({ width: 288, height: 180 });
const restoreFocus = shallowRef<HTMLElement | null>(null);
const completedTasks = ref<ReadonlySet<number>>(new Set());
const titleId = useId('tour-title');
const descId = useId('tour-desc');
const reducedMotion = useReducedMotion();

const step = computed(() => props.steps[stepIndex.value]);

// Body copy and responsive width can change the tooltip after the target was measured.
// Observe its final border box so viewport clamping always uses the rendered size.
watch(
  tooltipPanel,
  (panel, _previous, onCleanup) => {
    if (!panel || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const box = entry.borderBoxSize[0];
      const width = box?.inlineSize ?? panel.offsetWidth;
      const height = box?.blockSize ?? panel.offsetHeight;
      if (width > 0 && height > 0) tooltipSize.value = { width, height };
    });
    observer.observe(panel);
    onCleanup(() => observer.disconnect());
  },
  { flush: 'post' },
);

/* Keep the Portal (scrim + tooltip) mounted while the pop-out plays — the
   component hard-unmounts on `!open`, which would kill the exit. Opening
   flips this true synchronously; closing defers the unmount until the
   tooltip's exit animation ends (`@animationend` below). Under reduced
   motion no animation fires, so drop it on the next frame instead. */
const mounted = ref(resolvedOpen.value);
watch(
  [resolvedOpen, reducedMotion],
  ([isOpen, isReduced], _previous, onCleanup) => {
    if (isOpen) {
      mounted.value = true;
      return;
    }
    if (typeof window === 'undefined') {
      mounted.value = false;
      return;
    }
    const delay = isReduced ? 0 : 240;
    const timer = window.setTimeout(() => {
      mounted.value = false;
    }, delay);
    onCleanup(() => clearTimeout(timer));
  },
  { immediate: true, flush: 'post' },
);

// Preserve the caller's focus across the non-modal tour.
watch(
  resolvedOpen,
  (isOpen, wasOpen) => {
    if (typeof document === 'undefined') return;
    if (isOpen && !wasOpen) {
      restoreFocus.value = document.activeElement as HTMLElement | null;
      completedTasks.value = new Set();
    }
    if (!isOpen && wasOpen) restoreFocus.value?.focus({ preventScroll: true });
  },
  { immediate: true, flush: 'post' },
);

// Update rect when step changes / window scrolls / resizes.
watch(
  [resolvedOpen, step],
  ([isOpen, currentStepValue], _previous, onCleanup) => {
    if (!isOpen || !currentStepValue) return;
    /* `immediate: true` runs this on the server too, where there is no rAF and no `window`.
       The spotlight rect is measured from live DOM, so there is nothing to compute there —
       bail, and let the same watcher measure on the client. */
    if (typeof requestAnimationFrame === 'undefined' || typeof window === 'undefined') return;

    let handle = 0;
    let attempts = 0;
    const update = () => {
      const nextRect = rectFromTarget(currentStepValue.target);
      if (!nextRect && attempts++ < 12) {
        handle = requestAnimationFrame(update);
        return;
      }
      rect.value = nextRect;
      const target = targetElement(currentStepValue.target);
      target?.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: reducedMotion.value ? 'auto' : 'smooth',
      });
      void nextTick(() => {
        const panelRect = tooltipPanel.value?.getBoundingClientRect();
        if (panelRect && panelRect.width > 0 && panelRect.height > 0)
          tooltipSize.value = { width: panelRect.width, height: panelRect.height };
        if (
          currentStepValue.completeOn === 'target-click' &&
          target?.matches('button,a,input,select,textarea,[tabindex]')
        ) {
          target.focus({ preventScroll: true });
        } else {
          tooltipPanel.value?.focus({ preventScroll: true });
        }
      });
    };
    // Defer to next frame so the target can mount / scroll into view.
    handle = requestAnimationFrame(update);

    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('scroll', update, { passive: true, capture: true });
    onCleanup(() => {
      cancelAnimationFrame(handle);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    });
  },
  { immediate: true, flush: 'post' },
);

// A task step observes the real highlighted control; the open cutout remains interactive.
watch(
  [resolvedOpen, step, stepIndex],
  ([isOpen, currentStepValue, currentIndex], _previous, onCleanup) => {
    if (!isOpen || currentStepValue?.completeOn !== 'target-click') return;
    const onClick = (event: MouseEvent) => {
      const target = targetElement(currentStepValue.target);
      if (!target) return;
      if (!target.contains(event.target as Node)) return;
      completedTasks.value = new Set(completedTasks.value).add(currentIndex);
      emit('task-complete', currentIndex);
      void nextTick(() => nextButton.value?.focus({ preventScroll: true }));
    };
    document.addEventListener('click', onClick, true);
    onCleanup(() => document.removeEventListener('click', onClick, true));
  },
  { immediate: true, flush: 'post' },
);

// Escape handling.
watch(
  resolvedOpen,
  (isOpen, _previous, onCleanup) => {
    if (!isOpen) return;
    // Same `immediate: true` SSR pass — there is no `document` to listen on there.
    if (typeof document === 'undefined') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === Key.Escape) {
        event.preventDefault();
        openCtl.setValue(false);
        restoreFocus.value?.focus({ preventScroll: true });
        emit('skip');
      }
    };
    document.addEventListener('keydown', onKey);
    onCleanup(() => document.removeEventListener('keydown', onKey));
  },
  { immediate: true, flush: 'post' },
);

const goNext = () => {
  if (step.value?.completeOn && !completedTasks.value.has(stepIndex.value)) return;
  if (stepIndex.value >= props.steps.length - 1) {
    openCtl.setValue(false);
    void nextTick(() => restoreFocus.value?.focus({ preventScroll: true }));
    emit('complete');
  } else {
    stepCtl.setValue(stepIndex.value + 1);
  }
};

const goPrev = () => {
  if (stepIndex.value > 0) stepCtl.setValue(stepIndex.value - 1);
};

const skip = () => {
  openCtl.setValue(false);
  void nextTick(() => restoreFocus.value?.focus({ preventScroll: true }));
  emit('skip');
};

const placement = computed(() => step.value?.placement ?? Placement.Bottom);

const tooltipCoords = computed(() => {
  if (!rect.value || typeof window === 'undefined') return null;
  const gap = 12;
  const margin = 12;
  const { width, height } = tooltipSize.value;
  const centerX = rect.value.left + rect.value.width / 2;
  const centerY = rect.value.top + rect.value.height / 2;
  let left = centerX - width / 2;
  let top = rect.value.top + rect.value.height + gap;
  if (placement.value === Placement.Top) top = rect.value.top - height - gap;
  if (placement.value === Placement.Left) {
    left = rect.value.left - width - gap;
    top = centerY - height / 2;
  }
  if (placement.value === Placement.Right) {
    left = rect.value.left + rect.value.width + gap;
    top = centerY - height / 2;
  }
  // Flip vertically before clamping when the requested side does not fit.
  if (top + height > window.innerHeight - margin && rect.value.top - height - gap >= margin)
    top = rect.value.top - height - gap;
  if (top < margin && rect.value.top + rect.value.height + gap + height <= window.innerHeight - margin)
    top = rect.value.top + rect.value.height + gap;
  return {
    top: Math.max(margin, Math.min(top, window.innerHeight - height - margin)),
    left: Math.max(margin, Math.min(left, window.innerWidth - width - margin)),
  };
});

/** Vue does not auto-suffix numeric style values with `px`. */
const tooltipStyle = computed(() => {
  const coords = tooltipCoords.value;
  if (!coords) return undefined;
  return {
    position: 'fixed' as const,
    top: `${coords.top}px`,
    left: `${coords.left}px`,
  };
});

const announcement = computed(() =>
  step.value?.title ? `Step ${stepIndex.value + 1} of ${props.steps.length}: ${step.value.title}` : '',
);

const bodyClasses = computed(() => cn('text-sm text-muted-foreground', step.value?.title && 'mt-1.5'));
const taskComplete = computed(() => !step.value?.completeOn || completedTasks.value.has(stepIndex.value));

const scrimStyles = computed(() => {
  if (!rect.value) return [];
  const pad = props.padding;
  const top = Math.max(0, rect.value.top - pad);
  const left = Math.max(0, rect.value.left - pad);
  const right = Math.min(window.innerWidth, rect.value.left + rect.value.width + pad);
  const bottom = Math.min(window.innerHeight, rect.value.top + rect.value.height + pad);
  return [
    { inset: `0 0 auto 0`, height: `${top}px` },
    { inset: `${bottom}px 0 0 0` },
    { top: `${top}px`, left: '0', width: `${left}px`, height: `${Math.max(0, bottom - top)}px` },
    { top: `${top}px`, left: `${right}px`, right: '0', height: `${Math.max(0, bottom - top)}px` },
  ];
});

/**
 * `Presence` clones `data-state` onto this node, so the pop (fade + slight
 * scale) runs gated on that state. `motion-safe` so reduced-motion users get
 * no movement.
 */
const tooltipClasses = cn(
  'z-popover w-72 rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-lg outline-hidden',
  'motion-safe:data-[state=open]:animate-(--animate-pop-in)',
  'motion-safe:data-[state=closed]:animate-(--animate-pop-out)',
  'motion-reduce:animate-none',
);

/** Drops the Portal once the exit animation completes. */
const onTooltipAnimationEnd = () => {
  if (!resolvedOpen.value) mounted.value = false;
};
</script>

<template>
  <Portal v-if="mounted && step">
    <!-- Four backdrop panels leave the highlighted target interactive. Skipped while the
         target is unresolvable so a bare scrim never blocks the page.
         Gated on `open` (not `mounted`) so the scrim clears immediately on
         close while the tooltip plays its pop-out before unmount. -->
    <template v-if="resolvedOpen && rect">
      <div
        v-for="(scrimStyle, index) in scrimStyles"
        :key="index"
        aria-hidden="true"
        class="tour-popover-scrim"
        :style="scrimStyle"
      />
      <div
        aria-hidden="true"
        class="tour-popover-highlight"
        :style="{
          top: `${rect.top - props.padding}px`,
          left: `${rect.left - props.padding}px`,
          width: `${rect.width + props.padding * 2}px`,
          height: `${rect.height + props.padding * 2}px`,
        }"
      />
    </template>

    <!-- Tooltip — wrapped in `Presence` so its pop-out plays before the
         component unmounts. `Presence` clones `data-state` ("open" | "closed")
         onto the panel, so the pop tokens run gated on that state; the exit's
         `@animationend` drops `mounted`. -->
    <Presence v-if="tooltipCoords" :is-present="resolvedOpen">
      <div
        ref="tooltipPanel"
        data-tour-popover=""
        :data-task-required="step.completeOn ? 'true' : 'false'"
        tabindex="-1"
        role="dialog"
        aria-modal="false"
        :aria-labelledby="titleId"
        :aria-describedby="descId"
        :style="tooltipStyle"
        :class="tooltipClasses"
        @animationend="onTooltipAnimationEnd"
      >
        <div v-if="step.title" :id="titleId" class="tour-popover-title">{{ step.title }}</div>
        <div v-if="step.body" :id="descId" :class="[bodyClasses, 'tour-popover-body']">{{ step.body }}</div>
        <p v-if="step.taskHint && !taskComplete" class="tour-popover-task">
          {{ step.taskHint }}
        </p>
        <div class="tour-popover-footer">
          <span class="tour-popover-count"> {{ stepIndex + 1 }} / {{ props.steps.length }} </span>
          <div class="tour-popover-actions">
            <button type="button" class="tour-popover-skip" @click="skip">
              {{ locale.t('TourPopover.skip', undefined, 'Skip') }}
            </button>
            <button
              v-if="stepIndex > 0"
              type="button"
              class="tour-popover-button tour-popover-button-secondary"
              @click="goPrev"
            >
              {{ locale.t('TourPopover.back', undefined, 'Back') }}
            </button>
            <button
              ref="nextButton"
              type="button"
              class="tour-popover-button tour-popover-button-primary"
              :disabled="!taskComplete"
              @click="goNext"
            >
              {{ stepIndex >= props.steps.length - 1 ? 'Done' : 'Next' }}
            </button>
          </div>
        </div>
      </div>
    </Presence>

    <Announce politeness="polite">{{ announcement }}</Announce>
  </Portal>
</template>
