<script setup lang="ts">
import { computed, h, shallowRef } from 'vue';
import { Activity, Boxes, Gauge, Rocket, Settings } from 'lucide-vue-next';
import { Button } from '@wow-two-beta/ui-vue/presentation/actions';
import { Badge, CountBadge, DataTable, Sparkline, StatCard } from '@wow-two-beta/ui-vue/presentation/display';
import { Alert } from '@wow-two-beta/ui-vue/presentation/feedback';
import { ToggleGroup, ToggleInput } from '@wow-two-beta/ui-vue/presentation/forms';
import { SidebarMenu, SidebarMenuItem, SidebarMenuSection } from '@wow-two-beta/ui-vue/presentation/nav';

/* Dashboard archetype: a sidebar shell, a KPI row, trend tiles and a table tile holding the records behind the
   numbers. The period switch re-slices every series, so the tiles stay one story. */

interface Deployment {
  readonly id: string;
  readonly service: string;
  readonly environment: string;
  readonly outcome: 'Succeeded' | 'Failed' | 'Rolled back';
  readonly minutes: number;
}

const Series = {
  week: { deploys: [12, 18, 9, 22, 17, 25, 21], failures: [1, 0, 2, 1, 0, 1, 0], lead: [42, 38, 45, 31, 29, 27, 24] },
  month: {
    deploys: [60, 72, 58, 81, 77, 90, 95, 88, 102, 110, 97, 120],
    failures: [4, 6, 3, 5, 2, 4, 3, 2, 3, 1, 2, 2],
    lead: [55, 51, 49, 47, 44, 43, 40, 38, 35, 33, 31, 29],
  },
} as const;

type Period = keyof typeof Series;

const Deployments: ReadonlyArray<Deployment> = [
  { id: 'dep-481', service: 'checkout', environment: 'production', outcome: 'Succeeded', minutes: 6 },
  { id: 'dep-480', service: 'search', environment: 'staging', outcome: 'Failed', minutes: 11 },
  { id: 'dep-479', service: 'billing', environment: 'production', outcome: 'Rolled back', minutes: 14 },
  { id: 'dep-478', service: 'identity', environment: 'production', outcome: 'Succeeded', minutes: 5 },
  { id: 'dep-477', service: 'catalog', environment: 'preview', outcome: 'Succeeded', minutes: 4 },
];

const OutcomeBadge = { Succeeded: 'success', Failed: 'danger', 'Rolled back': 'warning' } as const;

const Columns = [
  { key: 'id', header: 'Deployment', accessor: (row: Deployment) => row.id },
  { key: 'service', header: 'Service', isSortable: true, accessor: (row: Deployment) => row.service },
  { key: 'environment', header: 'Environment', accessor: (row: Deployment) => row.environment },
  {
    key: 'outcome',
    header: 'Outcome',
    accessor: (row: Deployment) => row.outcome,
    cell: (row: Deployment) => h(Badge, { variant: OutcomeBadge[row.outcome], size: 'sm' }, () => row.outcome),
  },
  {
    key: 'minutes',
    header: 'Minutes',
    align: 'right' as const,
    isSortable: true,
    accessor: (row: Deployment) => row.minutes,
  },
];

const period = shallowRef<Period>('week');
const series = computed(() => Series[period.value]);
const total = (values: ReadonlyArray<number>): number => values.reduce((sum, value) => sum + value, 0);
const failureRate = computed(() => (total(series.value.failures) / total(series.value.deploys)) * 100);

function choosePeriod(value: unknown): void {
  if (value === 'week' || value === 'month') period.value = value;
}
</script>

<template>
  <div class="flex h-full min-h-0">
    <aside class="hidden w-56 shrink-0 border-r border-border bg-card p-2 md:block">
      <SidebarMenu aria-label="Fleet">
        <SidebarMenuSection label="Fleet">
          <SidebarMenuItem href="#/screens/dashboard" is-active>
            <template #icon><Gauge class="size-4" /></template>
            Overview
          </SidebarMenuItem>
          <SidebarMenuItem href="#/screens/dashboard">
            <template #icon><Rocket class="size-4" /></template>
            <template #trailing><CountBadge :value="3" /></template>
            Deployments
          </SidebarMenuItem>
          <SidebarMenuItem href="#/screens/dashboard">
            <template #icon><Boxes class="size-4" /></template>
            Environments
          </SidebarMenuItem>
          <SidebarMenuItem href="#/screens/dashboard">
            <template #icon><Activity class="size-4" /></template>
            Incidents
          </SidebarMenuItem>
        </SidebarMenuSection>
        <SidebarMenuSection label="Workspace">
          <SidebarMenuItem href="#/screens/settings">
            <template #icon><Settings class="size-4" /></template>
            Settings
          </SidebarMenuItem>
        </SidebarMenuSection>
      </SidebarMenu>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold">Overview</h2>
          <p class="text-sm text-muted-foreground">Deployment outcomes across every environment.</p>
        </div>
        <div class="flex items-center gap-2">
          <ToggleGroup :model-value="period" variant="segmented" aria-label="Period" @update:model-value="choosePeriod">
            <ToggleInput value="week">7 days</ToggleInput>
            <ToggleInput value="month">12 weeks</ToggleInput>
          </ToggleGroup>
          <Button size="sm" variant="outline">Export</Button>
        </div>
      </header>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Deploys"
          :value="total(series.deploys).toLocaleString()"
          :trend="{ value: 14, label: 'vs previous' }"
        />
        <StatCard
          label="Failure rate"
          :value="`${failureRate.toFixed(1)}%`"
          :trend="{ value: -3, label: 'improved' }"
        />
        <StatCard label="Lead time" :value="`${series.lead.at(-1)} min`" :trend="{ value: -8, label: 'faster' }" />
      </div>

      <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <section class="rounded-lg border border-border bg-card p-4" aria-label="Deploys trend">
          <p class="mb-3 text-sm font-medium">Deploys</p>
          <Sparkline
            :data="series.deploys"
            variant="bar"
            tone="brand"
            :width="320"
            :height="64"
            aria-label="Deploys per period"
          />
        </section>
        <section class="rounded-lg border border-border bg-card p-4" aria-label="Lead time trend">
          <p class="mb-3 text-sm font-medium">Lead time (minutes)</p>
          <Sparkline
            :data="series.lead"
            variant="area"
            tone="success"
            :width="320"
            :height="64"
            has-last
            aria-label="Lead time per period"
          />
        </section>
      </div>

      <Alert
        severity="warning"
        title="billing rolled back in production"
        description="The canary breached its error budget; the previous build is live again."
      />

      <section class="rounded-lg border border-border bg-card p-4" aria-label="Recent deployments">
        <p class="mb-3 text-sm font-medium">Recent deployments</p>
        <DataTable :columns="Columns" :data="Deployments" :row-key="(row: Deployment) => row.id" is-hoverable />
      </section>
    </div>
  </div>
</template>
