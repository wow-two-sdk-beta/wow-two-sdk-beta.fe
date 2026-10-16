<script lang="ts">
export interface KeyboardShortcutTextProps {
  /** The keys in order — e.g. `['⌘', 'K']` or `['Ctrl', 'Shift', 'P']`. */
  readonly keys: ReadonlyArray<string>;

  /** The connector between keys. Default `'+'`; pass `' '` for spaced keys. */
  readonly separator?: string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import KbdText from '../kbdText/KbdText.vue';

/**
 * Renders a `keys` sequence as `KbdText` chips joined by connectors.
 *
 * For example `<KeyboardShortcutText :keys="['⌘', 'K']" />` reads ⌘ + K.
 */
defineOptions({ name: 'KeyboardShortcutText', inheritAttrs: false });

const props = withDefaults(defineProps<KeyboardShortcutTextProps>(), { separator: '+' });

const attrs = useAttrs();
const el = useTemplateRef<HTMLSpanElement>('el');

const classes = computed(() =>
  cn('inline-flex items-center gap-1 text-muted-foreground', attrs.class as string | undefined),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <span ref="el" v-bind="rest" :class="classes">
    <template v-for="(keyLabel, i) in props.keys" :key="i">
      <span v-if="i > 0" aria-hidden="true">{{ props.separator }}</span>
      <KbdText>{{ keyLabel }}</KbdText>
    </template>
  </span>
</template>
