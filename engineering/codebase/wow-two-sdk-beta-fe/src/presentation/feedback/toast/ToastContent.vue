<script lang="ts">
/** Defines props for the toast card's copy column. */
export interface ToastContentProps {
  /** The compact layout, which wraps the copy, actions and progress into one row. */
  readonly isCompact?: boolean;

  /** The id given to the title element, so the running progress can name itself after it. */
  readonly titleId?: string;
}
</script>

<script setup lang="ts">
import { dataAttr } from '../../../foundation/dom';

/** Renders the toast card's copy column — title, description, running progress and actions. */
defineOptions({ name: 'ToastContent' });

defineProps<ToastContentProps>();

defineSlots<{
  /** The heading line. */
  title?(): unknown;
  /** The body text below the title. */
  description?(): unknown;
  /** A running operation's progress — under the copy, above the actions; below the row when compact. */
  progress?(): unknown;
  /** The action row. */
  actions?(): unknown;
  /** The extra content below the actions. */
  default?(): unknown;
}>();
</script>

<template>
  <div
    data-toast-summary
    :data-toast-compact="dataAttr(isCompact)"
    :class="isCompact && 'flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5 [overflow-wrap:anywhere]'"
  >
    <div v-if="$slots.title || $slots.description" :class="isCompact ? 'min-w-0 flex-[1_1_6rem]' : 'contents'">
      <div v-if="$slots.title" :id="titleId" class="font-medium"><slot name="title" /></div>
      <div v-if="$slots.description" :class="['text-sm', $slots.title && 'mt-0.5 text-muted-foreground']">
        <slot name="description" />
      </div>
    </div>
    <div v-if="$slots.progress && !isCompact" class="mt-2"><slot name="progress" /></div>
    <div
      v-if="$slots.actions"
      class="flex flex-wrap items-center"
      :class="
        isCompact
          ? [
              'min-w-0 max-w-full gap-1.5 [&_a]:max-w-full [&_a]:whitespace-normal',
              '[&_button]:max-w-full [&_button]:whitespace-normal',
              'pointer-coarse:[&_a]:relative pointer-coarse:[&_button]:relative',
              'pointer-coarse:[&_a]:after:absolute pointer-coarse:[&_a]:after:top-1/2 pointer-coarse:[&_a]:after:left-1/2',
              'pointer-coarse:[&_a]:after:size-full pointer-coarse:[&_a]:after:min-h-11 pointer-coarse:[&_a]:after:min-w-11',
              'pointer-coarse:[&_a]:after:-translate-1/2',
              'pointer-coarse:[&_button]:before:absolute pointer-coarse:[&_button]:before:top-1/2',
              'pointer-coarse:[&_button]:before:left-1/2 pointer-coarse:[&_button]:before:size-full',
              'pointer-coarse:[&_button]:before:min-h-11 pointer-coarse:[&_button]:before:min-w-11',
              'pointer-coarse:[&_button]:before:-translate-1/2',
            ]
          : 'mt-2 gap-2'
      "
    >
      <slot name="actions" />
    </div>
    <div v-if="$slots.progress && isCompact" class="min-w-0 basis-full"><slot name="progress" /></div>
    <slot v-if="!isCompact" />
    <div v-else-if="$slots.default" class="min-w-0 basis-full"><slot /></div>
  </div>
</template>
