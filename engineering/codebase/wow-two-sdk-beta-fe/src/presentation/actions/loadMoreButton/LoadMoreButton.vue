<script lang="ts">
import type { LoadMore } from '../../../foundation/virtualization';

/* `LoadMore<any, any, any>` so a handle of any item, cursor and meta type binds without a cast. */
export interface LoadMoreButtonProps {
  /** The handle `useLoadMore` returned. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly loader: LoadMore<any, any, any>;

  /** The button text. Default `Show more`. */
  readonly label?: string;

  /** The status line after each landed page. Default `{added} more loaded, {loaded} of {total}`. */
  readonly announceLoaded?: (added: number, loaded: number, total?: number) => string;

  /** The status line at the end. Default `All {loaded} loaded`. */
  readonly announceEnd?: (loaded: number) => string;
}
</script>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue';
import { CoarseHitArea, cn } from '../../../foundation/styles';
import { LoadMoreState } from '../../../foundation/virtualization';
import { Button } from '../button';

/** Renders the end of a long collection: the `Show more` gate, its hidden automatic twin and one status line. */
defineOptions({ name: 'LoadMoreButton' });

const props = withDefaults(defineProps<LoadMoreButtonProps>(), {
  label: 'Show more',
  announceLoaded: (added: number, loaded: number, total?: number) =>
    total === undefined ? `${added} more loaded` : `${added} more loaded, ${loaded} of ${total}`,
  announceEnd: (loaded: number) => `All ${loaded} loaded`,
});

const status = shallowRef('');
const state = computed(() => props.loader.state.value);
const isGated = computed(() => state.value === LoadMoreState.Gated);
const isAutomatic = computed(() => state.value === LoadMoreState.Automatic);

/* One change per landed page and one at the end; nothing during the first load (DataRegion announces that). */
watch(
  () => [props.loader.items.value.length, state.value] as const,
  ([loaded, current], previous) => {
    if (current === LoadMoreState.FirstLoad || current === LoadMoreState.Unavailable) status.value = '';
    else if (current === LoadMoreState.End && previous?.[1] !== LoadMoreState.End && loaded > 0)
      status.value = props.announceEnd(loaded);
    else if (
      previous &&
      loaded > previous[0] &&
      previous[1] !== LoadMoreState.FirstLoad &&
      current !== LoadMoreState.End
    )
      status.value = props.announceLoaded(props.loader.lastAdded.value, loaded, props.loader.total.value);
  },
);

/* The automatic twin hides on a wrapper: on the button itself its padding and `relative` would defeat `sr-only`. */
const buttonClass = cn('pointer-events-auto relative rounded-full', CoarseHitArea.Before);

function press() {
  void props.loader.showMore();
}
</script>

<template>
  <div
    :class="
      cn(
        'relative flex justify-center',
        isGated && 'pointer-events-none -mt-12 pt-12',
        isAutomatic && 'focus-within:py-2',
      )
    "
    data-load-more
  >
    <div
      v-if="isGated"
      aria-hidden="true"
      class="from-background pointer-events-none absolute inset-x-0 top-0 h-12 bg-linear-to-t to-transparent"
    />
    <div v-if="isGated || isAutomatic" :class="cn(isAutomatic && 'sr-only focus-within:not-sr-only')">
      <Button variant="outline" :class="buttonClass" :is-loading="loader.isLoadingNext.value" @click="press">
        {{ label }}
      </Button>
    </div>
    <p role="status" aria-live="polite" aria-atomic="true" class="sr-only">{{ status }}</p>
  </div>
</template>
