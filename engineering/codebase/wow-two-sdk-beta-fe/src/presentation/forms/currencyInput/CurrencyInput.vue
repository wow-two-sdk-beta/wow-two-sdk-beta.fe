<script lang="ts">
import type { NumberInputProps } from '../numberInput';

/* React spelled this `Omit<NumberInputProps, 'children'>`; `children` is a slot here, so the
   whole `NumberInput` surface carries over unchanged. */
export interface CurrencyInputProps extends NumberInputProps {
  /** The currency symbol or 3-letter code displayed as a prefix. Default `"$"`. */
  readonly symbol?: string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import NumberInput from '../numberInput/NumberInput.vue';

/** Renders a `NumberInput` behind a leading currency symbol; the typed value stays the bare number. */
/* `inheritAttrs: false` so `class` folds into the wrapper's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'CurrencyInput', inheritAttrs: false });

const props = withDefaults(defineProps<CurrencyInputProps>(), {
  symbol: '$',
  /* Explicit `undefined` for every inherited boolean: Vue casts an absent `boolean` prop to `false`, and this
     wrapper forwards its props — a cast `false` would override the inner input's own default and the Field context. */
  isDisabled: undefined,
  disabled: undefined,
  isReadOnly: undefined,
  readOnly: undefined,
  readonly: undefined,
  isRequired: undefined,
  required: undefined,
});

const attrs = useAttrs();

/*
 * No `defineEmits` on purpose: `update:modelValue` are NOT re-declared, so a
 * consumer's listeners stay in `useAttrs()` and reach `NumberInput` through the passthrough
 * below — declaring them here would strip the listeners and silently break `v-model`.
 */
const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

/** `symbol` is this component's own — it must not reach the inner `NumberInput`. */
const numberProps = computed(() => {
  const { symbol: _symbol, ...rest } = props;
  return rest;
});

const wrapperClass = computed(() => cn('relative', attrs.class as ClassValue));

const inner = useTemplateRef<{ el: HTMLInputElement | null }>('inner');

/** The rendered `<input>` — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: computed(() => inner.value?.el ?? null) });
</script>

<template>
  <div :class="wrapperClass">
    <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
      {{ symbol }}
    </span>
    <NumberInput ref="inner" v-bind="{ ...numberProps, ...passthroughAttrs }" class="pl-7" />
  </div>
</template>
