<script lang="ts">
export interface SwipeActionsLayoutProps {
  /** The drag distance (px) the user must exceed before the row snaps open. */
  readonly threshold?: number;

  /** The width per action button (px) — used to compute snap distance. */
  readonly actionWidth?: number;

  /** The gesture-off flag. */
  readonly isDisabled?: boolean;
}

type Side = 'left' | 'right' | null;

/** px of pointer travel beyond which the gesture counts as a drag, not a tap. */
const ClickSuppressSlop = 6;
</script>

<script setup lang="ts">
import {
  Comment,
  Fragment,
  Text as TextVNode,
  computed,
  ref,
  useAttrs,
  useSlots,
  useTemplateRef,
  type VNode,
} from 'vue';
import { cn } from '../../../foundation/styles';

/**
 * Renders a row that drags left or right to reveal its action slots.
 *
 * Pointer-event based, so touch and mouse both work. Tapping the row body while open closes it.
 */
defineOptions({ name: 'SwipeActionsLayout', inheritAttrs: false });

defineSlots<{
  /** The row body. */
  default(): unknown;
  /** The actions revealed by dragging right. One element per action slot. */
  left?(): unknown;
  /** The actions revealed by dragging left. One element per action slot. */
  right?(): unknown;
}>();

const props = withDefaults(defineProps<SwipeActionsLayoutProps>(), {
  threshold: 60,
  actionWidth: 72,
});

const attrs = useAttrs();
const slots = useSlots();
const el = useTemplateRef<HTMLDivElement>('el');

/**
 * Number of action slots in a side. The slot's vnodes are counted, flattening
 * fragments so a `v-for` sizes one slot per iteration — the snap width is
 * `slots × actionWidth`.
 */
function countNodes(nodes: ReadonlyArray<VNode> | undefined): number {
  if (!nodes) return 0;
  let count = 0;
  for (const node of nodes) {
    if (node.type === Fragment) {
      count += countNodes(Array.isArray(node.children) ? (node.children as Array<VNode>) : undefined);
      continue;
    }
    // A falsy `v-if` renders a comment placeholder, and condensed whitespace a
    // blank text node — neither is an action.
    if (node.type === Comment) continue;
    if (node.type === TextVNode && typeof node.children === 'string' && !node.children.trim()) {
      continue;
    }
    count += 1;
  }
  return count;
}

/* Both are first read from the template, i.e. during render — which is what
   keeps the slot call tracked and warning-free. */
const leftMax = computed(() => countNodes(slots.left?.()) * props.actionWidth);
const rightMax = computed(() => countNodes(slots.right?.()) * props.actionWidth);

/** Reactive: the content transition keys off it. */
const startX = ref<number | null>(null);
const offset = ref(0);
const openSide = ref<Side>(null);

/* Mutable non-render values. */
let startOffset = 0;
let suppressClick = false;

function onPointerDown(e: PointerEvent): void {
  if (props.isDisabled) return;
  startX.value = e.clientX;
  startOffset = offset.value;
  suppressClick = false;
  (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
}

function onPointerMove(e: PointerEvent): void {
  if (props.isDisabled || startX.value == null) return;
  if (Math.abs(e.clientX - startX.value) > ClickSuppressSlop) {
    suppressClick = true;
  }
  const dx = e.clientX - startX.value + startOffset;
  offset.value = Math.max(-rightMax.value, Math.min(leftMax.value, dx));
}

function onPointerUp(e: PointerEvent): void {
  if (startX.value == null) return;
  startX.value = null;
  (e.currentTarget as HTMLDivElement).releasePointerCapture?.(e.pointerId);
  // Snap.
  if (offset.value > props.threshold && leftMax.value > 0) {
    offset.value = leftMax.value;
    openSide.value = 'left';
  } else if (offset.value < -props.threshold && rightMax.value > 0) {
    offset.value = -rightMax.value;
    openSide.value = 'right';
  } else {
    offset.value = 0;
    openSide.value = null;
  }
}

function close(): void {
  offset.value = 0;
  openSide.value = null;
}

/*
 * The keyboard path to the actions. They stay in the tab order — hiding them from assistive tech while they remain
 * focusable would strand focus on invisible buttons — and focusing one slides its side open, so the focused button
 * is always on screen. Leaving the row, or Escape, closes it again.
 */
function reveal(side: 'left' | 'right'): void {
  if (props.isDisabled) return;
  offset.value = side === 'left' ? leftMax.value : -rightMax.value;
  openSide.value = side;
}

function onFocusOut(event: FocusEvent): void {
  const next = event.relatedTarget as Node | null;
  if (openSide.value && !(next && el.value?.contains(next))) close();
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && openSide.value) {
    event.stopPropagation();
    close();
  }
}

function onClick(): void {
  // Mouse drags always emit a click after pointerup — swallow it so a
  // drag-to-open doesn't instantly close. Plain taps still close.
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  if (openSide.value) close();
}

const classes = computed(() =>
  cn('relative overflow-hidden bg-card text-card-foreground', attrs.class as string | undefined),
);

/** Vue does not append `px` to a numeric `:style` value, so every length is spelled out. */
const leftStyle = computed(() => ({ width: `${leftMax.value}px` }));
const rightStyle = computed(() => ({ width: `${rightMax.value}px` }));

const contentStyle = computed(() => ({
  transform: `translateX(${offset.value}px)`,
  transition: startX.value == null ? 'transform 200ms ease-out' : 'none',
  touchAction: 'pan-y',
}));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <!--
    Content comes first in the DOM so Tab reaches the row before its actions; `z-10` keeps it painted over the
    absolutely positioned action panels behind it.
  -->
  <div ref="el" v-bind="rest" :class="classes" @focusout="onFocusOut" @keydown="onKeydown">
    <div
      class="relative z-10 bg-card"
      :style="contentStyle"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @click="onClick"
    >
      <slot />
    </div>
    <div v-if="$slots.left" class="absolute inset-y-0 left-0 flex" :style="leftStyle" @focusin="reveal('left')">
      <slot name="left" />
    </div>
    <div v-if="$slots.right" class="absolute inset-y-0 right-0 flex" :style="rightStyle" @focusin="reveal('right')">
      <slot name="right" />
    </div>
  </div>
</template>
