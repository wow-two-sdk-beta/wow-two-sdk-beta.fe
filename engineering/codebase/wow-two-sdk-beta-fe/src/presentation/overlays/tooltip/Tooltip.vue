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

  /**
   * The time the body takes to fade in on opening and to fade out on closing, in ms. Default `undefined`: the body
   * mounts and unmounts with no animation. No fade runs under `prefers-reduced-motion: reduce`.
   */
  readonly fadeDuration?: number;

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
  shallowRef,
  useSlots,
  watch,
  type VNode,
} from 'vue';
import { useReducedMotion } from '../../../foundation/device';
import { AriaAttribute, resolveElement } from '../../../foundation/dom';
import { useControlled } from '../../../foundation/state';
import { useEscape } from '../../../foundation/shortcuts';
import { useId } from '../../../foundation/identifiers';
import { AnchoredPositioner, Portal, renderableChildren } from '../../../foundation/primitives';

/**
 * Renders a hover- or focus-triggered tooltip into a Portal, positioned by Floating UI.
 *
 * Wraps a single default-slot child as the trigger. Default delays mirror the OS pattern (700ms in, 0 out). Escape
 * dismisses without moving focus (WCAG 1.4.13); the trigger is described by the tooltip via `aria-describedby` while
 * open. With `fadeDuration` the body fades in and out instead of appearing and vanishing at once.
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
  fadeDuration: undefined,
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
const trigger = { pointer: false, focus: false };

function cancelOpen(): void {
  if (openTimer !== null) clearTimeout(openTimer);
  openTimer = null;
}

function cancelClose(): void {
  if (closeTimer !== null) clearTimeout(closeTimer);
  closeTimer = null;
}

function clearTimers(): void {
  cancelOpen();
  cancelClose();
}

/**
 * Closes now and forgets both channels, so a channel that leaves afterwards cannot schedule a reopen; only a new
 * pointer enter or focus opens it again.
 */
function dismiss(): void {
  clearTimers();
  trigger.pointer = false;
  trigger.focus = false;
  setOpen(false);
}

function updateTrigger(channel: keyof typeof trigger, active: boolean): void {
  if (props.isDisabled) return;
  trigger[channel] = active;
  if (trigger.pointer || trigger.focus) {
    cancelClose();
    if (open.value || openTimer !== null) return;
    openTimer = setTimeout(() => {
      openTimer = null;
      if (!props.isDisabled) setOpen(true);
    }, props.openDelay);
    return;
  }

  cancelOpen();
  if (!open.value || closeTimer !== null) return;
  closeTimer = setTimeout(() => {
    closeTimer = null;
    setOpen(false);
  }, props.closeDelay);
}

watch(
  () => props.isDisabled,
  (disabled) => {
    if (disabled) dismiss();
  },
);

/* Clear pending timers on unmount. */
onBeforeUnmount(clearTimers);

/* WCAG 1.4.13 — Escape dismisses immediately, without moving focus, and stays dismissed. */
useEscape(dismiss, open);

/**
 * React gated on `!!content`; a Vue consumer can supply the body through the `content` slot
 * instead, so either source counts. An empty tooltip still never opens.
 */
const hasContent = computed(() => !!props.content || !!slots.content);

const visible = computed(() => !props.isDisabled && open.value && hasContent.value);

/**
 * The fade is opt-in: no `fadeDuration`, or a reader who asked for reduced motion, keeps the body mounting and
 * unmounting at once, with no style of its own. With it the body mounts transparent, turns opaque once the browser
 * has laid it out (so the opacity transition has a start value), turns transparent again on closing, and unmounts on
 * a timer of the same length — `transitionend` is never awaited, since it does not fire in a hidden tab.
 */
const reducedMotion = useReducedMotion();
const fadeMs = computed(() => (reducedMotion.value ? 0 : Math.max(0, props.fadeDuration ?? 0)));
const fades = computed(() => fadeMs.value > 0);

/** Whether the body is opaque, the target of the opacity transition. */
const isOpaque = shallowRef(false);

/** Whether the closed body is still on screen, fading out; it stays mounted until `fadeTimer` fires. */
const isFadingOut = shallowRef(false);
let fadeTimer: ReturnType<typeof setTimeout> | null = null;

function cancelFade(): void {
  if (fadeTimer !== null) clearTimeout(fadeTimer);
  fadeTimer = null;
}

watch(visible, (now) => {
  cancelFade();
  /* Reopening during a fade-out finds the body mounted, so it turns opaque at once; a fresh body does so from
     `startFadeIn`. */
  isOpaque.value = now && isFadingOut.value;
  isFadingOut.value = false;
  if (now || !fades.value) return;
  isFadingOut.value = true;
  fadeTimer = setTimeout(() => {
    fadeTimer = null;
    isFadingOut.value = false;
  }, fadeMs.value);
});

onBeforeUnmount(cancelFade);

const mounted = computed(() => visible.value || isFadingOut.value);

const bodyStyle = computed(() =>
  fades.value ? { opacity: isOpaque.value ? 1 : 0, transition: `opacity ${fadeMs.value}ms ease-out` } : undefined,
);

/** Turns a freshly mounted body opaque after reading its layout, which commits the transparent start of the fade. */
function startFadeIn(vnode: VNode): void {
  const body = vnode.el as HTMLElement | null;
  if (!fades.value || !body) return;
  void body.offsetHeight;
  isOpaque.value = true;
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
      onPointerenter: () => updateTrigger('pointer', true),
      onPointerleave: () => updateTrigger('pointer', false),
      onFocus: () => updateTrigger('focus', true),
      onBlur: () => updateTrigger('focus', false),
    },
    true,
  );
}
</script>

<template>
  <component :is="renderTrigger()" />
  <Portal v-if="mounted">
    <!-- Put the layer on the positioned root because its transform creates a stacking context. -->
    <AnchoredPositioner :anchor="anchor" :placement="props.placement" :offset="6" class="z-tooltip">
      <div
        :id="tooltipId"
        role="tooltip"
        :style="bodyStyle"
        class="rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
        @vue:mounted="startFadeIn"
      >
        <slot name="content">{{ props.content }}</slot>
      </div>
    </AnchoredPositioner>
  </Portal>
</template>
