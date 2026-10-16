<script lang="ts">
export interface ActivityItemProps {
  /** The timestamp (relative or absolute). Rich content → the `timestamp` slot. */
  readonly timestamp?: string | number;

  /** The connector-line suppression under the leading column. */
  readonly isLast?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useSlots, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { dataAttr } from '../../../foundation/dom';

/**
 * Renders one `ActivityTimeline` row: avatar rail, the activity sentence, optional preview and actions.
 *
 * React's `avatar` / `preview` / `actions` were structural `ReactNode` props with no string form worth keeping; they
 * are slots only. `timestamp` keeps its prop form and gains a same-named slot for rich content.
 */
defineOptions({ name: 'ActivityItem', inheritAttrs: false });

defineSlots<{
  /** The avatar / icon node rendered in the leading column. */
  avatar(): unknown;

  /** The activity sentence (actor + verb + target) — React's required `children`. */
  default(): unknown;

  /** The timestamp override, when a plain string is not enough. */
  timestamp(): unknown;

  /** The content preview rendered under the sentence (quoted comment, file name, image). */
  preview(): unknown;

  /** The trailing actions (e.g. Reply / Like). */
  actions(): unknown;
}>();

/**
 * `isLast` defaults to `undefined`, not `false`: Vue casts an absent `Boolean`
 * prop to `false`, and `data-last` must stay absent rather than render empty.
 */
const props = withDefaults(defineProps<ActivityItemProps>(), { isLast: undefined });

const attrs = useAttrs();
const slots = useSlots();
const el = useTemplateRef<HTMLLIElement>('el');

const hasTimestamp = computed(() => props.timestamp != null || Boolean(slots.timestamp));

const classes = computed(() => cn('relative flex gap-3', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <li ref="el" :data-last="dataAttr(props.isLast)" v-bind="rest" :class="classes">
    <div class="relative flex flex-col items-center">
      <div class="z-raised shrink-0"><slot name="avatar" /></div>
      <span v-if="!props.isLast" aria-hidden="true" class="mt-1 w-px flex-1 bg-border" />
    </div>
    <div class="min-w-0 flex-1 pb-1">
      <div class="text-sm leading-relaxed text-foreground">
        <slot />
        <span v-if="hasTimestamp" class="ml-2 text-xs text-muted-foreground">
          <slot name="timestamp">{{ props.timestamp }}</slot>
        </span>
      </div>
      <div
        v-if="$slots.preview"
        class="mt-1.5 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
      >
        <slot name="preview" />
      </div>
      <div v-if="$slots.actions" class="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
        <slot name="actions" />
      </div>
    </div>
  </li>
</template>
