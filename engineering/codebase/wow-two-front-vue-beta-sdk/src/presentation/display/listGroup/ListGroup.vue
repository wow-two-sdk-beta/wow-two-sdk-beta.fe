<script lang="ts">
import type { ListGroupMarker, ListGroupSpacing } from './ListGroup.variants';

export interface ListGroupProps {
  /** The ordered mode — renders `<ol>` instead of `<ul>`. */
  readonly isOrdered?: boolean;

  /** The item marker style. */
  readonly marker?: ListGroupMarker;

  /** The vertical spacing between items. */
  readonly spacing?: ListGroupSpacing;

  /** Keeps every row and draws its content as skeletons; defaults to the nearest `DataRegion` first load. */
  readonly isSkeleton?: boolean;
}
</script>

<script setup lang="ts">
import { computed, provide, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { listVariants } from './ListGroup.variants';
import { provideSkeletonState, useSkeletonState } from '../../feedback/skeletonState/SkeletonStateContext';
import { ListGroupKey } from './ListGroupContext';

/**
 * Renders a bulleted, numbered, or check list container.
 *
 * Pair with `ListGroupItem` for the leading-trailing row shape; a bare `<li>` works too.
 */
defineOptions({ name: 'ListGroup', inheritAttrs: false });

/** The list items — React's required `children`. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<ListGroupProps>(), { isOrdered: undefined, isSkeleton: undefined });

/* One flag switches every row: each keeps its box and masks its own content. */
const skeleton = useSkeletonState(() => props.isSkeleton);
provideSkeletonState(skeleton);

const attrs = useAttrs();
const el = useTemplateRef<HTMLElement>('el');

const tag = computed(() => (props.isOrdered ? 'ol' : 'ul'));

/* `marker="check"` sets `list-none` — the check itself is drawn by `ListGroupItem`, which
   needs the root's marker to know that. A getter keeps the value live. */
provide(ListGroupKey, {
  get marker() {
    return props.marker ?? 'none';
  },
});

const classes = computed(() =>
  cn(listVariants({ marker: props.marker, spacing: props.spacing }), attrs.class as string | undefined),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <component
    :is="tag"
    ref="el"
    :data-skeleton="skeleton.isSkeleton.value || undefined"
    :aria-busy="props.isSkeleton || undefined"
    v-bind="rest"
    :class="classes"
    ><slot
  /></component>
</template>
