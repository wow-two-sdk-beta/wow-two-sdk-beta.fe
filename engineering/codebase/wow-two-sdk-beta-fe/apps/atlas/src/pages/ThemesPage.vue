<script setup lang="ts">
import { computed, ref } from 'vue';
import { Check } from 'lucide-vue-next';
import { THEMES, type Theme } from '@wow-two-beta/ui-vue/foundation/themes';
import { findArchetype } from '../content/layouts';
import { isDark, themeId } from '../theme';
import ChoiceChips from '../shell/ChoiceChips.vue';
import LayoutWire from '../wire/LayoutWire.vue';

const Swatches = [
  'background',
  'card',
  'muted',
  'foreground',
  'primary',
  'accent',
  'success',
  'warning',
  'destructive',
] as const;

const status = ref('all');
const tag = ref('all');
const search = ref('');

const topTags = computed(() => {
  const counts = new Map<string, number>();
  for (const theme of THEMES) for (const value of theme.tags) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([value]) => value);
});

const statusOptions = { all: 'All', validated: 'Validated', candidate: 'Candidate' };
const tagOptions = computed(() =>
  Object.fromEntries([['all', 'All'], ...topTags.value.map((value) => [value, value])]),
);

const visible = computed(() => {
  const query = search.value.trim().toLowerCase();
  return THEMES.filter(
    (theme) =>
      (status.value === 'all' || theme.status === status.value) &&
      (tag.value === 'all' || theme.tags.includes(tag.value)) &&
      (query === '' || theme.name.toLowerCase().includes(query) || theme.id.includes(query)),
  );
});

const current = computed(() => THEMES.find((theme) => theme.id === themeId.value));

function tokensOf(theme: Theme): Record<string, string> {
  return (isDark.value ? theme.dark : theme.light) as Record<string, string>;
}

const previewSpecs = [findArchetype('studio-three-pane')!, findArchetype('canvas-islands')!, findArchetype('board')!];
</script>

<template>
  <div class="mx-auto flex max-w-7xl flex-col gap-5">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Themes</h1>
        <p class="mt-1 max-w-2xl text-muted-foreground">
          {{ THEMES.length }} themes, every one generated in OKLCH and AA-checked in light and dark. Click a card to
          apply it to the whole atlas; the swatches follow the light/dark switch.
        </p>
      </div>
      <input
        v-model="search"
        type="search"
        placeholder="Filter by name"
        aria-label="Filter themes by name"
        class="w-64 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
      />
    </header>

    <section
      v-if="current"
      class="grid gap-4 rounded-lg border border-border bg-card p-4 lg:grid-cols-[280px_minmax(0,1fr)]"
    >
      <div class="flex flex-col gap-3">
        <div>
          <p class="text-xs uppercase tracking-wide text-muted-foreground">Applied</p>
          <p class="text-lg font-semibold">{{ current.name }}</p>
          <p class="text-sm text-muted-foreground">{{ current.description }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
            Primary
          </button>
          <button type="button" class="rounded-md border border-border px-3 py-1.5 text-sm">Secondary</button>
          <span class="rounded-full bg-success-soft px-2 py-0.5 text-xs text-success-soft-foreground">Healthy</span>
          <span class="rounded-full bg-warning-soft px-2 py-0.5 text-xs text-warning-soft-foreground">Stale</span>
          <span class="rounded-full bg-destructive-soft px-2 py-0.5 text-xs text-destructive-soft-foreground"
            >Failed</span
          >
        </div>
        <p class="text-xs text-muted-foreground">Status: {{ current.status }} · radius {{ current.radius ?? 'md' }}</p>
      </div>
      <div class="grid gap-3 sm:grid-cols-3">
        <LayoutWire
          v-for="entry in previewSpecs"
          :key="entry.id"
          :spec="entry.spec"
          :label="`${entry.name} in ${current.name}`"
        />
      </div>
    </section>

    <div class="flex flex-wrap gap-6">
      <ChoiceChips v-model="status" label="Status" :options="statusOptions" />
      <ChoiceChips v-model="tag" label="Tag" :options="tagOptions" />
    </div>

    <p class="text-sm text-muted-foreground">{{ visible.length }} themes</p>

    <div class="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
      <button
        v-for="theme in visible"
        :key="theme.id"
        type="button"
        :aria-pressed="theme.id === themeId"
        class="flex flex-col gap-2 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        :class="theme.id === themeId ? 'border-primary' : 'border-border'"
        @click="themeId = theme.id"
      >
        <div class="flex items-center justify-between gap-2">
          <span class="truncate text-sm font-semibold">{{ theme.name }}</span>
          <Check v-if="theme.id === themeId" class="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span v-else class="shrink-0 text-[11px] text-muted-foreground">{{ theme.status }}</span>
        </div>
        <div class="flex overflow-hidden rounded-md border border-border">
          <span
            v-for="token in Swatches"
            :key="token"
            class="h-7 flex-1"
            :style="{ background: tokensOf(theme)[token] }"
            :title="`${token}: ${tokensOf(theme)[token]}`"
          />
        </div>
        <p class="line-clamp-2 text-xs text-muted-foreground">{{ theme.description }}</p>
      </button>
    </div>
  </div>
</template>
