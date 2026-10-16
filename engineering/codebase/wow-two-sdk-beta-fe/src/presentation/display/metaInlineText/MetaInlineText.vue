<script lang="ts">
export interface MetaInlineTextProps {
  /** The gap between left-side meta items. Default `2`. */
  readonly gap?: '1' | '2' | '3';
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import InlineLayout from '../../layout/inlineLayout/InlineLayout.vue';

/**
 * Renders an inline row of meta items with an optional trailing actions slot.
 *
 * The recurring drawer / card "meta row": badges, metric chips and status left, action buttons right.
 */
defineOptions({ name: 'MetaInlineText', inheritAttrs: false });

defineSlots<{
  /** The left-side meta items — React's `children`. */
  default(): unknown;

  /** The right-aligned slot — typically small action buttons. */
  actions?(): unknown;
}>();

const props = withDefaults(defineProps<MetaInlineTextProps>(), { gap: '2' });

const attrs = useAttrs();
const inner = useTemplateRef<InstanceType<typeof InlineLayout>>('inner');

/** The inner `InlineLayout`'s root element — the React original's forwarded ref. */
const el = computed(() => inner.value?.el ?? null);

const classes = computed(() => cn('w-full', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <InlineLayout ref="inner" :gap="props.gap" v-bind="rest" :class="classes">
    <slot />
    <div v-if="$slots.actions" class="ml-auto flex items-center gap-1">
      <slot name="actions" />
    </div>
  </InlineLayout>
</template>
