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

  /**
   * The quieter second line under the row's content — a name under a slug, a count under a title. An empty string
   * keeps the line, so a placeholder row draws both bars.
   */
  readonly description?: string;

  /** Marks the row as the current one — `aria-current="true"` and the brand's soft fill. */
  readonly isSelected?: boolean;

  /**
   * Makes the whole row a button that selects it — a list that navigates a detail pane.
   *
   * Kept a PROP, not an emit: its presence turns the row into a button, which an emit cannot signal. `@select` binds
   * it all the same.
   */
  readonly onSelect?: () => void;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { Check } from 'lucide-vue-next';
import { ButtonType } from '../../../foundation/dom';
import { cn } from '../../../foundation/styles';
import { listItemVariants } from './ListGroup.variants';
import { useSkeletonState } from '../../feedback/skeletonState/SkeletonStateContext';
import { SkeletonStateLine } from '../../feedback/skeletonState/SkeletonStateLine';
import { useListContext } from './ListGroupContext';

/**
 * Renders a `ListGroup` row with an optional check marker, leading / trailing adornments and a second line — or, with
 * `onSelect`, a selectable row that marks the current one.
 */
defineOptions({ name: 'ListGroupItem', inheritAttrs: false });

defineSlots<{
  /** The leading slot — icon, avatar, marker. React's `leading` node prop. */
  leading?(): unknown;
  /** The trailing slot — badge, chevron, status. React's `trailing` node prop. */
  trailing?(): unknown;
  /** The row content — React's required `children`. */
  default(): unknown;
}>();

const props = withDefaults(defineProps<ListGroupItemProps>(), {
  hasCheckMarker: undefined,
  description: undefined,
  isSelected: false,
  onSelect: undefined,
});

const attrs = useAttrs();
const el = useTemplateRef<HTMLLIElement>('el');
const list = useListContext();

/* The prop is an override; with it omitted the parent's `marker` decides. */
const showCheck = computed(() => props.hasCheckMarker ?? list.marker === 'check');

/* Follows the nearest `ListGroup` or `DataRegion` skeleton: the row keeps its box and padding, plain text turns
   into bars, components in it draw their own shapes, and the check marker keeps its space but hides. */
const skeleton = useSkeletonState();

const isAction = computed(() => props.onSelect !== undefined);

/* A selectable row moves the layout onto its button, so the whole row is the hit area; the item keeps the class. */
const classes = computed(() => cn(!isAction.value && listItemVariants(), attrs.class as string | undefined));

const actionClasses = computed(() =>
  cn(
    listItemVariants(),
    'w-full rounded-lg px-3 py-2 text-left transition-colors motion-reduce:transition-none',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    props.isSelected ? 'bg-primary-soft text-primary-soft-foreground' : 'hover:bg-muted',
  ),
);

const descriptionClasses = computed(() =>
  cn('truncate text-xs', props.isSelected ? 'text-primary-soft-foreground' : 'text-muted-foreground'),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

/** Selects the row unless it is still a placeholder. */
function select(): void {
  if (skeleton.isSkeleton.value) return;
  props.onSelect?.();
}

defineExpose({ el });
</script>

<template>
  <li
    ref="el"
    :data-skeleton="skeleton.isSkeleton.value || undefined"
    :aria-current="!isAction && props.isSelected ? 'true' : undefined"
    v-bind="rest"
    :class="classes"
  >
    <component
      :is="isAction ? 'button' : 'div'"
      v-bind="
        isAction
          ? {
              type: ButtonType.Button,
              class: actionClasses,
              'aria-current': props.isSelected ? 'true' : undefined,
              onClick: select,
            }
          : { class: 'contents' }
      "
    >
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
      <span v-if="props.description !== undefined" class="flex min-w-0 flex-1 flex-col"
        ><span class="truncate"
          ><SkeletonStateLine :is-skeleton="skeleton.isSkeleton.value" :is-text="false"
            ><slot /></SkeletonStateLine></span
        ><span data-description :class="descriptionClasses"
          ><SkeletonStateLine :is-skeleton="skeleton.isSkeleton.value">{{ props.description }}</SkeletonStateLine></span
        ></span
      >
      <span v-else class="flex-1"
        ><SkeletonStateLine :is-skeleton="skeleton.isSkeleton.value" :is-text="false"><slot /></SkeletonStateLine
      ></span>
      <span v-if="$slots.trailing" class="shrink-0 text-muted-foreground"
        ><SkeletonStateLine :is-skeleton="skeleton.isSkeleton.value" :is-text="false"
          ><slot name="trailing" /></SkeletonStateLine
      ></span>
    </component>
  </li>
</template>
