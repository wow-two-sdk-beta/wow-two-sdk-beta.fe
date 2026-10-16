<script lang="ts">
/**
 * The prop surface of `ActionSheetAction`.
 *
 * React declared `extends ButtonHTMLAttributes<HTMLButtonElement>` plus an
 * `onSelect` callback; attributes reach the root through `useAttrs` here and
 * `onSelect` is the `select` emit.
 */
export interface ActionSheetActionProps {
  /** The destructive tone — renders the label in the danger color. */
  readonly isDestructive?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { useActionSheetContext } from './ActionSheet.vue';

/** Renders one action row of an `ActionSheet`; it fires `select`, then closes the sheet. */
defineOptions({ name: 'ActionSheetAction', inheritAttrs: false });

/** The row label — React's `children`. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<ActionSheetActionProps>(), { isDestructive: false });

const emit = defineEmits<{
  /** Fires when the reader picks this row, just before the sheet closes. */
  select: [];
}>();

const attrs = useAttrs();
const context = useActionSheetContext();
const el = useTemplateRef<HTMLButtonElement>('el');

const classes = computed(() =>
  cn(
    'flex h-12 w-full items-center justify-center bg-card px-4 text-base font-medium transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
    props.isDestructive ? 'text-destructive-soft-foreground' : 'text-foreground',
    attrs.class as string | undefined,
  ),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

/**
 * `@click` is declared after `v-bind="rest"`, so Vue chains the caller's own
 * handler first and this one second — React's `onClick?.(e)` order.
 */
function handleClick(event: MouseEvent): void {
  if (event.defaultPrevented) return;
  emit('select');
  context.setOpen(false);
}

defineExpose({ el });
</script>

<template>
  <!-- `type` sits before `v-bind`, so a caller-supplied `type` still wins — React's `type = 'button'` default. -->
  <button ref="el" type="button" v-bind="rest" :class="classes" @click="handleClick">
    <slot />
  </button>
</template>
