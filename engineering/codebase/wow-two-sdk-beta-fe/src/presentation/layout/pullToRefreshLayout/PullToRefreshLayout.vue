<script lang="ts">
export interface PullToRefreshLayoutProps {
  readonly onRefresh: () => Promise<void> | void;
  readonly threshold?: number;
  readonly maxPull?: number;
  readonly isDisabled?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useAttrs, useTemplateRef, watch } from 'vue';
import { cn } from '../../../foundation/styles';
import { Announce, Politeness } from '../../../foundation/primitives';
import Spinner from '../../feedback/spinner/Spinner.vue';

/**
 * Renders a pull-to-refresh wrapper. Listens to pointer drag at scrollTop=0; once
 * past `threshold`, fires `onRefresh`. Visual indicator: spinner that scales in as
 * the user pulls.
 */
defineOptions({ name: 'PullToRefreshLayout', inheritAttrs: false });

/** The scrollable content. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<PullToRefreshLayoutProps>(), {
  threshold: 60,
  maxPull: 120,
  isDisabled: false,
});

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const startY = ref<number | null>(null);
const pull = ref(0);
const refreshing = ref(false);

const reached = computed(() => pull.value >= props.threshold);

function onPointerDown(e: PointerEvent): void {
  if (props.isDisabled || refreshing.value) return;
  const node = el.value;
  if (!node || node.scrollTop > 0) return;
  startY.value = e.clientY;
}

function onPointerMove(e: PointerEvent): void {
  if (startY.value == null) return;
  // Pointer was released outside the container — abandon the gesture.
  if (e.buttons === 0) {
    startY.value = null;
    pull.value = 0;
    return;
  }
  const dy = e.clientY - startY.value;
  if (dy < 0) {
    pull.value = 0;
    return;
  }
  // Resistance: sub-linear growth past threshold.
  const eased = dy < props.threshold ? dy : props.threshold + (dy - props.threshold) * 0.4;
  pull.value = Math.min(props.maxPull, eased);
}

async function onPointerUp(): Promise<void> {
  if (startY.value == null) return;
  const didReach = pull.value >= props.threshold;
  startY.value = null;
  if (didReach) {
    refreshing.value = true;
    pull.value = props.threshold;
    try {
      await props.onRefresh();
    } finally {
      refreshing.value = false;
      pull.value = 0;
    }
  } else {
    pull.value = 0;
  }
}

// Touch: native vertical pan fires pointercancel and kills the gesture.
// preventDefault touchmove only mid-pull (scrollTop 0, moving down); normal scroll stays native.
function onTouchMove(e: TouchEvent): void {
  const node = el.value;
  if (!node || startY.value == null || !e.cancelable) return;
  if (node.scrollTop > 0) return;
  const touch = e.touches[0];
  if (!touch) return;
  if (touch.clientY - startY.value > 0) e.preventDefault();
}

onMounted(() => {
  el.value?.addEventListener('touchmove', onTouchMove, { passive: false });
});

onBeforeUnmount(() => {
  el.value?.removeEventListener('touchmove', onTouchMove);
});

// Releasing the pointer outside the container must still finish the gesture.
watch(pull, (value, _previous, onCleanup) => {
  if (value === 0) return;
  const finish = (): void => {
    void onPointerUp();
  };
  window.addEventListener('pointerup', finish);
  window.addEventListener('pointercancel', finish);
  onCleanup(() => {
    window.removeEventListener('pointerup', finish);
    window.removeEventListener('pointercancel', finish);
  });
});

const classes = computed(() => cn('relative h-full overflow-y-auto', attrs.class as string | undefined));

/**
 * Vue does not append `px` to a numeric `:style` value, so every length below is spelled out.
 */
const indicatorStyle = computed(() => ({
  height: `${pull.value}px`,
  transition: startY.value == null ? 'height 200ms ease-out' : 'none',
}));

const contentStyle = computed(() => ({
  transform: `translateY(${pull.value}px)`,
  transition: startY.value == null ? 'transform 200ms ease-out' : 'none',
}));

const spinnerScaleStyle = computed(() => ({
  transform: `scale(${Math.min(1, pull.value / props.threshold)})`,
}));

const spinnerWrapClasses = computed(() =>
  cn('transition-opacity', refreshing.value || reached.value ? 'opacity-100' : 'opacity-60'),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div
    ref="el"
    v-bind="rest"
    :class="classes"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-x-0 top-0 z-raised flex items-center justify-center"
      :style="indicatorStyle"
    >
      <div v-if="pull > 8" :class="spinnerWrapClasses" :style="spinnerScaleStyle">
        <Spinner size="md" :tone="reached ? 'brand' : 'default'" />
      </div>
    </div>

    <div :style="contentStyle"><slot /></div>

    <Announce :politeness="Politeness.Polite">{{ refreshing ? 'Refreshing' : '' }}</Announce>
  </div>
</template>
