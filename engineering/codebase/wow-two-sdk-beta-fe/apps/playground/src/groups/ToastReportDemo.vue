<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef } from 'vue';
import { createApiClient } from '@wow-two-beta/ui-vue/foundation/http';
import { createFeedbackBus, feedbackQueryErrors } from '@wow-two-beta/ui-vue/feedback';
import { createReporter, memoryReportSink, type IncidentReport } from '@wow-two-beta/ui-vue/reporting';
import { FeedbackToastHost, ToastTimer, toastHost } from '@wow-two-beta/ui-vue/presentation/feedback';
import { Button } from '@wow-two-beta/ui-vue/presentation/actions';

/* One host for the whole demo: direct `toastHost` toasts and bus notices render in the same viewport. */
const bus = createFeedbackBus();
const timer = shallowRef<ToastTimer>(ToastTimer.Ring);
const Timers = Object.values(ToastTimer);
const Severities = ['info', 'success', 'warning', 'danger'] as const;

/* A reporter whose sink keeps reports in memory, so the demo shows exactly what an ingest would receive. */
const sink = memoryReportSink();
const lastReport = shallowRef<IncidentReport | null>(null);
const reporter = createReporter({
  app: { name: 'playground', version: '0.0.0', environment: 'development' },
  sink: {
    async send(report) {
      const receipt = await sink.send(report);
      lastReport.value = report;
      return receipt;
    },
  },
});

/* A fake backend: every deploy fails with the problem details the backend SDK writes (trace + request id). */
const api = createApiClient({
  fetch: reporter.wrapFetch(async (input) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const url = String(input);
    if (url.includes('/deploy')) {
      return new Response(
        JSON.stringify({
          title: 'Deploy failed',
          status: 500,
          traceId: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
          requestId: '0HN4K1:00000002',
        }),
        { status: 500, headers: { 'Content-Type': 'application/problem+json' } },
      );
    }
    return new Response(JSON.stringify({ data: { servers: 3 } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
});
const onQueryError = feedbackQueryErrors(bus, { reporter });

let stops: Array<() => void> = [];
onMounted(() => {
  stops = [reporter.captureClicks(), reporter.trackNotices(bus)];
});
onUnmounted(() => stops.forEach((stop) => stop()));

function show(severity: (typeof Severities)[number]): void {
  toastHost.toast({ severity, title: `${severity} toast`, description: 'Hover or focus the stack to pause it.' });
}

async function deploy(): Promise<void> {
  await api.get('/api/servers', { unwrap: false });
  const outcome = await api.post('/api/servers/42/deploy', { body: { force: true } });
  if (!outcome.ok) onQueryError(outcome.failure);
}
</script>

<template>
  <div class="space-y-3">
    <FeedbackToastHost :bus="bus" :timer="timer" position="bottom-right" />
    <div class="flex flex-wrap items-center gap-1">
      <span class="mr-1 text-xs text-muted-foreground">timer</span>
      <Button
        v-for="mode in Timers"
        :key="mode"
        size="xs"
        :variant="mode === timer ? 'solid' : 'outline'"
        @click="timer = mode"
      >
        {{ mode }}
      </Button>
    </div>
    <div class="flex flex-wrap gap-1">
      <Button v-for="s in Severities" :key="s" size="xs" variant="soft" @click="show(s)">{{ s }}</Button>
    </div>
    <Button size="sm" variant="outline" @click="deploy">Deploy server 42 (fails)</Button>
    <pre v-if="lastReport" class="max-h-60 overflow-auto rounded-md bg-muted p-2 text-[10px] leading-snug">{{
      JSON.stringify(lastReport, null, 2)
    }}</pre>
    <p v-else class="text-xs text-muted-foreground">Press Report on the failure toast to see the incident it files.</p>
  </div>
</template>
