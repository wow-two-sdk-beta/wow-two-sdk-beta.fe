<script lang="ts">
export interface PasswordStrengthCalloutProps {
  /** The password to measure. */
  readonly value: string;

  /** The override score (0–4). When set, internal scoring is bypassed. */
  readonly score?: 0 | 1 | 2 | 3 | 4;

  /** The hidden state for the textual label under the bar. */
  readonly isLabelHidden?: boolean;
}

const StrengthLabels = ['Too weak', 'Weak', 'Fair', 'Strong', 'Excellent'];
const ToneClass = ['bg-destructive', 'bg-destructive', 'bg-warning', 'bg-success', 'bg-success'];

function scorePassword(pw: string): 0 | 1 | 2 | 3 | 4 {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  /* Length dominates guessability: a short password stays "Weak" however many character classes it mixes. */
  const ceiling = pw.length < 8 ? 1 : 4;
  return Math.min(ceiling, score) as 0 | 1 | 2 | 3 | 4;
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';

const locale = useLocale();

/** Renders a four-bar password strength meter from naive 0–4 scoring, or from a `score` you supply. */
/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'PasswordStrengthCallout', inheritAttrs: false });

const props = withDefaults(defineProps<PasswordStrengthCalloutProps>(), {
  score: undefined,
  /* Explicit `undefined` default: Vue casts an absent `boolean` prop to `false`, which is the
     same rendering here, but the prop stays a genuine tri-state for consumers reading it. */
  isLabelHidden: undefined,
});

const attrs = useAttrs();

const resolvedScore = computed<0 | 1 | 2 | 3 | 4>(
  () => props.score ?? (props.value.length === 0 ? 0 : scorePassword(props.value)),
);

const label = computed(() =>
  locale.t('PasswordStrengthCallout.score' + resolvedScore.value, undefined, StrengthLabels[resolvedScore.value] ?? ''),
);
const tone = computed(() => ToneClass[resolvedScore.value] ?? 'bg-destructive');

function barClass(index: number): string {
  return cn('h-1 flex-1 rounded-full bg-muted transition-colors', index < resolvedScore.value && tone.value);
}

/* The verdict is always spoken once there is a password; `isLabelHidden` only hides it visually. */
const hasVerdict = computed(() => Boolean(props.value) || props.score !== undefined);
const labelClass = computed(() => (props.isLabelHidden ? 'sr-only' : 'text-xs text-muted-foreground'));

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() => cn('flex flex-col gap-1', attrs.class as ClassValue));

const root = useTemplateRef<HTMLDivElement>('root');

/** The rendered element — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: root });
</script>

<template>
  <div ref="root" :class="rootClass" v-bind="passthroughAttrs">
    <div class="flex gap-1" aria-hidden="true">
      <div v-for="i in 4" :key="i" :class="barClass(i - 1)" />
    </div>
    <div v-if="hasVerdict" aria-live="polite" :class="labelClass">
      <!-- The separating space lives inside the string: template whitespace beside a tag is condensed away. -->
      <span class="sr-only">{{
        `${locale.t('PasswordStrengthCallout.prefix', undefined, 'Password strength:')} `
      }}</span
      >{{ label }}
    </div>
  </div>
</template>
