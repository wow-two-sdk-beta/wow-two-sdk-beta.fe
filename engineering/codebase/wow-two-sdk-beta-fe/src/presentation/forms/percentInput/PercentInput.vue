<script lang="ts">
import type { NumberInputProps } from '../numberInput';

/* React spelled this `Omit<NumberInputProps, 'children'>`; `children` is a slot here, so the
   whole `NumberInput` surface carries over unchanged. Kept an interface, not a type alias:
   the SFC prop resolver reads a declared interface, and the name has to stay importable. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PercentInputProps extends NumberInputProps {}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import NumberInput from '../numberInput/NumberInput.vue';

/** Renders a `NumberInput` with a trailing `%` decoration; the typed value stays the bare 0–100 number. */
/* `inheritAttrs: false` so `class` folds into the wrapper's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'PercentInput', inheritAttrs: false });

const props = withDefaults(defineProps<PercentInputProps>(), {
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

const wrapperClass = computed(() => cn('relative', attrs.class as ClassValue));

const inner = useTemplateRef<{ el: HTMLInputElement | null }>('inner');

/** The rendered `<input>` — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: computed(() => inner.value?.el ?? null) });
</script>

<template>
  <div :class="wrapperClass">
    <NumberInput ref="inner" v-bind="{ ...props, ...passthroughAttrs }" class="pr-16" />
    <span class="pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
      %
    </span>
  </div>
</template>
