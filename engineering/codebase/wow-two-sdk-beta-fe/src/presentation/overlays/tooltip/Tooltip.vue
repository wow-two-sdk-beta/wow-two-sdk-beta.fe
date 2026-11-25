<script lang="ts">
import type { Placement } from '@floating-ui/vue';

/**
 * Tracks pending, visible, or fading tooltips across every Vue root in a document. An owner's callback removes its
 * body at once and reports whether that body was still on screen.
 */
const tooltipOwners = new WeakMap<Document, () => boolean>();

export interface TooltipProps {
  /** The tooltip body. Rich content goes through the `content` slot. */
  readonly content?: string | number;

  /** The Floating UI placement. Default `top`. */
  readonly placement?: Placement;

  /** The delay before opening on hover, in ms. Default 350. */
  readonly openDelay?: number;

  /** The delay before closing on leave, in ms. Default 0. */
  readonly closeDelay?: number;

  /**
   * The time the body takes to fade in and out, in ms. Defaults to 200. Use 0 for an immediate transition.
   * Reduced motion always uses an immediate transition.
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
 * Wraps a single default-slot child as the trigger. Opens after 350 ms and closes without a delay. Escape
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
  openDelay: 350,
  closeDelay: 0,
  fadeDuration: 200,
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
const eligibleDocument = computed(() =>
  !props.isDisabled && (props.content || slots.content) ? (anchor.value?.ownerDocument ?? null) : null,
);
const ownedDocument = shallowRef<Document | null>(null);
const visible = computed(
  () => ownedDocument.value !== null && ownedDocument.value === eligibleDocument.value && open.value,
);

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
  if (!open.value && !isFadingOut.value) releasePage();
  setOpen(false);
}

/** Whether this claim took the page from a tooltip still on screen, so its first body appears opaque at once. */
let inherited = false;

function releasePage(): void {
  const page = ownedDocument.value;
  if (page && tooltipOwners.get(page) === yieldPage) tooltipOwners.delete(page);
  ownedDocument.value = null;
  inherited = false;
}

/** A replacement must take the old body out immediately, including a close fade in progress. */
function yieldPage(): boolean {
  const wasOnScreen = mounted.value;
  releasePage();
  cancelFade();
  isFadingOut.value = false;
  dismiss();
  return wasOnScreen;
}

function claimPage(page: Document): boolean {
  if (ownedDocument.value === page) return true;
  releasePage();
  const previous = tooltipOwners.get(page);
  tooltipOwners.set(page, yieldPage);
  const wasOnScreen = previous?.() ?? false;
  // Dismissing a controlled tooltip can synchronously trigger another claim.
  if (tooltipOwners.get(page) !== yieldPage) return false;
  ownedDocument.value = page;
  inherited = wasOnScreen;
  return true;
}

function updateTrigger(channel: keyof typeof trigger, active: boolean): void {
  const page = eligibleDocument.value;
  if (!page) return;
  trigger[channel] = active;
  if (trigger.pointer || trigger.focus) {
    cancelClose();
    if (visible.value || openTimer !== null || !claimPage(page) || open.value) return;
    openTimer = setTimeout(() => {
      openTimer = null;
      if (ownedDocument.value === eligibleDocument.value && ownedDocument.value !== null) setOpen(true);
      else releasePage();
    }, props.openDelay);
    return;
  }

  if (ownedDocument.value === null) return;
  cancelOpen();
  if (!open.value) {
    if (!isFadingOut.value) releasePage();
    return;
  }
  if (closeTimer !== null) return;
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

/* Controlled and initially open hints claim once their trigger is mounted. */
watch(
  () => (open.value ? eligibleDocument.value : null),
  (page) => {
    if (page) claimPage(page);
  },
  { flush: 'sync' },
);

/* Escape dismisses the visible hint without moving focus. */
useEscape(dismiss, visible);

/**
 * A zero fade duration, or a reader who asked for reduced motion, keeps the body mounting and
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
  /* Reopening during a fade-out finds the body mounted, so it turns opaque at once, as does a body that took the
     page over from a tooltip still on screen; any other fresh body does so from `startFadeIn`. */
  isOpaque.value = now && (isFadingOut.value || inherited);
  if (now) inherited = false;
  isFadingOut.value = false;
  if (now) return;
  if (!ownedDocument.value || !fades.value) {
    releasePage();
    return;
  }
  isFadingOut.value = true;
  fadeTimer = setTimeout(() => {
    fadeTimer = null;
    isFadingOut.value = false;
    if (openTimer === null) releasePage();
  }, fadeMs.value);
});

onBeforeUnmount(() => {
  clearTimers();
  cancelFade();
  releasePage();
});

const mounted = computed(() => ownedDocument.value !== null && (visible.value || isFadingOut.value));

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
