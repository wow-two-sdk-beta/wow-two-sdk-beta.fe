<script lang="ts">
import type { BadgeVariant } from '../badge/Badge.variants';

export interface CountBadgeProps {
  /** The numeric count. */
  readonly value: number;

  /** The cap value — shows "max+" when exceeded. Default 99. */
  readonly max?: number;

  /** The hide-when-zero mode — hides entirely when count is 0. Default true. */
  readonly canHideZero?: boolean;

  /**
   * The color treatment. React spelled this `BadgeProps['variant']`; the named
   * `BadgeVariant` union it resolves to is used directly, because the SFC
   * compiler cannot follow an indexed access into an imported interface.
   */
  readonly variant?: BadgeVariant;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn, Size } from '../../../foundation/styles';
import { BadgeVariant as BadgeVariantValue } from '../badge/Badge.variants';
import Badge from '../badge/Badge.vue';

/**
 * Renders a numeric count badge showing `value` or `{max}+` past the cap, hidden at zero by default.
 *
 * Pass `:can-hide-zero="false"` to keep it visible at zero.
 */
defineOptions({ name: 'CountBadge', inheritAttrs: false });

const props = withDefaults(defineProps<CountBadgeProps>(), {
  max: 99,
  canHideZero: true,
  variant: BadgeVariantValue.Danger,
});

const attrs = useAttrs();
const inner = useTemplateRef<InstanceType<typeof Badge>>('inner');

/** The inner `Badge`'s root element — the React original's forwarded ref. */
const el = computed(() => inner.value?.el ?? null);

/** React returned `null` at zero; Vue renders nothing through `v-if`. */
const isVisible = computed(() => !(props.value === 0 && props.canHideZero));

const display = computed(() => (props.value > props.max ? `${props.max}+` : `${props.value}`));

const classes = computed(() => cn('min-w-5 justify-center px-1.5', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <Badge v-if="isVisible" ref="inner" :variant="props.variant" :size="Size.Sm" v-bind="rest" :class="classes">{{
    display
  }}</Badge>
</template>
