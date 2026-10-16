<script lang="ts">
/**
 * The prop surface of `AlertModalCancel`.
 *
 * React declared `extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>`;
 * attributes reach the root through `useAttrs` here, which leaves no declared prop.
 */
export type AlertModalCancelProps = Record<string, never>;
</script>

<script setup lang="ts">
import { resolveElement } from '../../../foundation/dom';
import { computed, useAttrs, useTemplateRef, type ComponentPublicInstance } from 'vue';
import { cn } from '../../../foundation/styles';
import OverlayCloseButton from '../OverlayCloseButton.vue';

/** Renders the dismissing button of an `AlertModal`; it closes the dialog without firing an action. */
defineOptions({ name: 'AlertModalCancel', inheritAttrs: false });

/** The button label — React's `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const inner = useTemplateRef<ComponentPublicInstance & { el?: unknown }>('inner');

/**
 * Passed on to `OverlayCloseButton`, which merges it over its own chrome the way
 * React's `ModalClose` did — `cn` resolves the two, last-in wins per utility.
 */
const classes = computed(() =>
  cn(
    'inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    attrs.class as string | undefined,
  ),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

const el = computed(() => resolveElement(inner.value));

defineExpose({ el });
</script>

<template>
  <OverlayCloseButton ref="inner" as-child>
    <button v-bind="rest" type="button" :class="classes"><slot /></button>
  </OverlayCloseButton>
</template>
