<script lang="ts">
export interface CharacterCountCalloutProps {
  /** The current length. */
  readonly value: number;

  /** The maximum allowed length (also flips text to destructive when exceeded). */
  readonly max: number;

  /** The display mode — `current / max` (default) or just `current`. */
  readonly isMaxShown?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import { useLocale } from '../../../foundation/i18n';

/** Renders the live character count for a limited field, going destructive once `value` passes `max`. */
/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'CharacterCountCallout', inheritAttrs: false });

const props = withDefaults(defineProps<CharacterCountCalloutProps>(), { isMaxShown: true });

const attrs = useAttrs();

const locale = useLocale();
const isOver = computed(() => props.value > props.max);

/* Speaking every keystroke's "12 / 280" floods a screen reader. The visible count stays silent; a spoken sentence
   appears only in the last tenth of the budget and past it — the moment the limit matters. */
const announcement = computed(() => {
  const remaining = props.max - props.value;
  if (remaining < 0) {
    return locale.t('CharacterCountCallout.over', { count: -remaining }, '{count} characters over the limit');
  }
  if (remaining <= Math.max(1, Math.ceil(props.max * 0.1))) {
    return locale.t('CharacterCountCallout.left', { count: remaining }, '{count} characters left');
  }
  return '';
});

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() =>
  cn(
    'text-right text-xs',
    // `-soft-foreground`: the tone's text token, AA on every neutral surface in every theme.
    isOver.value ? 'text-destructive-soft-foreground' : 'text-muted-foreground',
    attrs.class as ClassValue,
  ),
);

const root = useTemplateRef<HTMLDivElement>('root');

/** The rendered element — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: root });
</script>

<template>
  <div ref="root" :class="rootClass" v-bind="passthroughAttrs">
    <span aria-hidden="true">{{ value }}{{ isMaxShown ? ` / ${max}` : '' }}</span>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>
