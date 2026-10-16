<script lang="ts">
export interface DescriptionGroupItem {
  /** Scalar only — what an array item can carry; the `label` slot is the rich override. */
  readonly label: string | number;
  readonly value: string | number;
}

/** Defines the DescriptionGroup row layout. */
export const DescriptionGroupLayout = {
  /** Refers to label/value on the same line. */
  Inline: 'inline',
  /** Refers to label stacked above its value. */
  Stacked: 'stacked',
} as const;

export type DescriptionGroupLayout = (typeof DescriptionGroupLayout)[keyof typeof DescriptionGroupLayout];

/** Defines the DescriptionGroup inter-row density. */
export const DescriptionGroupDensity = {
  /** Refers to tight row spacing. */
  Sm: 'sm',
  /** Refers to medium row spacing. */
  Md: 'md',
  /** Refers to loose row spacing. */
  Lg: 'lg',
} as const;

export type DescriptionGroupDensity = (typeof DescriptionGroupDensity)[keyof typeof DescriptionGroupDensity];

export interface DescriptionGroupProps {
  readonly items: ReadonlyArray<DescriptionGroupItem>;

  /** The layout direction. `inline` renders label/value on the same line; `stacked` puts label above. */
  readonly layout?: DescriptionGroupLayout;

  /** The density between rows. Default `md`. */
  readonly density?: DescriptionGroupDensity;

  /** Keeps every row and draws its term and value as bars; defaults to the nearest `DataRegion` first load. */
  readonly isSkeleton?: boolean;
}

const RowGap: Record<NonNullable<DescriptionGroupProps['density']>, string> = {
  sm: 'gap-y-1',
  md: 'gap-y-2',
  lg: 'gap-y-3',
};
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { provideSkeletonState, useSkeletonState } from '../../feedback/skeletonState/SkeletonStateContext';
import { SkeletonStateLine } from '../../feedback/skeletonState/SkeletonStateLine';

/**
 * Renders label-value pairs as a semantic `<dl>` for settings and property lists.
 *
 * InlineLayout layout uses a 2-column grid; stacked puts each value below its label.
 */
defineOptions({ name: 'DescriptionGroup', inheritAttrs: false });

/**
 * An array prop can only carry scalars, so each cell gets a scoped slot as the
 * rich override. Omitting the slot renders `item.label` / `item.value`.
 */
defineSlots<{
  /** The rich override for a row's label cell. */
  label?(props: { item: DescriptionGroupItem; index: number }): unknown;

  /** The rich override for a row's value cell. */
  value?(props: { item: DescriptionGroupItem; index: number }): unknown;
}>();

const props = withDefaults(defineProps<DescriptionGroupProps>(), {
  layout: DescriptionGroupLayout.Inline,
  density: DescriptionGroupDensity.Md,
  isSkeleton: undefined,
});

/* Terms and plain values turn into bars in place; a value slot holding components lets them draw their own shapes. */
const skeleton = useSkeletonState(() => props.isSkeleton);
provideSkeletonState(skeleton);

const attrs = useAttrs();
const el = useTemplateRef<HTMLDListElement>('el');

const classes = computed(() =>
  cn(
    'text-sm',
    props.layout === DescriptionGroupLayout.Inline ? 'grid grid-cols-[max-content_1fr] gap-x-4' : 'flex flex-col gap-1',
    RowGap[props.density],
    attrs.class as string | undefined,
  ),
);

const rowClasses = computed(() =>
  cn('contents', props.layout === DescriptionGroupLayout.Stacked && 'flex flex-col gap-0.5'),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <dl ref="el" :data-skeleton="skeleton.isSkeleton.value || undefined" v-bind="rest" :class="classes">
    <div v-for="(item, i) in props.items" :key="item.label" :class="rowClasses">
      <dt class="text-muted-foreground">
        <SkeletonStateLine :is-skeleton="skeleton.isSkeleton.value"
          ><slot name="label" :item="item" :index="i">{{ item.label }}</slot></SkeletonStateLine
        >
      </dt>
      <dd class="text-foreground">
        <SkeletonStateLine :is-skeleton="skeleton.isSkeleton.value" :is-text="false"
          ><slot name="value" :item="item" :index="i">{{ item.value }}</slot></SkeletonStateLine
        >
      </dd>
    </div>
  </dl>
</template>
