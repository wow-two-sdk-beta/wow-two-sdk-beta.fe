<script lang="ts">
/** Defines the SnippetText layout variant. */
export const SnippetTextVariant = {
  /** Refers to a single-line inline snippet. */
  Inline: 'inline',
  /** Refers to a multi-line block snippet. */
  Block: 'block',
} as const;

export type SnippetTextVariant = (typeof SnippetTextVariant)[keyof typeof SnippetTextVariant];

export interface SnippetTextProps {
  /** The code text to display + copy. */
  readonly text: string;

  /** The visual variant — `inline` (single line) or `block` (multi-line). Default `inline`. */
  readonly variant?: SnippetTextVariant;
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, useAttrs, useTemplateRef } from 'vue';
import { Check, Copy } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { Icon } from '../../../foundation/icons';
import { useClipboard } from '../../../foundation/clipboard';
import CodeText from '../codeText/CodeText.vue';

const locale = useLocale();

const CopiedIcon = Check;
const CopyIcon = Copy;

/**
 * Renders code text with a copy button, inline for one-liners or block for multi-line snippets — a block keeps its
 * line breaks and indentation, scrolling sideways instead of wrapping.
 *
 * Copy runs through the L1 `useClipboard` hook directly — `SnippetText` stays in display and cannot import the actions
 * `CopyButton`.
 */
defineOptions({ name: 'SnippetText', inheritAttrs: false });

const props = withDefaults(defineProps<SnippetTextProps>(), { variant: SnippetTextVariant.Inline });

const { copied, copy } = useClipboard();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const classes = computed(() =>
  cn(
    'group relative inline-flex w-full items-start',
    props.variant === SnippetTextVariant.Inline ? 'gap-2' : 'flex-col gap-0',
    attrs.class as string | undefined,
  ),
);

/* A block snippet keeps its line breaks and indentation, scrolling sideways instead of wrapping — the multi-line
   contract a caller cannot reach through `CodeText`'s slot here. */
const codeClasses = computed(() => cn('flex-1 pr-10', props.variant === SnippetTextVariant.Block && 'whitespace-pre'));

const buttonClasses = computed(() =>
  cn(
    'absolute right-2 grid h-7 w-7 place-items-center rounded text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    props.variant === SnippetTextVariant.Inline ? 'top-1/2 -translate-y-1/2' : 'top-2',
  ),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

const onCopy = (): void => {
  void copy(props.text);
};

defineExpose({ el });
</script>

<template>
  <div ref="el" v-bind="rest" :class="classes">
    <CodeText :variant="props.variant" :class="codeClasses">{{ props.text }}</CodeText>
    <button
      type="button"
      :aria-label="locale.t(copied ? 'SnippetText.copied' : 'SnippetText.copy', undefined, copied ? 'Copied' : 'Copy')"
      :class="buttonClasses"
      @click="onCopy"
    >
      <Icon :icon="copied ? CopiedIcon : CopyIcon" :size="14" />
    </button>
  </div>
</template>
