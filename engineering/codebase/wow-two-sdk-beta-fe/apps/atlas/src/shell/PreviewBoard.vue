<script setup lang="ts">
import { ref } from 'vue';
import { Button } from '@wow-two-beta/ui-vue/presentation/actions';
import {
  Badge,
  Card,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TabsGroup,
  TabsGroupList,
  TabsGroupPanel,
  TabsGroupTab,
  Tag,
} from '@wow-two-beta/ui-vue/presentation/display';
import { Alert, Banner, ProgressBar } from '@wow-two-beta/ui-vue/presentation/feedback';
import {
  CheckboxField,
  SwitchField,
  TextInput,
  ToggleGroup,
  ToggleInput,
} from '@wow-two-beta/ui-vue/presentation/forms';

/* A product surface built only from SDK components and theme tokens — "how does this theme feel". Everything
   stays inline (no popovers or dialogs): portaled UI would leave the preview scope for the atlas theme. */

const Invoices = [
  { id: 'INV-1024', plan: 'Pro', status: 'Paid', amount: '$120.00' },
  { id: 'INV-1025', plan: 'Team', status: 'Pending', amount: '$340.00' },
  { id: 'INV-1026', plan: 'Free', status: 'Refunded', amount: '$0.00' },
] as const;

const StatusBadge = { Paid: 'success', Pending: 'warning', Refunded: 'danger' } as const;

const Tones = ['primary', 'neutral', 'success', 'warning', 'danger'] as const;
const Variants = ['soft', 'outline', 'ghost', 'link'] as const;

const period = ref<string | null>('month');
const alerts = ref(true);
const digest = ref(false);
</script>

<template>
  <div class="flex flex-col gap-4">
    <Banner severity="info" title="Trial ends in 5 days" description="Upgrade to keep your workspace and analytics.">
      <template #actions><Button size="sm">Upgrade</Button></template>
    </Banner>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatCard label="Revenue" value="$48.2k" :trend="{ value: 12, label: 'vs last month' }" />
      <StatCard label="Active users" value="2,310" :trend="{ value: 4, label: 'week on week' }" />
      <StatCard label="Churn" value="1.8%" :trend="{ value: -2, label: 'improved' }" />
    </div>

    <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <Card padding="lg" class="flex flex-col gap-4">
        <div>
          <p class="font-semibold">Buttons and inputs</p>
          <p class="text-sm text-muted-foreground">Every tone solid, then the quieter variants.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button v-for="tone in Tones" :key="tone" :tone="tone" class="capitalize">{{ tone }}</Button>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button v-for="variant in Variants" :key="variant" :variant="variant" class="capitalize">{{
            variant
          }}</Button>
        </div>
        <TextInput placeholder="you@example.com" aria-label="Email" />
        <ToggleGroup
          :model-value="period"
          variant="segmented"
          aria-label="Period"
          @update:model-value="(value) => (period = typeof value === 'string' ? value : null)"
        >
          <ToggleInput value="week">Week</ToggleInput>
          <ToggleInput value="month">Month</ToggleInput>
          <ToggleInput value="year">Year</ToggleInput>
        </ToggleGroup>
        <div class="flex flex-wrap gap-x-6 gap-y-2">
          <SwitchField v-model="alerts" label="Alerts" />
          <CheckboxField v-model="digest" label="Weekly digest" />
        </div>
        <ProgressBar :value="64" label="Storage used" />
        <div class="flex flex-wrap items-center gap-2">
          <Badge variant="brand">Brand</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="info">Info</Badge>
          <Tag variant="brand">design</Tag>
          <Tag>ui</Tag>
        </div>
      </Card>

      <Card padding="lg">
        <TabsGroup default-value="invoices">
          <TabsGroupList>
            <TabsGroupTab value="invoices">Invoices</TabsGroupTab>
            <TabsGroupTab value="alerts">Alerts</TabsGroupTab>
          </TabsGroupList>
          <TabsGroupPanel value="invoices" class="pt-4">
            <Table is-hoverable>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Invoice</TableHeaderCell>
                  <TableHeaderCell>Plan</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell class="text-right">Amount</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow v-for="row in Invoices" :key="row.id">
                  <TableCell class="font-medium">{{ row.id }}</TableCell>
                  <TableCell>{{ row.plan }}</TableCell>
                  <TableCell>
                    <Badge :variant="StatusBadge[row.status]" size="sm">{{ row.status }}</Badge>
                  </TableCell>
                  <TableCell class="text-right tabular-nums">{{ row.amount }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TabsGroupPanel>
          <TabsGroupPanel value="alerts" class="flex flex-col gap-3 pt-4">
            <Alert severity="success" title="Payment received" description="Your invoice was paid." />
            <Alert severity="warning" title="Card expiring" description="Update your card before the 30th." />
            <Alert severity="danger" title="Sync failed" description="The billing provider did not answer." />
          </TabsGroupPanel>
        </TabsGroup>
      </Card>
    </div>
  </div>
</template>
