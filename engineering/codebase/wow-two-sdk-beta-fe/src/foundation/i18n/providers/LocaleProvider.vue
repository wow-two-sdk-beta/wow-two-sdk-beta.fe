<script lang="ts">
import type { Messages } from './LocaleContext';

/** Props for `LocaleProvider`. */
export interface LocaleProviderProps {
  /** BCP-47 locale. Defaults to `en-US` on both server and client. */
  readonly locale?: string;
  /** Consumer message overrides — a dictionary or a `(key, vars) => string` callback. */
  readonly messages?: Messages;
}
</script>

<script setup lang="ts">
import { toRef } from 'vue';
import { provideLocale } from './LocaleContext';

/**
 * Renders no element of its own — the slot passes straight through — while providing the active locale and its
 * message overrides to every descendant SDK component.
 */
defineOptions({ name: 'LocaleProvider' });

const props = defineProps<LocaleProviderProps>();

defineSlots<{
  /** The subtree that reads the provided locale and messages. */
  default(): unknown;
}>();

provideLocale(() => props.locale, toRef(props, 'messages'));
</script>

<template>
  <slot />
</template>
