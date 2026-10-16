<script lang="ts">
export interface ListGroupItemProps {
  /**
   * The check-marker override.
   *
   * Omitted, it follows the parent `ListGroup`'s `marker` — a check appears under
   * `marker="check"` and nowhere else. Set it explicitly to force the marker on or
   * off for one row.
   */
  readonly hasCheckMarker?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { Check } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { listItemVariants } from './ListGroup.variants';
import { useSkeletonState } from '../../feedback/skeletonState/SkeletonStateContext';
import { SkeletonStateLine } from '../../feedback/skeletonState/SkeletonStateLine';
import { useListContext } from './ListGroupContext';

/** Renders a `ListGroup` row with an optional check marker and leading / trailing adornments. */
defineOptions({ name: 'ListGroupItem', inheritAttrs: false });

defineSlots<{
  /** The leading slot — icon, avatar, marker. React's `leading` node prop. */
  leading?(): unknown;
  /** The trailing slot — badge, chevron, status. React's `trailing` node prop. */
  trailing?(): unknown;
  /** The row content — React's required `children`. */
  default(): unknown;
}>();

const props = withDefaults(defineProps<ListGroupItemProps>(), { hasCheckMarker: undefined });

const attrs = useAttrs();
const el = useTemplateRef<HTMLLIElement>('el');
const list = useListContext();

/* The prop is an override; with it omitted the parent's `marker` decides. */
const showCheck = computed(() => props.hasCheckMarker ?? list.marker === 'check');

/* Follows the nearest `ListGroup` or `DataRegion` skeleton: the row keeps its box and padding, plain text turns
   into bars, components in it draw their own shapes, and the check marker keeps its space but hides. */
const skeleton = useSkeletonState();

const classes = computed(() => cn(listItemVariants(), attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <li ref="el" :data-skeleton="skeleton.isSkeleton.value || undefined" v-bind="rest" :class="classes">
    <span
      v-if="showCheck"
      aria-hidden="true"
      :class="cn('mt-0.5 shrink-0 text-primary-soft-foreground', skeleton.isSkeleton.value && 'invisible')"
    >
      <Check class="h-4 w-4" />
    </span>
    <span v-if="$slots.leading" aria-hidden="true" class="mt-0.5 shrink-0 text-muted-foreground">
      <SkeletonStateLine :is-skeleton="skeleton.isSkeleton.value" :is-text="false"
        ><slot name="leading"
      /></SkeletonStateLine>
    </span>
    <span class="flex-1"
      ><SkeletonStateLine :is-skeleton="skeleton.isSkeleton.value" :is-text="false"><slot /></SkeletonStateLine
    ></span>
    <span v-if="$slots.trailing" class="shrink-0 text-muted-foreground"
      ><SkeletonStateLine :is-skeleton="skeleton.isSkeleton.value" :is-text="false"
        ><slot name="trailing" /></SkeletonStateLine
    ></span>
  </li>
</template>
