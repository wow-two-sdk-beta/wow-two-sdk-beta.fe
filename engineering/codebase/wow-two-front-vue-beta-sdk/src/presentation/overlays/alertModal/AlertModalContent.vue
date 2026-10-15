<script lang="ts">
import type { ModalContentProps } from '../modal';

/** The prop surface of `AlertModalContent` — `ModalContent`'s, with `phoneLayout` defaulting to `sheet`. */
export type AlertModalContentProps = ModalContentProps;
</script>

<script setup lang="ts">
import { resolveElement } from '../../../foundation/dom';
import { computed, useAttrs, useTemplateRef, type ComponentPublicInstance } from 'vue';
import ModalContent, { ModalPhoneLayout } from '../modal/ModalContent.vue';

/**
 * Renders the alert dialog's panel — `ModalContent`, opening as a bottom sheet on phones; the alert semantics live
 * on the root.
 */
defineOptions({ name: 'AlertModalContent', inheritAttrs: false });

/** The panel content — chrome subcomponents and the dialog body. React's `children`. */
defineSlots<{ default(): unknown }>();

/* Absent booleans stay `undefined`: a cast `false` would forward `showBackdrop: false` and drop the scrim. */
const props = withDefaults(defineProps<AlertModalContentProps>(), {
  showBackdrop: undefined,
  hideBackdrop: undefined,
  isBlurred: undefined,
  phoneLayout: ModalPhoneLayout.Sheet,
  showHandle: undefined,
});

const attrs = useAttrs();
const inner = useTemplateRef<ComponentPublicInstance & { el?: unknown }>('inner');

/** Declared props first, attrs (including `class`) after, so a caller's attribute wins — React's spread order. */
const forwarded = computed(() => ({ ...props, ...attrs }));

const el = computed(() => resolveElement(inner.value));

defineExpose({ el });
</script>

<template>
  <ModalContent ref="inner" v-bind="forwarded"><slot /></ModalContent>
</template>
