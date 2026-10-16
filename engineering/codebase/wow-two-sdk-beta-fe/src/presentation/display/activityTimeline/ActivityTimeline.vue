<script lang="ts">
export interface ActivityTimelineProps {
  /** The compact spacing variant. */
  readonly isDense?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { dataAttr } from '../../../foundation/dom';

/**
 * Renders an ordered feed of `ActivityItem` rows joined by a connector rail down the leading column.
 *
 * Each row reads as an "actor + verb + target" sentence.
 */
defineOptions({ name: 'ActivityTimeline', inheritAttrs: false });

/** The `ActivityItem` rows — React's required `children`. */
defineSlots<{ default(): unknown }>();

/**
 * `isDense` defaults to `undefined`, not `false`: Vue casts an absent `Boolean`
 * prop to `false`, and `data-dense` must stay absent rather than render empty.
 */
const props = withDefaults(defineProps<ActivityTimelineProps>(), { isDense: undefined });

const attrs = useAttrs();
const el = useTemplateRef<HTMLOListElement>('el');

const classes = computed(() =>
  cn('flex list-none flex-col', props.isDense ? 'gap-3' : 'gap-5', attrs.class as string | undefined),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <ol ref="el" :data-dense="dataAttr(props.isDense)" v-bind="rest" :class="classes">
    <slot />
  </ol>
</template>
