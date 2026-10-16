<script setup lang="ts">
import { useId } from 'vue';

/** A labelled row of single-choice chips — the lab's and guides' option control. */
const props = defineProps<{
  label: string;
  options: Readonly<Record<string, string>>;
  modelValue: string;
}>();

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const labelId = useId();

function choose(value: string): void {
  if (value !== props.modelValue) emit('update:modelValue', value);
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span :id="labelId" class="text-xs font-medium text-muted-foreground">{{ label }}</span>
    <div role="radiogroup" :aria-labelledby="labelId" class="flex flex-wrap gap-1">
      <button
        v-for="(text, value) in options"
        :key="value"
        type="button"
        role="radio"
        :aria-checked="value === modelValue"
        class="rounded-md border px-2 py-1 text-xs transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        :class="
          value === modelValue
            ? 'border-transparent bg-primary text-primary-foreground'
            : 'border-border bg-background text-foreground hover:bg-muted'
        "
        @click="choose(String(value))"
      >
        {{ text }}
      </button>
    </div>
  </div>
</template>
