<script lang="ts">
/** Defines the edge a sticky region pins to. */
export const StickyLayoutSide = {
  /** Refers to pinning at the top of the scroll area — headers, toolbars. */
  Top: 'top',
  /** Refers to pinning at the bottom — action bars, totals. */
  Bottom: 'bottom',
} as const;

export type StickyLayoutSide = (typeof StickyLayoutSide)[keyof typeof StickyLayoutSide];

/** Defines props for the sticky region. */
export interface StickyLayoutProps {
  /** The edge the region pins to. Default `top`. */
  readonly side?: StickyLayoutSide;

  /** The gap between the pinned region and the edge, in px. Default 0. */
  readonly offset?: number;

  /** The scroll container the region sticks within, for stuck detection. Default the viewport. */
  readonly root?: HTMLElement | null;
}
</script>

<script setup lang="ts">
import { computed, shallowRef, useAttrs, useTemplateRef, watch } from 'vue';
import type { ClassValue } from 'clsx';
import { useIntersectionObserver } from '../../../foundation/observers';
import { cn } from '../../../foundation/styles';

/**
 * Renders a region that pins to the top or bottom edge of its scroll area while its section scrolls, and
 * reports whether it is currently pinned so it can change appearance — a shadow, a denser bar.
 */
defineOptions({ name: 'StickyLayout', inheritAttrs: false });

defineSlots<{
  /** The pinned content; receives whether it is pinned right now. */
  default(props: { isStuck: boolean }): unknown;
}>();

const props = withDefaults(defineProps<StickyLayoutProps>(), {
  side: StickyLayoutSide.Top,
  offset: 0,
  root: null,
});

const emit = defineEmits<{
  /** Fires when the region pins or unpins. */
  'stuck-change': [isStuck: boolean];
}>();

const attrs = useAttrs();
const region = useTemplateRef<HTMLDivElement>('region');
const sentinel = useTemplateRef<HTMLDivElement>('sentinel');

/** Whether the region is pinned; false until the client first observes it. */
const isStuck = shallowRef(false);

/** The pin offset, never negative. */
const offsetPx = computed(() => (Number.isFinite(props.offset) ? Math.max(0, props.offset) : 0));

/** The inline position that pins the region. */
const positionStyle = computed(() => ({ [props.side]: `${offsetPx.value}px` }));

/** The observation box — the root shrunk by the offset on the pinned edge, so the sentinel leaves it on pin. */
const observerOptions = computed(() => ({
  root: props.root ?? null,
  rootMargin:
    props.side === StickyLayoutSide.Top
      ? `-${offsetPx.value + 1}px 0px 0px 0px`
      : `0px 0px -${offsetPx.value + 1}px 0px`,
  threshold: [0, 1],
}));

const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

const regionClass = computed(() => cn('sticky z-sticky', attrs.class as ClassValue));

/** Emits `stuck-change` when the pinned state flips. */
watch(isStuck, (next) => emit('stuck-change', next));

useIntersectionObserver(() => [sentinel.value], handleIntersection, observerOptions);

/** Pins when the sentinel beside the region has passed the pinned edge, not when it is still ahead of it. */
function handleIntersection(entry: IntersectionObserverEntry): void {
  const bounds = entry.rootBounds;
  if (entry.isIntersecting || !bounds) {
    isStuck.value = false;
    return;
  }
  isStuck.value =
    props.side === StickyLayoutSide.Top
      ? entry.boundingClientRect.bottom <= bounds.top
      : entry.boundingClientRect.top >= bounds.bottom;
}

defineExpose({ el: region });
</script>

<template>
  <!-- The sentinel sits in flow beside the region and takes no space; it leaves the observation box when the
       region's natural position scrolls past the pinned edge. -->
  <div
    v-if="side === StickyLayoutSide.Top"
    ref="sentinel"
    aria-hidden="true"
    class="pointer-events-none invisible -mb-px h-px w-full"
  />
  <div
    ref="region"
    v-bind="rest"
    :class="regionClass"
    :style="positionStyle"
    :data-side="side"
    :data-stuck="isStuck ? '' : undefined"
  >
    <slot :is-stuck="isStuck" />
  </div>
  <div
    v-if="side === StickyLayoutSide.Bottom"
    ref="sentinel"
    aria-hidden="true"
    class="pointer-events-none invisible -mt-px h-px w-full"
  />
</template>
