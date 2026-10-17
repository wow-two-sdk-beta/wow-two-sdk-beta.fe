<script lang="ts">
export interface MultiSelectPickerTagsProps {
  /** The content shown when no values are selected. Fill the `placeholder` slot for richer content. */
  readonly placeholder?: string | number;

  /**
   * The number of chips rendered before the rest collapse into a `+N` block. Omit to render
   * every selection (the React original's only behaviour).
   *
   * A declarative budget rather than a measured fit: the trigger wraps by default, so a
   * measured overflow would never trigger, and measuring would put the chip strip behind a
   * `ResizeObserver` frame — invisible until the browser paints. Capping is deterministic,
   * renders identically on the server, and is the axis a caller actually wants to control.
   */
  readonly maxVisible?: number;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { X } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { useMultiSelectContext } from './MultiSelectPickerContext';

/** Renders the selections as removable chips inside the trigger, collapsing the tail past `maxVisible` into `+N`. */
defineOptions({ name: 'MultiSelectPickerTags' });

const props = defineProps<MultiSelectPickerTagsProps>();

defineSlots<{ placeholder?(): unknown }>();

/* `ctx` is a live-getter object — read fields off it, never destructure. */
const ctx = useMultiSelectContext();

const isCapped = computed(() => props.maxVisible !== undefined && ctx.values.length > props.maxVisible);

const visibleValues = computed(() => (isCapped.value ? ctx.values.slice(0, props.maxVisible) : ctx.values));

const overflowCount = computed(() => ctx.values.length - visibleValues.value.length);

/* Capped: one line that clips, so the `+N` stays pinned at the end. Uncapped: the historical
   wrap, which grows the trigger (`h-auto min-h-10` there) instead of hiding anything. */
const stripClass = computed(() =>
  cn('flex min-w-0 flex-1 items-center gap-1', isCapped.value ? 'flex-nowrap overflow-hidden' : 'flex-wrap'),
);

/* Registry (rows of the open panel or the closed panel's off-document collection) → `getOptionLabel`
   (a value no row carries, or the server render) → the raw value. */
function tagLabel(value: string): string | number {
  return ctx.labels[value] ?? ctx.getOptionLabel(value) ?? value;
}

/* Matches React exactly: a non-string label (a numeric one) falls back to the raw value
   rather than being interpolated into the accessible name. */
function removeLabel(value: string): string {
  const label = tagLabel(value);
  return `Remove ${typeof label === 'string' ? label : value}`;
}

function remove(value: string, event: MouseEvent): void {
  event.stopPropagation();
  ctx.setValues(ctx.values.filter((x) => x !== value));
}

const CloseIcon = X;
</script>

<template>
  <span v-if="ctx.values.length === 0" class="text-muted-foreground">
    <!-- `muted-foreground` (not `subtle-foreground`): the trigger surface is muted, where
         subtle is only 4.2:1 (see index.css). Kept inside the element: a comment ahead of the root makes the
         root a fragment in development builds, which drops fallthrough attributes there and nowhere else. -->
    <slot name="placeholder">{{ placeholder }}</slot>
  </span>
  <span v-else :class="stripClass">
    <!-- `border-border` is load-bearing, not decoration: `bg-muted` resolves to the same
         color as the trigger's `bg-field` in several shipped themes (smart-qr among
         them), and a chip with no edge reads as a bare trigger. -->
    <span
      v-for="v in visibleValues"
      :key="v"
      class="inline-flex max-w-full shrink-0 items-center gap-1 truncate rounded-sm border border-border bg-muted px-1.5 py-0.5 text-xs"
    >
      {{ tagLabel(v) }}
      <span
        v-if="!ctx.isDisabled"
        role="button"
        :tabindex="-1"
        :aria-label="removeLabel(v)"
        class="cursor-pointer rounded-sm p-0.5 hover:bg-border"
        @click="remove(v, $event)"
        @pointerdown.stop
      >
        <CloseIcon class="h-3 w-3" />
      </span>
    </span>

    <!-- Deliberately NOT chip-shaped: no radius, no fill, no remove control. A `+N` that
         borrows the chip's surface reads as one more removable selection; the rule and the
         bare count read as the summary it is. -->
    <span v-if="overflowCount > 0" class="ml-0.5 flex shrink-0 items-center gap-1.5">
      <span aria-hidden="true" class="h-4 w-px shrink-0 bg-border" />
      <span class="text-xs font-medium tabular-nums text-muted-foreground"> +{{ overflowCount }} </span>
    </span>
  </span>
</template>
