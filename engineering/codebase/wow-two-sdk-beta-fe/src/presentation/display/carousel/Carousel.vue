<script lang="ts">
export interface CarouselProps {
  /** The controlled active slide index. */
  readonly index?: number;
  /** The uncontrolled initial slide index. Default `0`. */
  readonly defaultIndex?: number;
  /** The wrap-around state. Default `false`. */
  readonly canLoop?: boolean;
  /** The auto-advance interval in ms. Omit to disable. */
  readonly autoPlay?: number;
  /** The localized pause action label. */
  readonly pauseLabel?: string;
  /** The localized resume action label. */
  readonly resumeLabel?: string;
  /** The explicit slide count — overrides the automatic count (use for virtualised slides). */
  readonly slidesCount?: number;
}
</script>

<script setup lang="ts">
import { useLocaleDefaults } from '../../../foundation/i18n';
import { computed, onMounted, provide, ref, useAttrs, useTemplateRef, watch, watchEffect } from 'vue';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { useReducedMotion } from '../../../foundation/device';
import { CarouselKey, type CarouselContextValue } from './CarouselContext';

/**
 * Renders the carousel root that owns the index, the slide count, and the auto-play pause flag.
 *
 * The parts read them through injection — `CarouselViewport` / `CarouselSlides` / `CarouselPrev` / `CarouselNext` /
 * `CarouselDots` / `CarouselDot` — because an SFC's default export cannot carry React's statics.
 */
defineOptions({ name: 'Carousel', inheritAttrs: false });

/** The viewport, nav buttons and dots — React's required `children`. */
defineSlots<{ default(): unknown }>();

const componentProps = withDefaults(defineProps<CarouselProps>(), {
  index: undefined,
  defaultIndex: 0,
  canLoop: false,
  autoPlay: undefined,
  slidesCount: undefined,
});
const props = useLocaleDefaults(componentProps, 'Carousel', {
  pauseLabel: 'Pause slides',
  resumeLabel: 'Resume slides',
});

const emit = defineEmits<{
  /** Fires when the reader moves to a different slide, with the new index. */
  'update:index': [index: number];
}>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const { value: activeIndex, setValue: setIndexState } = useControlled<number>({
  controlled: () => props.index,
  default: props.defaultIndex,
  onChange: (next) => emit('update:index', next),
});

const count = ref(props.slidesCount ?? 0);
const paused = ref(false);
const pointerPaused = ref(false);
const focusPaused = ref(false);
const mounted = ref(false);
const reducedMotion = useReducedMotion();
onMounted(() => {
  mounted.value = true;
});

// External override.
watch(
  () => props.slidesCount,
  (value) => {
    if (value != null) count.value = value;
  },
);

function setCount(next: number): void {
  count.value = next;
}

function setIndex(target: number): void {
  if (count.value === 0) {
    setIndexState(0);
    return;
  }
  const next = props.canLoop
    ? ((target % count.value) + count.value) % count.value
    : Math.max(0, Math.min(count.value - 1, target));
  setIndexState(next);
}

function prev(): void {
  setIndex(activeIndex.value - 1);
}

function next(): void {
  setIndex(activeIndex.value + 1);
}

function setPaused(value: boolean): void {
  paused.value = value;
}

// Auto-play. `watchEffect` rather than `watch` so the tracked set matches React's
// dependency array exactly — every value below is read up front, which is what
// makes the interval restart on an index change the way React's effect did.
watchEffect((onCleanup) => {
  const interval = props.autoPlay;
  const loop = props.canLoop;
  const total = count.value;
  const current = activeIndex.value;
  if (
    !mounted.value ||
    !interval ||
    interval <= 0 ||
    paused.value ||
    pointerPaused.value ||
    focusPaused.value ||
    reducedMotion.value ||
    total === 0
  )
    return;
  const handle = window.setInterval(() => {
    setIndex(loop ? current + 1 : Math.min(total - 1, current + 1));
  }, interval);
  onCleanup(() => window.clearInterval(handle));
});

/* Live getters, not a snapshot — index, count and pause state have to reach
   every already-mounted child. */
provide<CarouselContextValue>(CarouselKey, {
  get index() {
    return activeIndex.value;
  },
  setIndex,
  get count() {
    return count.value;
  },
  setCount,
  get loop() {
    return props.canLoop;
  },
  prev,
  next,
  get paused() {
    return paused.value || pointerPaused.value || focusPaused.value;
  },
  setPaused,
  get autoPlay() {
    return props.autoPlay;
  },
});

const classes = computed(() => cn('relative', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <!-- `focusin` / `focusout`, not `focus` / `blur`: React's `onFocus` / `onBlur`
       on a container bubble from descendants, and the native pair does not. -->
  <div
    ref="el"
    v-bind="rest"
    :class="classes"
    @mouseenter="pointerPaused = true"
    @mouseleave="pointerPaused = false"
    @focusin="focusPaused = true"
    @focusout="focusPaused = el?.contains($event.relatedTarget as Node) ?? false"
  >
    <button
      v-if="props.autoPlay && !reducedMotion"
      type="button"
      :aria-pressed="paused"
      class="mb-2 rounded border px-2 py-1 text-sm"
      @click="setPaused(!paused)"
    >
      {{ paused ? props.resumeLabel : props.pauseLabel }}
    </button>
    <slot />
  </div>
</template>
