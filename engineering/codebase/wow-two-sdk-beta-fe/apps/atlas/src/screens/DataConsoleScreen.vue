<script setup lang="ts">
import { computed, h, ref, shallowRef, watch } from 'vue';
import { Button } from '@wow-two-beta/ui-vue/presentation/actions';
import { Badge, DataTable } from '@wow-two-beta/ui-vue/presentation/display';
import { SearchInput, ToggleGroup, ToggleInput } from '@wow-two-beta/ui-vue/presentation/forms';
import { Pagination } from '@wow-two-beta/ui-vue/presentation/nav';

/* Data console archetype: filters and search over a dense table, a bulk bar once rows are picked, and pagination.
   Filters reset the page, and a bulk action applies to exactly the picked rows. */

interface Listing {
  readonly id: string;
  readonly title: string;
  readonly city: string;
  status: 'draft' | 'live' | 'archived';
  readonly price: number;
}

const Cities = ['Tashkent', 'Samarkand', 'Bukhara', 'Khiva'] as const;
const Titles = ['Loft', 'Studio', 'Townhouse', 'Garden flat', 'Penthouse', 'Courtyard house'] as const;
const Statuses = ['draft', 'live', 'archived'] as const;

const listings = ref<Listing[]>(
  Array.from({ length: 37 }, (_, index) => ({
    id: `L-${String(1001 + index)}`,
    title: `${Titles[index % Titles.length]} ${index + 1}`,
    city: Cities[index % Cities.length]!,
    status: Statuses[(index * 7) % Statuses.length]!,
    price: 380 + ((index * 53) % 900),
  })),
);

const StatusBadge = { draft: 'neutral', live: 'success', archived: 'warning' } as const;

const Columns = [
  { key: 'id', header: 'Listing', accessor: (row: Listing) => row.id },
  { key: 'title', header: 'Title', isSortable: true, accessor: (row: Listing) => row.title },
  { key: 'city', header: 'City', isSortable: true, accessor: (row: Listing) => row.city },
  {
    key: 'status',
    header: 'Status',
    accessor: (row: Listing) => row.status,
    cell: (row: Listing) => h(Badge, { variant: StatusBadge[row.status], size: 'sm' }, () => row.status),
  },
  {
    key: 'price',
    header: 'Price / month',
    align: 'right' as const,
    isSortable: true,
    accessor: (row: Listing) => row.price,
    cell: (row: Listing) => `$${row.price.toLocaleString()}`,
  },
];

const PageSize = 8;
const query = shallowRef('');
const status = shallowRef<'all' | Listing['status']>('all');
const page = shallowRef(1);
const selection = ref<Array<string | number>>([]);

const filtered = computed(() => {
  const text = query.value.trim().toLowerCase();
  return listings.value.filter(
    (row) =>
      (status.value === 'all' || row.status === status.value) &&
      (!text || row.title.toLowerCase().includes(text) || row.city.toLowerCase().includes(text)),
  );
});
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / PageSize)));
const pageRows = computed(() => filtered.value.slice((page.value - 1) * PageSize, page.value * PageSize));

/* A narrower filter can strand the reader past its last page, so filters return to page one. */
watch([query, status], () => {
  page.value = 1;
});

function chooseStatus(value: unknown): void {
  status.value = value === 'draft' || value === 'live' || value === 'archived' ? value : 'all';
}

function setStatus(next: Listing['status']): void {
  const picked = new Set(selection.value);
  for (const row of listings.value) if (picked.has(row.id)) row.status = next;
  selection.value = [];
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3 p-4">
    <header class="flex flex-wrap items-center gap-2">
      <h2 class="mr-auto text-lg font-semibold">Listings</h2>
      <SearchInput v-model="query" placeholder="Title or city" aria-label="Search listings" class="w-52" />
      <ToggleGroup :model-value="status" variant="segmented" aria-label="Status" @update:model-value="chooseStatus">
        <ToggleInput value="all">All</ToggleInput>
        <ToggleInput value="draft">Draft</ToggleInput>
        <ToggleInput value="live">Live</ToggleInput>
        <ToggleInput value="archived">Archived</ToggleInput>
      </ToggleGroup>
    </header>

    <div
      v-if="selection.length > 0"
      class="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm"
      role="region"
      aria-label="Bulk actions"
    >
      <span class="mr-auto font-medium">{{ selection.length }} selected</span>
      <Button size="sm" variant="soft" @click="setStatus('live')">Publish</Button>
      <Button size="sm" variant="soft" tone="warning" @click="setStatus('archived')">Archive</Button>
      <Button size="sm" variant="ghost" @click="selection = []">Clear</Button>
    </div>

    <div class="min-h-0 flex-1 overflow-auto">
      <DataTable
        v-model:selection="selection"
        :columns="Columns"
        :data="pageRows"
        :row-key="(row: Listing) => row.id"
        selection-mode="multiple"
        density="compact"
        has-sticky-header
        is-hoverable
        empty-content="No listings match."
      />
    </div>

    <footer class="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
      <span>{{ filtered.length }} listings</span>
      <Pagination v-model:page="page" :total="pageCount" />
    </footer>
  </div>
</template>
