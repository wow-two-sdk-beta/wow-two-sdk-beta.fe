<script lang="ts">
import type { Placement } from '@floating-ui/vue';

export interface TooltipProps {
  /** The tooltip body. Rich content goes through the `content` slot. */
  readonly content?: string | number;

  /** The Floating UI placement. Default `top`. */
  readonly placement?: Placement;

  /** The delay before opening on hover, in ms. Default 700. */
  readonly openDelay?: number;

  /** The delay before closing on leave, in ms. Default 0. */
  readonly closeDelay?: number;

  /** Controlled axes use their canonical Vue model names; each update event requests caller state. */
  readonly open?: boolean;

  /** The initial open state when uncontrolled. Default `false`. */
  readonly defaultOpen?: boolean;

  /** The disabled mode — suppresses rendering even on hover (e.g. when content is empty). */
  readonly isDisabled?: boolean;
}
</script>

<script setup lang="ts">
import {
  cloneVNode,
  computed,
  createCommentVNode,
  onBeforeUnmount,
  ref,
  shallowRef,
  useSlots,
  watch,
  type VNode,
} from 'vue';
import { AriaAttribute, resolveElement } from '../../../foundation/dom';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { useEscape } from '../../../foundation/shortcuts';
import { useId } from '../../../foundation/identifiers';
import { useReducedMotion } from '../../../foundation/device';
import { AnchoredPositioner, Portal, Presence, renderableChildren } from '../../../foundation/primitives';

/**
 * Renders a hover- or focus-triggered tooltip into a Portal, positioned by Floating UI.
 *
 * Wraps a single default-slot child as the trigger. Default delays mirror the OS pattern (700ms in, 0 out). Escape
 * dismisses without moving focus (WCAG 1.4.13); the trigger is described by the tooltip via `aria-describedby` while
 * open.
 *
 * `inheritAttrs: false` because the component renders a fragment (trigger + portal) — there is no single root for
 * attrs to land on, exactly as in React.
 */
defineOptions({ name: 'Tooltip', inheritAttrs: false });

defineSlots<{
  /** The single child element — the trigger. Receives the handlers, the ref, and `aria-describedby`. */
  default(): unknown;
  /** The rich override for the `content` prop. */
  content?(): unknown;
}>();

const props = withDefaults(defineProps<TooltipProps>(), {
  content: undefined,
  placement: 'top',
  openDelay: 700,
  closeDelay: 0,
  open: undefined,
  defaultOpen: false,
  isDisabled: undefined,
});

const emit = defineEmits<{
  /** Fires when the tooltip shows or hides — the `v-model:open` half. */
  'update:open': [open: boolean];
}>();

const slots = useSlots();

/* `useControlled` returns a handle, not React's tuple, and takes `controlled` as a getter so the
   controlled branch tracks the prop. */
const { value: open, setValue: setOpen } = useControlled<boolean>({
  controlled: () => props.open,
  default: props.defaultOpen,
  onChange: (next) => {
    emit('update:open', next);
  },
});

const anchor = shallowRef<HTMLElement | null>(null);
const tooltipId = useId('tooltip');

let openTimer: ReturnType<typeof setTimeout> | null = null;
let closeTimer: ReturnType<typeof setTimeout> | null = null;

function clear(): void {
  if (openTimer) clearTimeout(openTimer);
  if (closeTimer) clearTimeout(closeTimer);
  openTimer = null;
  closeTimer = null;
}

function show(): void {
  clear();
  if (props.isDisabled) return;
  openTimer = setTimeout(() => {
    if (!props.isDisabled) setOpen(true);
  }, props.openDelay);
}

function hide(): void {
  clear();
  closeTimer = setTimeout(() => setOpen(false), props.closeDelay);
}

watch(
  () => props.isDisabled,
  (disabled) => {
    if (!disabled) return;
    clear();
    setOpen(false);
  },
);

/* Clear pending timers on unmount. */
onBeforeUnmount(clear);

/* WCAG 1.4.13 — Escape dismisses immediately, without moving focus. */
useEscape(() => {
  clear();
  setOpen(false);
}, open);

const reducedMotion = useReducedMotion();

/**
 * React gated on `!!content`; a Vue consumer can supply the body through the `content` slot
 * instead, so either source counts. An empty tooltip still never opens.
 */
const hasContent = computed(() => !!props.content || !!slots.content);

const visible = computed(() => !props.isDisabled && open.value && hasContent.value);

/* Keep the Portal + positioner mounted while the exit animation plays.
   Becomes true with `visible`; cleared on the body's pop-out `animationend`
   (see `onAnimationEnd` below). With reduced motion no exit animation runs,
   so tear the shell down immediately on close. */
const mounted = ref(false);
watch(
  [visible, reducedMotion],
  ([isVisible, isReduced]) => {
    if (isVisible) mounted.value = true;
    else if (isReduced) mounted.value = false;
  },
  { immediate: true },
);

function onAnimationEnd(): void {
  if (!visible.value) mounted.value = false;
}

/** A function ref may receive a component's public instance; the positioner needs the DOM node. */
function setAnchor(value: unknown): void {
  anchor.value = resolveElement(value);
}

/**
 * React cloned the child element to attach the ref, the handlers and `aria-describedby`.
 * `cloneVNode` is the Vue counterpart and merges through `mergeProps`, so a handler the
 * consumer already put on the trigger is chained rather than replaced — the job React's
 * explicit `trigger.props.onPointerEnter?.(e)` forwarding did.
 *
 * Called from the template, never from a `computed`: a vnode `ref` records the instance rendering
 * at creation as its owner. The scheduler refreshes a dirty computed before the render runs, while
 * no instance renders, and production Vue then throws reading the missing owner's `refs`.
 *
 * The listener keys are all-lowercase after `on` (`onPointerenter`, not `onPointerEnter`):
 * Vue hyphenates the remainder to derive the DOM event name, so the React casing would
 * register `pointer-enter` and never fire.
 */
function renderTrigger(): VNode {
  const child = renderableChildren(slots.default?.())[0];
  if (!child) return createCommentVNode('');
  const own = child.props?.[AriaAttribute.DescribedBy] as string | undefined;
  return cloneVNode(
    child,
    {
      ref: setAnchor,
      [AriaAttribute.DescribedBy]: visible.value ? [own, tooltipId].filter(Boolean).join(' ') : own,
      onPointerenter: show,
      onPointerleave: hide,
      onFocus: show,
      onBlur: hide,
    },
    true,
  );
}

const contentClasses = cn(
  'z-tooltip rounded-md bg-inverse px-2.5 py-1.5 text-xs text-inverse-foreground shadow-md',
  'motion-safe:data-[state=open]:animate-(--animate-pop-in)',
  'motion-safe:data-[state=closed]:animate-(--animate-pop-out)',
);
</script>

<template>
  <component :is="renderTrigger()" />
  <Portal v-if="mounted">
    <!-- Exit animation bubbles up from the body; once the closed-state pop-out ends, tear down
         the Portal shell. Also covers the reduced-motion path, where no animation runs and
         `Presence` has already unmounted the body. -->
    <AnchoredPositioner :anchor="anchor" :placement="props.placement" :offset="6" @animationend="onAnimationEnd">
      <!-- `Presence` clones `data-state` ("open" | "closed") + its tracking ref onto the body,
           which is what gates the pop-in / pop-out keyframes. Motion sits behind `motion-safe:`
           so reduced-motion users get an instant show/hide. -->
      <Presence :is-present="visible">
        <div :id="tooltipId" role="tooltip" :class="contentClasses">
          <slot name="content">{{ props.content }}</slot>
        </div>
      </Presence>
    </AnchoredPositioner>
  </Portal>
</template>
