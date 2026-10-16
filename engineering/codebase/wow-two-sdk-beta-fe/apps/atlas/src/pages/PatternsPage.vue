<script setup lang="ts">
import { computed } from 'vue';
import { PatternGroups, findPatternGroup } from '../content/patterns';
import { specToQuery } from '../content/specQuery';
import { href, route } from '../router';
import Verdicts from '../shell/Verdicts.vue';
import LayoutWire from '../wire/LayoutWire.vue';

/** One group at a time keeps each comparison on one screen. */
const group = computed(() => findPatternGroup(route.value.id) ?? PatternGroups[0]!);
</script>

<template>
  <div class="mx-auto flex max-w-7xl flex-col gap-5">
    <header>
      <h1 class="text-2xl font-semibold tracking-tight">Patterns</h1>
      <p class="mt-1 max-w-2xl text-muted-foreground">
        One decision axis at a time, everything else held still — so the difference you see is the pattern.
      </p>
    </header>

    <nav aria-label="Pattern groups" class="flex flex-wrap gap-1">
      <a
        v-for="entry in PatternGroups"
        :key="entry.id"
        :href="href('patterns', entry.id)"
        :aria-current="entry.id === group.id ? 'page' : undefined"
        class="rounded-md px-3 py-1.5 text-sm transition-colors"
        :class="
          entry.id === group.id
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        "
      >
        {{ entry.name }}
      </a>
    </nav>

    <p class="text-lg font-medium">{{ group.question }}</p>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="pattern in group.patterns"
        :key="pattern.id"
        class="flex flex-col gap-3 rounded-lg border border-border bg-card p-3"
      >
        <LayoutWire :spec="pattern.spec" :label="`${pattern.name} wireframe`" />
        <div class="flex items-baseline justify-between gap-2">
          <h2 class="font-semibold">{{ pattern.name }}</h2>
          <a :href="href('lab', null, specToQuery(pattern.spec))" class="text-xs text-primary hover:underline"
            >Open in lab</a
          >
        </div>
        <p class="text-sm text-muted-foreground">{{ pattern.summary }}</p>
        <Verdicts :shines="pattern.shines" :avoid="pattern.avoid" is-compact />
      </article>
    </div>
  </div>
</template>
