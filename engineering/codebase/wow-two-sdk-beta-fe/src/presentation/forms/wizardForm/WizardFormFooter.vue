<script lang="ts">
export interface WizardFormFooterProps {
  /** The Back button's text. Fill the `prevLabel` slot for richer content. */
  readonly prevLabel?: string | number;

  /** The Next button's text. Fill the `nextLabel` slot for richer content. */
  readonly nextLabel?: string | number;

  /** The final step's confirm text. Fill the `submitLabel` slot for richer content. */
  readonly submitLabel?: string | number;

  /** The visibility of the Prev button when not on first step. Default true. */
  readonly hasPrev?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import { useWizard } from './WizardFormContext';

/** Renders the Back and Next control row, where Next turns into Finish on the wizard's last step. */
defineOptions({ name: 'WizardFormFooter', inheritAttrs: false });

defineSlots<{
  prevLabel?(): unknown;
  nextLabel?(): unknown;
  submitLabel?(): unknown;
}>();

withDefaults(defineProps<WizardFormFooterProps>(), {
  prevLabel: 'Back',
  nextLabel: 'Next',
  submitLabel: 'Finish',
  hasPrev: true,
});

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

/* `ctx` is a live-getter object — read fields off it, never destructure. */
const ctx = useWizard();

const isFirst = computed(() => ctx.currentIndex === 0);
const isFinal = computed(() => ctx.currentStep?.isFinal ?? false);
const showPrevButton = computed(() => ctx.canGoBack && !isFirst.value);

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rowClass = computed(() => cn('mt-2 flex items-center justify-between gap-3', attrs.class as ClassValue));

function onNext(): void {
  void ctx.next();
}

defineExpose({ el });
</script>

<template>
  <div ref="el" :class="rowClass" v-bind="passthroughAttrs">
    <button
      v-if="hasPrev && showPrevButton"
      type="button"
      :disabled="ctx.isPending"
      class="inline-flex h-9 items-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-muted disabled:opacity-50"
      @click="ctx.back()"
    >
      <slot name="prevLabel">{{ prevLabel }}</slot>
    </button>
    <span v-else />
    <button
      type="button"
      :disabled="ctx.isPending"
      class="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      @click="onNext"
    >
      <template v-if="ctx.isPending">…</template>
      <slot v-else-if="isFinal" name="submitLabel">{{ submitLabel }}</slot>
      <slot v-else name="nextLabel">{{ nextLabel }}</slot>
    </button>
  </div>
</template>
