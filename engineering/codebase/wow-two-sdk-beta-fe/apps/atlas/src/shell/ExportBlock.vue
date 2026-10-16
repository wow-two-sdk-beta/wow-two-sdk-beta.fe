<script setup lang="ts">
import { CopyButton } from '@wow-two-beta/ui-vue/presentation/actions';

/** A labelled, copyable code block — one studio export format. */
defineProps<{
  label: string;
  text: string;
}>();
</script>

<template>
  <section class="overflow-hidden rounded-lg border border-border bg-card">
    <header class="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
      <h3 class="text-sm font-medium">{{ label }}</h3>
      <CopyButton :text="text" :aria-label="`Copy ${label}`" size="sm" variant="soft">
        <template #default="{ copied }">{{ copied ? 'Copied' : 'Copy' }}</template>
      </CopyButton>
    </header>
    <pre class="max-h-96 overflow-auto p-3 text-xs leading-relaxed"><code>{{ text }}</code></pre>
  </section>
</template>
