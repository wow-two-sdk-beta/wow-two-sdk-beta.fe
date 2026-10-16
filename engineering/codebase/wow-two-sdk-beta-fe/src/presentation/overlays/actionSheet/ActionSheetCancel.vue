<script lang="ts">
/**
 * The prop surface of `ActionSheetCancel`.
 *
 * React declared it as `ButtonHTMLAttributes<HTMLButtonElement>`; attributes
 * reach the root through `useAttrs` here, which leaves no declared prop.
 */
export type ActionSheetCancelProps = Record<string, never>;
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { useActionSheetContext } from './ActionSheet.vue';

const locale = useLocale();

/** Renders the separated dismiss row of an `ActionSheet`. */
defineOptions({ name: 'ActionSheetCancel', inheritAttrs: false });

/** The row label — React's `children`, which defaulted to `Cancel`. */
defineSlots<{ default?(): unknown }>();

const attrs = useAttrs();
const context = useActionSheetContext();
const el = useTemplateRef<HTMLButtonElement>('el');

const classes = computed(() =>
  cn(
    'mt-2 flex h-12 w-full items-center justify-center rounded-lg bg-card text-base font-semibold text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
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
  context.setOpen(false);
}

defineExpose({ el });
</script>

<template>
  <!-- `type` sits before `v-bind`, so a caller-supplied `type` still wins — React's `type = 'button'` default. -->
  <button ref="el" type="button" v-bind="rest" :class="classes" @click="handleClick">
    <slot>{{ locale.t('ActionSheetCancel.cancel', undefined, 'Cancel') }}</slot>
  </button>
</template>
