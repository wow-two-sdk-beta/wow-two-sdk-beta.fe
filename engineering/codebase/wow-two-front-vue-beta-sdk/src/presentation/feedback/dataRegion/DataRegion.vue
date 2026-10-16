<script lang="ts">
import type { SkeletonStateAnimation } from '../skeletonState/SkeletonState.variants';

/** A failure the region shows: a display-safe message, or anything carrying one — an `AppError`, an `ApiFailure`. */
export type DataRegionError = string | { readonly message: string };

/** Defines which state a `DataRegion` renders, published as its `data-state`. */
export const DataRegionState = {
  /** Refers to the first load: the content renders as component skeletons. */
  FirstLoad: 'first-load',
  /** Refers to a failure with nothing to show: the error state with its retry. */
  Error: 'error',
  /** Refers to a loaded region with nothing in it: the empty state. */
  Empty: 'empty',
  /** Refers to the content, with an inline error above it when a refresh failed. */
  Ready: 'ready',
} as const;

export type DataRegionState = (typeof DataRegionState)[keyof typeof DataRegionState];

export interface DataRegionProps {
  /** The first load: nothing to show yet, so the content renders as skeletons — `useAppQuery().isFirstLoad`. */
  readonly isFirstLoad?: boolean;
  /** A fetch while data shows — the content stays, with no skeleton. Pair with `useAppQuery().isRefreshing`. */
  readonly isRefreshing?: boolean;
  /** The failure to show; with `hasData` it sits above the content, without it it replaces the content. */
  readonly error?: DataRegionError | null;
  /** Whether loaded data is still on screen, so a failure shows inline instead of replacing it. Default `false`. */
  readonly hasData?: boolean;
  /** The region loaded and holds nothing; `EmptyState` replaces the content. */
  readonly isEmpty?: boolean;
  /** The empty state's title. Default `Nothing here yet`. */
  readonly emptyTitle?: string;
  /** The empty state's description. */
  readonly emptyDescription?: string;
  /** The error state's title above the failure message. Default `Couldn't load this`. */
  readonly errorTitle?: string;
  /** The one announcement while the first load runs. Default `Loading…`. */
  readonly loadingLabel?: string;
  /** The retry button's label. Default `Retry`. */
  readonly retryLabel?: string;
  /** How every skeleton inside moves. Default `pulse`. */
  readonly animation?: SkeletonStateAnimation;
}
</script>

<script setup lang="ts">
import { computed, getCurrentInstance, provide, useAttrs, useSlots, useTemplateRef } from 'vue';
import { CircleAlert } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { useLocale } from '../../../foundation/i18n';
import Button from '../../actions/button/Button.vue';
import EmptyState from '../../display/emptyState/EmptyState.vue';
import Alert from '../alert/Alert.vue';
import { skeletonStateGroupKey, useSkeletonStateGroup } from '../skeletonState/SkeletonStateContext';

/**
 * Renders one data region through its states: on the first load its content draws every SDK component's own
 * skeleton, inert and announced busy; a refresh keeps the content; a failure shows inline over kept data or replaces
 * empty content with a retry; an empty load shows `EmptyState`.
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
  /** Fires when the reader asks to load again; binding it shows the retry button. */
  retry: [];
}>();

defineSlots<{
  /** The region's real layout — rendered as component skeletons on the first load. */
  default?(): unknown;
  /** Replaces the content on the first load, for a layout that cannot render without data. */
  skeleton?(): unknown;
  /** Replaces the error state shown when nothing loaded. */
  error?(props: { message: string; retry: () => void }): unknown;
  /** Replaces the retry button in the error state and the inline error. */
  retry?(props: { retry: () => void }): unknown;
  /** The empty state's icon. */
  emptyIcon?(): unknown;
  /** The empty state's actions — usually one `Button`. */
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
  if (hasError.value && !props.hasData) return DataRegionState.Error;
  if (props.isEmpty) return DataRegionState.Empty;
  return DataRegionState.Ready;
});

/* The retry renders only when someone can act on it: a bound `@retry` or a `retry` slot. Read through a call — the
   instance's vnode is replaced on every render. */
const canRetry = () => Boolean(instance?.vnode.props?.onRetry) || Boolean(slots.retry);

function retry(): void {
  emit('retry');
}

const loadingText = computed(() => props.loadingLabel ?? locale.t('DataRegion.loading', undefined, 'Loading…'));
const retryText = computed(() => props.retryLabel ?? locale.t('DataRegion.retry', undefined, 'Retry'));
const errorTitleText = computed(
  () => props.errorTitle ?? locale.t('DataRegion.errorTitle', undefined, "Couldn't load this"),
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
    :aria-busy="isSkeleton || undefined"
    v-bind="rest"
    :class="classes"
  >
    <span v-if="isSkeleton" role="status" class="sr-only">{{ loadingText }}</span>
    <div v-if="state === DataRegionState.Error" role="alert" data-region-error>
      <slot name="error" :message="message" :retry="retry">
        <EmptyState :title="errorTitleText">
          <template #icon
            ><CircleAlert class="size-1/2 text-destructive-soft-foreground" aria-hidden="true"
          /></template>
          <template v-if="message" #description>{{ message }}</template>
          <template v-if="canRetry()" #actions>
            <slot name="retry" :retry="retry">
              <Button size="sm" variant="outline" @click="retry">{{ retryText }}</Button>
            </slot>
          </template>
        </EmptyState>
      </slot>
    </div>
    <EmptyState
      v-else-if="state === DataRegionState.Empty"
      :title="emptyTitleText"
      :description="props.emptyDescription"
    >
      <template v-if="$slots.emptyIcon" #icon><slot name="emptyIcon" /></template>
      <template v-if="$slots.emptyActions" #actions><slot name="emptyActions" /></template>
    </EmptyState>
    <template v-else>
      <Alert
        v-if="hasError && !isSkeleton"
        severity="danger"
        role="alert"
        class="mb-4"
        :description="message"
        data-region-error
      >
        <template v-if="canRetry()" #actions>
          <slot name="retry" :retry="retry">
            <Button size="sm" variant="outline" @click="retry">{{ retryText }}</Button>
          </slot>
        </template>
      </Alert>
      <!-- `contents` keeps the wrapper out of layout, so the region's own grid or flex reaches the content. -->
      <div class="contents" :inert="isSkeleton || undefined" data-region-content>
        <slot v-if="isSkeleton && $slots.skeleton" name="skeleton" />
        <slot v-else />
      </div>
    </template>
  </div>
</template>
