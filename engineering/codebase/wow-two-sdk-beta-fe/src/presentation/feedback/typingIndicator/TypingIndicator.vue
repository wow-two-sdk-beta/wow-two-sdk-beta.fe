<script lang="ts">
import type { Size } from '../../../foundation/styles';

/** Defines the TypingIndicator dot tone. */
export const TypingTone = {
  /** Refers to the muted-foreground tone. */
  Muted: 'muted',
  /** Refers to the primary / brand tone. */
  Primary: 'primary',
  /** Refers to the full-emphasis foreground tone. */
  Foreground: 'foreground',
} as const;

export type TypingTone = (typeof TypingTone)[keyof typeof TypingTone];

export interface TypingIndicatorProps {
  /** The optional name(s) of who is typing — rendered as a leading label. Rich content → the `who` slot. */
  readonly who?: string;

  /** The visual size of the bouncing dots. */
  readonly size?: Size;

  /** The color of the dots; defaults to muted. */
  readonly tone?: TypingTone;

  /** The subtle-mode flag — tones down dot opacity at rest (between bounces). */
  readonly isSubtle?: boolean;
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, useAttrs, useSlots, useTemplateRef } from 'vue';
import { cn, Size as SizeToken } from '../../../foundation/styles';

const locale = useLocale();

/* Only sm/md/lg carry a dot size; other `Size` members fall through to `md`. */
const SizeDot: Partial<Record<Size, string>> = {
  sm: 'h-1 w-1',
  md: 'h-1.5 w-1.5',
  lg: 'h-2 w-2',
};

const ToneClass: Record<TypingTone, string> = {
  muted: 'bg-muted-foreground',
  primary: 'bg-primary',
  foreground: 'bg-foreground',
};

/**
 * Renders an optional "who" label beside three animating dots — the "someone is typing" cue.
 * Honors `prefers-reduced-motion` via Tailwind's `motion-safe:` / `motion-reduce:` modifiers — dots
 * stay visible at full opacity when motion is reduced.
 */
defineOptions({ name: 'TypingIndicator', inheritAttrs: false });

const props = withDefaults(defineProps<TypingIndicatorProps>(), {
  size: SizeToken.Md,
  tone: TypingTone.Muted,
});

defineSlots<{
  /** The "who is typing" label. Falls back to the `who` prop. */
  who?(): unknown;
}>();

const attrs = useAttrs();
const slots = useSlots();
const el = useTemplateRef<HTMLSpanElement>('el');

const hasWho = computed(() => Boolean(props.who) || Boolean(slots.who));

const dot = computed(() =>
  cn(
    'inline-block rounded-full motion-safe:animate-bounce',
    SizeDot[props.size] ?? SizeDot.md,
    ToneClass[props.tone],
    props.isSubtle && 'motion-safe:opacity-60',
  ),
);

/** Only the string `who` prop can name the typist; the slot form falls back to the generic label. */
const ariaLabel = computed(() =>
  props.who
    ? locale.t('TypingIndicator.named', { name: props.who }, '{name} is typing')
    : locale.t('TypingIndicator.typing', undefined, 'Typing'),
);

const classes = computed(() =>
  cn('inline-flex items-center gap-2 text-xs text-muted-foreground', attrs.class as string | undefined),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <span ref="el" role="status" aria-live="polite" :aria-label="ariaLabel" v-bind="rest" :class="classes">
    <span v-if="hasWho" class="truncate">
      <slot name="who">{{ props.who }}</slot>
    </span>
    <span class="inline-flex items-end gap-1" aria-hidden="true">
      <span :class="dot" :style="{ animationDelay: '0ms' }" />
      <span :class="dot" :style="{ animationDelay: '150ms' }" />
      <span :class="dot" :style="{ animationDelay: '300ms' }" />
    </span>
  </span>
</template>
