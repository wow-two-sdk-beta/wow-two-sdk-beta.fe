<script lang="ts">
/** Defines the SectionHeading title size step. */
export const SectionHeadingSize = {
  /** Refers to the medium step. */
  Md: 'md',
  /** Refers to the large step. */
  Lg: 'lg',
  /** Refers to the extra-large step. */
  Xl: 'xl',
  /** Refers to the 2x-large step. */
  Xxl: '2xl',
} as const;

export type SectionHeadingSize = (typeof SectionHeadingSize)[keyof typeof SectionHeadingSize];

type SectionHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface SectionHeadingProps {
  /**
   * The heading copy. React typed this as a required `ReactNode`; here the
   * scalar form is the prop and the same-named slot is the rich override, so
   * it is optional — a consumer filling `#title` need not also pass the prop.
   */
  readonly title?: string | number;

  /** The optional description below the title. */
  readonly description?: string | number;

  /** The heading element / size. Default level 2, size lg. */
  readonly level?: SectionHeadingLevel;
  readonly size?: SectionHeadingSize;

  /** The bottom border's visibility. Default true. */
  readonly isBordered?: boolean;

  /** Keeps the border and layout and draws the title, description and actions as skeletons. */
  readonly isSkeleton?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useSlots, useTemplateRef } from 'vue';
import { cn, Size } from '../../../foundation/styles';
import { TextColor } from '../text/Text.variants';
import Heading from '../heading/Heading.vue';
import Text from '../text/Text.vue';
import { provideSkeletonState, useSkeletonState } from '../../feedback/skeletonState/SkeletonStateContext';

/** Renders a section header: a `Heading` title, an optional `Text` description, and an actions slot. */
defineOptions({ name: 'SectionHeading', inheritAttrs: false });

defineSlots<{
  /** The rich override for the `title` prop. */
  title?(): unknown;

  /** The rich override for the `description` prop. */
  description?(): unknown;

  /** The right-aligned actions slot — typically Button(s). Cross-domain by design, passed as content. */
  actions?(): unknown;
}>();

const props = withDefaults(defineProps<SectionHeadingProps>(), {
  level: 2,
  size: SectionHeadingSize.Lg,
  isBordered: true,
  isSkeleton: undefined,
});

const attrs = useAttrs();
const slots = useSlots();
const el = useTemplateRef<HTMLElement>('el');

/* The `Heading`, `Text` and action buttons inside each draw their own skeleton from this one flag. */
const skeleton = useSkeletonState(() => props.isSkeleton);
provideSkeletonState(skeleton);

const hasDescription = computed(() => Boolean(props.description) || Boolean(slots.description));

const classes = computed(() =>
  cn(
    'flex items-start justify-between gap-4 pb-3',
    props.isBordered && 'border-b border-border',
    attrs.class as string | undefined,
  ),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <header ref="el" :data-skeleton="skeleton.isSkeleton.value || undefined" v-bind="rest" :class="classes">
    <div class="flex min-w-0 flex-col gap-1">
      <Heading :level="props.level" :size="props.size">
        <slot name="title">{{ props.title }}</slot>
      </Heading>
      <Text v-if="hasDescription" :size="Size.Sm" :color="TextColor.Muted">
        <slot name="description">{{ props.description }}</slot>
      </Text>
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
