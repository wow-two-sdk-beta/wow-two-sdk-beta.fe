<script setup lang="ts">
import { computed } from 'vue';
import type { Theme } from '@wow-two-beta/ui-vue/foundation/themes';
import { Badge } from '@wow-two-beta/ui-vue/presentation/display';
import { contrastReport, type PairResult } from '../content/contrast';

/** The live WCAG report for both modes: pass counts, failures first, then the pairs with the least headroom. */
const props = defineProps<{ theme: Theme }>();

const reports = computed(() => [contrastReport(props.theme, 'light'), contrastReport(props.theme, 'dark')]);

function rows(report: { failures: ReadonlyArray<PairResult>; tightest: ReadonlyArray<PairResult> }): PairResult[] {
  return report.failures.length > 0 ? [...report.failures] : [...report.tightest];
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <section v-for="report in reports" :key="report.mode" :aria-label="`${report.mode} contrast`">
      <div class="mb-2 flex items-center justify-between gap-2">
        <h3 class="text-sm font-semibold capitalize">{{ report.mode }}</h3>
        <Badge :variant="report.failures.length === 0 ? 'success' : 'danger'" size="sm">
          {{ report.pairs.length - report.failures.length }} / {{ report.pairs.length }} pass
        </Badge>
      </div>
      <p class="mb-1 text-xs text-muted-foreground">
        {{ report.failures.length > 0 ? 'Failing pairs' : 'Least headroom' }}
      </p>
      <ul class="flex flex-col gap-1">
        <li v-for="pair in rows(report)" :key="pair.label" class="flex items-center justify-between gap-2 text-xs">
          <span class="min-w-0 truncate font-mono text-muted-foreground" :title="pair.label">{{ pair.label }}</span>
          <span
            class="shrink-0 font-mono tabular-nums"
            :class="pair.isPassing ? 'text-foreground' : 'text-destructive-soft-foreground'"
          >
            {{ pair.ratio.toFixed(2) }} / {{ pair.min.toFixed(1) }}
          </span>
        </li>
      </ul>
    </section>
  </div>
</template>
