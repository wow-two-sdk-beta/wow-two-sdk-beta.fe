<script lang="ts">
/* `TimelineStatus` is imported here (not in `<script setup>`) so the one binding serves as
   both the prop type below and the runtime value used in `withDefaults`. */
import { TimelineStatus } from './TimelineContext';

export interface TimelineItemProps {
  /** The semantic tone of the node marker. Default `default`. */
  readonly status?: TimelineStatus;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { StatusBackground, TimelineAlign, useTimelineContext } from './TimelineContext';

/** Renders one rail node — marker and connector column, then the content column. */
defineOptions({ name: 'TimelineItem', inheritAttrs: false });

defineSlots<{
  /** The marker glyph — React's `icon` node prop. Defaults to a filled dot. */
  icon?(): unknown;
  /** The node content — React's required `children`. */
  default(): unknown;
}>();

const props = withDefaults(defineProps<TimelineItemProps>(), {
  status: TimelineStatus.Default,
});

const attrs = useAttrs();
const context = useTimelineContext();
const el = useTemplateRef<HTMLLIElement>('el');

/** The root marks its last child with `data-last`; the connector line is dropped there. */
const isLast = computed(() => attrs['data-last'] !== undefined);

const classes = computed(() => cn('relative flex gap-3 pb-6 last:pb-0', attrs.class as string | undefined));

const markerClasses = computed(() =>
  cn('relative z-raised grid h-7 w-7 place-items-center rounded-full border-2', StatusBackground[props.status]),
);

const contentClasses = computed(() =>
  cn('flex-1 pt-0.5', context?.align === TimelineAlign.Right && 'order-first text-right'),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <!-- `data-status` precedes `v-bind="rest"` so a consumer-supplied one still wins, as it did
       through React's trailing `{...rest}` spread. -->
  <li ref="el" :data-status="status" v-bind="rest" :class="classes">
    <!-- Marker + connector column -->
    <div class="relative flex flex-col items-center">
      <span aria-hidden="true" :class="markerClasses">
        <slot name="icon"><span class="h-1.5 w-1.5 rounded-full bg-current" /></slot>
      </span>
      <span v-if="!isLast" aria-hidden="true" class="absolute left-1/2 top-7 h-full w-px -translate-x-1/2 bg-border" />
    </div>
    <!-- Content -->
    <div :class="contentClasses"><slot /></div>
  </li>
</template>
