<script lang="ts">
/** Props for `FormattedRelative`. */
export interface FormattedRelativeProps {
  /** Signed magnitude — negative = past (`-3` → "3 days ago"), positive = future. */
  readonly value: number;
  readonly unit: Intl.RelativeTimeFormatUnit;
  readonly options?: Intl.RelativeTimeFormatOptions;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';

import { useLocaleFormatters } from '../LocaleFormatters';

/** Renders a locale-formatted relative time (e.g. "3 days ago") via `Intl.RelativeTimeFormat`. */
defineOptions({ name: 'FormattedRelative' });

const props = defineProps<FormattedRelativeProps>();

const formatters = useLocaleFormatters();
const text = computed(() => formatters.value.relativeTime(props.value, props.unit, props.options));
</script>

<template>{{ text }}</template>
