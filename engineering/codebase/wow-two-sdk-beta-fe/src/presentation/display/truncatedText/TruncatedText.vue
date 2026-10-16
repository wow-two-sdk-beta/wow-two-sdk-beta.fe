<script lang="ts">
/** Defines props for clamped copy with a show-more toggle. */
export interface TruncatedTextProps {
  /** The number of lines shown while collapsed. Default 3; rounded, at least 1. */
  readonly lines?: number;

  /** The expanded state, controlled. The `v-model:open` binding target. */
  readonly open?: boolean;

  /** The initial expanded state when uncontrolled. Default `false`. */
  readonly defaultOpen?: boolean;

  /** The toggle text while collapsed. Default `"Show more"`, localized. */
  readonly moreLabel?: string;

  /** The toggle text while expanded. Default `"Show less"`, localized. */
  readonly lessLabel?: string;
}

/** @internal The line count used when `lines` is not a finite number. */
const DefaultLines = 3;
</script>

<script setup lang="ts">
import { computed, shallowRef, useAttrs, useTemplateRef, watch } from 'vue';
import type { ClassValue } from 'clsx';
import { useLocaleDefaults } from '../../../foundation/i18n';
import { useId } from '../../../foundation/identifiers';
import { useMutationObserver, useResizeObserver } from '../../../foundation/observers';
import { useControlled } from '../../../foundation/state';
import { cn } from '../../../foundation/styles';

/**
 * Renders copy clamped to a number of lines, with a toggle that appears only when the copy overflows
 * and expands it in place.
 */
defineOptions({ name: 'TruncatedText', inheritAttrs: false });

defineSlots<{
  /** The copy. */
  default(): unknown;

  /** Replaces the built-in toggle button; receives the state and the toggle. */
  toggle?(props: { open: boolean; toggle: () => void; contentId: string }): unknown;
}>();

const componentProps = withDefaults(defineProps<TruncatedTextProps>(), {
  lines: DefaultLines,
  open: undefined,
  defaultOpen: false,
});
const props = useLocaleDefaults(componentProps, 'TruncatedText', { moreLabel: 'Show more', lessLabel: 'Show less' });

const emit = defineEmits<{
  /** Fires when the reader expands or collapses the copy — the `v-model:open` half. */
  'update:open': [open: boolean];
}>();

const attrs = useAttrs();
const contentId = useId();
const content = useTemplateRef<HTMLDivElement>('content');

const controlled = useControlled<boolean>({
  controlled: () => props.open,
  default: () => props.defaultOpen,
  onChange: (value) => {
    emit('update:open', value);
  },
});

const isOpen = controlled.value;

/** Whether the collapsed copy overflows its line clamp, from the last collapsed measurement. */
const isTruncated = shallowRef(false);

const lineCount = computed(() => Math.max(1, Math.round(Number.isFinite(props.lines) ? props.lines : DefaultLines)));

/** The clamp class, applied only while collapsed; the line count travels in a CSS variable. */
const clampClass = computed(() => (isOpen.value ? undefined : 'line-clamp-(--truncated-lines)'));

/** The clamped line count, exposed to the clamp class. */
const clampStyle = computed(() => (isOpen.value ? undefined : { '--truncated-lines': String(lineCount.value) }));

const hasToggle = computed(() => isOpen.value || isTruncated.value);

const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

/** Re-measures the clamp when the state or the line count changes. */
watch([isOpen, lineCount, content], measure, { flush: 'post', immediate: true });

useResizeObserver(content, measure);
useMutationObserver(content, measure, { childList: true, subtree: true, characterData: true });

/** Measures whether the collapsed copy overflows; an expanded copy keeps the last collapsed answer. */
function measure(): void {
  const node = content.value;
  if (!node || isOpen.value) return;
  isTruncated.value = node.scrollHeight > node.clientHeight + 1;
}

/** Expands collapsed copy, or collapses expanded copy. */
function toggle(): void {
  controlled.setValue(!isOpen.value);
}

defineExpose({ el: content });
</script>

<template>
  <div v-bind="rest" :class="cn(attrs.class as ClassValue)">
    <div :id="contentId" ref="content" :class="clampClass" :style="clampStyle" :data-state="isOpen ? 'open' : 'closed'">
      <slot />
    </div>
    <template v-if="hasToggle">
      <slot name="toggle" :open="isOpen" :toggle="toggle" :content-id="contentId">
        <button
          type="button"
          class="mt-1 rounded-sm text-sm font-medium text-primary-soft-foreground hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          :aria-expanded="isOpen"
          :aria-controls="contentId"
          @click="toggle"
        >
          {{ isOpen ? props.lessLabel : props.moreLabel }}
        </button>
      </slot>
    </template>
  </div>
</template>
