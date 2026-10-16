<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue';
import { record } from '../diagnostics';

/**
 * Wraps one component's demo in a labelled card with a render-error boundary.
 *
 * A gallery is one long page: without the boundary, a single component throwing
 * blanks every section below it and the run reports nothing. Caught errors are
 * rendered in place, so the page keeps scrolling and the failure is visible
 * exactly where it happened.
 */
const props = defineProps<{
  /** The component (or cluster) this card shows. */
  name: string;
  /** Optional one-line note — what the demo is proving. */
  note?: string;
  /** Renders the card body on a flat background rather than the card surface. */
  bare?: boolean;
  /**
   * Spans every column of the enclosing auto-fill grid.
   *
   * A matrix wider than ~6 columns squeezed into a 320px track grows an inner
   * horizontal scrollbar, and two axes you have to scroll between cannot be
   * compared — which is the entire job of a matrix.
   */
  isWide?: boolean;
}>();

const message = ref<string | null>(null);
const stack = ref<string | null>(null);

/*
 * Keeps the FIRST error, not the last.
 *
 * A component whose `setup()` throws never produces its setup bindings, so Vue
 * goes on to render it and the template dies a second time on
 * `$setup.<binding>` — a meaningless `Cannot read properties of undefined`.
 * That secondary TypeError arrives last and would overwrite the real message
 * (e.g. "must be used inside <Modal>"), which is the only one worth reading.
 */
onErrorCaptured((err) => {
  if (message.value === null) {
    message.value = err instanceof Error ? err.message : String(err);
    stack.value = err instanceof Error ? (err.stack ?? null) : null;
    record('error', message.value, props.name);
  }
  return false;
});
</script>

<template>
  <section class="rounded-lg border border-border bg-card" :class="isWide && 'col-span-full'">
    <header class="flex items-baseline gap-2 border-b border-border px-3 py-1.5">
      <h3 class="font-mono text-[13px] font-semibold text-foreground">{{ name }}</h3>
      <p v-if="note" class="truncate text-[11px] text-subtle-foreground">{{ note }}</p>
    </header>

    <div
      v-if="message !== null"
      class="whitespace-pre-wrap px-3 py-2 font-mono text-[11px] text-destructive"
      data-demo-error
    >
      {{ stack ?? message }}
    </div>

    <div v-else class="p-3" :class="bare ? '' : 'text-foreground'">
      <slot />
    </div>
  </section>
</template>
