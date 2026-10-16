<script lang="ts">
import type { SkeletonStateAnimation } from '../skeletonState/SkeletonState.variants';

/** A failure the region settled on: a message, or anything carrying one — an `AppError`, an `ApiFailure`. */
export type DataRegionError = string | { readonly message: string };

/** Defines which state a `DataRegion` renders, published as its `data-state`. */
export const DataRegionState = {
  /** Refers to the first load: the content renders as component skeletons. */
  FirstLoad: 'first-load',
  /** Refers to a failed first load: neutral plain copy, the failure text left to the toast host. */
  Unavailable: 'unavailable',
  /** Refers to a loaded region with nothing in it: the plain empty copy. */
  Empty: 'empty',
  /** Refers to the content — the last good content too, when a refresh failed. */
  Ready: 'ready',
} as const;

export type DataRegionState = (typeof DataRegionState)[keyof typeof DataRegionState];

export interface DataRegionProps {
  /** The first load: nothing to show yet, so the content renders as skeletons — `useAppQuery().isFirstLoad`. */
  readonly isFirstLoad?: boolean;
  /** A fetch while data shows — the content stays, with no skeleton. Pair with `useAppQuery().isRefreshing`. */
  readonly isRefreshing?: boolean;
  /** The failure the last fetch settled on; the toast host owns its text, the region only stops loading. */
  readonly error?: DataRegionError | null;
  /** Whether the last good content is on screen, so a failure keeps it instead of settling. Default `false`. */
  readonly hasData?: boolean;
  /** The region loaded and holds nothing; plain centred copy replaces the content. */
  readonly isEmpty?: boolean;
  /** The empty copy, naming the absent collection. Default `Nothing here yet`. */
  readonly emptyTitle?: string;
  /** The empty copy's second line. */
  readonly emptyDescription?: string;
  /** The neutral copy a failed first load settles into. Default `Not available right now`. */
  readonly unavailableTitle?: string;
  /** The one announcement while the first load runs. Default `Loading…`. */
  readonly loadingLabel?: string;
  /** The opt-in retry button's label. Default `Retry`. */
  readonly retryLabel?: string;
  /** How every skeleton inside moves. Default `pulse`. */
  readonly animation?: SkeletonStateAnimation;
}
</script>

<script setup lang="ts">
import { computed, getCurrentInstance, provide, useAttrs, useSlots, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { useLocale } from '../../../foundation/i18n';
import Button from '../../actions/button/Button.vue';
import EmptyState from '../../display/emptyState/EmptyState.vue';
import { skeletonStateGroupKey, useSkeletonStateGroup } from '../skeletonState/SkeletonStateContext';

/**
 * Renders one data region through its states: on the first load its content draws every SDK component's own
 * skeleton, inert and announced once; a refresh keeps the content; a failed refresh keeps the last good content; a
 * failed first load and an empty load settle into plain centred copy.
 */
defineOptions({ name: 'DataRegion', inheritAttrs: false });

const props = withDefaults(defineProps<DataRegionProps>(), {
  isFirstLoad: false,
  isRefreshing: false,
  error: null,
  hasData: false,
  isEmpty: false,
});

const emit = defineEmits<{
  /** Fires when the reader asks a failed first load to run again. Binding it opts into the retry button. */
  retry: [];
}>();

defineSlots<{
  /** The region's real layout — rendered as component skeletons on the first load. */
  default?(): unknown;
  /** Replaces the content on the first load, for a layout that cannot render without data. */
  skeleton?(): unknown;
  /** Opts a failed first load into its own copy, in place of the neutral line. */
  unavailable?(props: { message: string; retry: () => void }): unknown;
  /** Opts a failed first load into a retry control, in place of the default button. */
  retry?(props: { retry: () => void }): unknown;
  /** Opts the empty copy into actions; page actions belong in the toolbar. */
  emptyActions?(): unknown;
}>();

const attrs = useAttrs();
const slots = useSlots();
const locale = useLocale();
const instance = getCurrentInstance();
const el = useTemplateRef<HTMLDivElement>('el');

/* A region inside a region still on its first load draws its skeleton too, whatever its own query says. */
const parent = useSkeletonStateGroup();
const isSkeleton = computed(() => props.isFirstLoad || (parent?.isSkeleton.value ?? false));

provide(skeletonStateGroupKey, {
  isLoading: computed(() => isSkeleton.value || (parent?.isLoading.value ?? false)),
  isSkeleton,
  animation: computed(() => props.animation ?? parent?.animation.value),
});

const message = computed(() => {
  const error = props.error;
  if (error === null || error === undefined) return '';
  return typeof error === 'string' ? error : error.message;
});
const hasError = computed(() => props.error !== null && props.error !== undefined);

const state = computed<DataRegionState>(() => {
  if (isSkeleton.value) return DataRegionState.FirstLoad;
  if (hasError.value && !props.hasData) return DataRegionState.Unavailable;
  if (props.isEmpty) return DataRegionState.Empty;
  return DataRegionState.Ready;
});

/* Retry is opt-in — a bound `@retry` or a `retry` slot — because an ordinary collection keeps refresh in its toolbar.
   Read through a call: the instance's vnode is replaced on every render. */
const canRetry = () => Boolean(instance?.vnode.props?.onRetry) || Boolean(slots.retry);

function retry(): void {
  emit('retry');
}

const loadingText = computed(() => props.loadingLabel ?? locale.t('DataRegion.loading', undefined, 'Loading…'));
const retryText = computed(() => props.retryLabel ?? locale.t('DataRegion.retry', undefined, 'Retry'));
const unavailableText = computed(
  () => props.unavailableTitle ?? locale.t('DataRegion.unavailable', undefined, 'Not available right now'),
);
const emptyTitleText = computed(
  () => props.emptyTitle ?? locale.t('DataRegion.emptyTitle', undefined, 'Nothing here yet'),
);

const classes = computed(() => cn(attrs.class as string | undefined));

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
    :data-state="state"
    :data-refreshing="(state === DataRegionState.Ready && props.isRefreshing) || undefined"
    :data-stale="(state === DataRegionState.Ready && hasError) || undefined"
    :aria-busy="isSkeleton || undefined"
    v-bind="rest"
    :class="classes"
  >
    <span v-if="isSkeleton" role="status" class="sr-only">{{ loadingText }}</span>
    <template v-if="state === DataRegionState.Unavailable">
      <slot name="unavailable" :message="message" :retry="retry">
        <EmptyState :title="unavailableText">
          <template v-if="canRetry()" #actions>
            <slot name="retry" :retry="retry">
              <Button size="sm" variant="outline" @click="retry">{{ retryText }}</Button>
            </slot>
          </template>
        </EmptyState>
      </slot>
    </template>
    <EmptyState
      v-else-if="state === DataRegionState.Empty"
      :title="emptyTitleText"
      :description="props.emptyDescription"
    >
      <template v-if="$slots.emptyActions" #actions><slot name="emptyActions" /></template>
    </EmptyState>
    <!-- `contents` keeps the wrapper out of layout, so the region's own grid or flex reaches the content. -->
    <div v-else class="contents" :inert="isSkeleton || undefined" data-region-content>
      <slot v-if="isSkeleton && $slots.skeleton" name="skeleton" />
      <slot v-else />
    </div>
  </div>
</template>
