<script lang="ts">
import type { Size } from '../../../foundation/styles';
import type { BadgeBorderStyle, BadgeVariant } from './Badge.variants';

export interface BadgeProps {
  /** The color treatment. */
  readonly variant?: BadgeVariant;
  /** The size step. */
  readonly size?: Size;
  /** Draws the pill's border in its tint's colour — a status pill rather than a plain label. */
  readonly isOutlined?: boolean;
  /** The border's line style wherever the pill draws one. Default `solid`. */
  readonly borderStyle?: BadgeBorderStyle;
  /** The quieter text after the label — a version, a count, a state's word. The `detail` slot is the rich override. */
  readonly detail?: string;
  /** Turns the leading icon slowly — a state still in progress; it holds still under reduced motion. */
  readonly isSpinning?: boolean;
  /** Draws the pill as its placeholder; defaults to the nearest `DataRegion` first load. */
  readonly isSkeleton?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useSlots, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { renderableChildren } from '../../../foundation/primitives';
import { useSkeletonState } from '../../feedback/skeletonState/SkeletonStateContext';
import { badgeLeadingSize, badgeVariants, isTintedBadge, type BadgeVariants } from './Badge.variants';

/**
 * Renders a non-interactive pill marking a status or category — optionally with a leading icon and a quieter detail
 * after the label, so a status reads by shape as well as colour.
 *
 * Use `Tag` for the clickable pill, `Alert*` for severity-tinted callouts at message scale.
 */
defineOptions({ name: 'Badge', inheritAttrs: false });

defineSlots<{
  /** The badge copy — React's `children`. */
  default(): unknown;
  /** The leading icon; decorative, so the label must carry the meaning. */
  leading?(): unknown;
  /** The rich override for the `detail` prop. */
  detail?(): unknown;
}>();

const props = withDefaults(defineProps<BadgeProps>(), {
  isOutlined: false,
  borderStyle: 'solid',
  detail: undefined,
  isSpinning: false,
  isSkeleton: undefined,
});

const attrs = useAttrs();
const slots = useSlots();
const el = useTemplateRef<HTMLSpanElement>('el');
const skeleton = useSkeletonState(() => props.isSkeleton);

/** Whether the pill has copy — an empty one still loading keeps a short stand-in width. Read during render. */
const hasContent = (): boolean => renderableChildren(slots.default?.()).length > 0;

const variant = computed(() => props.variant ?? 'neutral');
const size = computed(() => (props.size === 'sm' || props.size === 'lg' ? props.size : 'md'));
const hasLeading = computed(() => Boolean(slots.leading));
const hasDetail = computed(() => Boolean(props.detail) || Boolean(slots.detail));

/* The placeholder merges last: the pill keeps its size, padding and radius while its fill and copy are masked. */
const classes = computed(() =>
  cn(
    badgeVariants({
      variant: variant.value,
      size: props.size as BadgeVariants['size'],
      isOutlined: props.isOutlined,
      borderStyle: props.borderStyle,
      hasLeading: hasLeading.value,
    }),
    (hasLeading.value || hasDetail.value) && 'whitespace-nowrap',
    attrs.class as string | undefined,
    skeleton.boxClass.value,
  ),
);

const leadingClasses = computed(() =>
  cn(
    'inline-flex shrink-0',
    badgeLeadingSize[size.value],
    props.isSpinning && 'animate-spin [animation-duration:2s] motion-reduce:animate-none',
  ),
);

/* A tinted pill keeps its tint on the detail; a neutral one mutes it beside the label. */
const detailClasses = computed(() =>
  cn('min-w-0 truncate font-normal tabular-nums', !isTintedBadge(variant.value) && 'text-muted-foreground'),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <span
    ref="el"
    :data-skeleton="skeleton.isSkeleton.value || undefined"
    :aria-hidden="skeleton.isSkeleton.value || undefined"
    v-bind="rest"
    :class="classes"
    ><span v-if="skeleton.isSkeleton.value && !hasContent()" class="inline-block w-[4ch]">&nbsp;</span
    ><template v-else-if="hasLeading || hasDetail"
      ><span v-if="hasLeading" data-badge-leading aria-hidden="true" :class="leadingClasses"
        ><slot name="leading" /></span
      ><span class="min-w-0 truncate"><slot /></span
      ><span v-if="hasDetail" data-detail :class="detailClasses"
        ><slot name="detail">{{ props.detail }}</slot></span
      ></template
    ><slot v-else
  /></span>
</template>
