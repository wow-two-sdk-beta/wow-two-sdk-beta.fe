<script lang="ts">
import type { LoadMore } from '../../../foundation/virtualization';

export interface NewItemsButtonProps {
  /** The handle `useLoadMore` returned. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly loader: LoadMore<any, any, any>;

  /** The pill text. Default `{count} new`. */
  readonly label?: (count: number) => string;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { CoarseHitArea, cn } from '../../../foundation/styles';
import { Button } from '../button';

/** Renders the `N new` pill over a long collection while live items wait for the reader; activating shows them. */
defineOptions({ name: 'NewItemsButton' });

const props = withDefaults(defineProps<NewItemsButtonProps>(), {
  label: (count: number) => `${count} new`,
});

const count = computed(() => props.loader.pendingCount.value);
</script>

<template>
  <div v-if="count > 0" class="pointer-events-none sticky top-2 z-10 flex h-0 justify-center overflow-visible">
    <Button
      size="sm"
      :class="cn('pointer-events-auto relative rounded-full shadow-md', CoarseHitArea.Before)"
      data-new-items
      @click="loader.showPending()"
    >
      {{ label(count) }}
    </Button>
  </div>
</template>
