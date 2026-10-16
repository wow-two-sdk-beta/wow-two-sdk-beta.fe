<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue';
import ExampleRenderer from '../../../playground/src/gallery/ExampleRenderer.vue';
import type { SmokeCase } from '../../../playground/src/gallery/fixtures/Example';

/** One live component in a card, with a render-error boundary; overlays render only on request. */
const props = defineProps<{
  example: SmokeCase;
  isOnDemand?: boolean;
}>();

const isLive = ref(!props.isOnDemand);
const error = ref<string | null>(null);

onErrorCaptured((err) => {
  error.value ??= err instanceof Error ? err.message : String(err);
  return false;
});
</script>

<template>
  <section class="flex flex-col rounded-lg border border-border bg-card">
    <header class="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
      <h3 class="font-mono text-[13px] font-semibold">{{ example.name }}</h3>
      <button
        v-if="isOnDemand"
        type="button"
        class="rounded border border-border px-2 py-0.5 text-xs hover:bg-muted"
        @click="isLive = !isLive"
      >
        {{ isLive ? 'Unmount' : 'Render' }}
      </button>
    </header>
    <div class="min-h-16 p-3">
      <p v-if="example.skipMount" class="text-xs text-muted-foreground">{{ example.skipMount }}</p>
      <p v-else-if="error" class="font-mono text-xs text-destructive">{{ error }}</p>
      <ExampleRenderer v-else-if="isLive" :example="example" />
      <p v-else class="text-xs text-muted-foreground">Overlays render on request, so they never cover the page.</p>
    </div>
  </section>
</template>
