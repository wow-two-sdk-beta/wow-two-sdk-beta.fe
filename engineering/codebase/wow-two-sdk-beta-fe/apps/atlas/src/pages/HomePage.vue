<script setup lang="ts">
import { Archetypes } from '../content/layouts';
import { PatternGroups } from '../content/patterns';
import { Guides } from '../content/guides';
import { Screens } from '../content/screens';
import { href } from '../router';
import WireCard from '../shell/WireCard.vue';

const Entrances = [
  {
    section: 'layouts',
    title: 'Layouts',
    text: `${Archetypes.length} archetypes — where each shines, where it fails, and which of our apps uses it.`,
  },
  {
    section: 'patterns',
    title: 'Patterns',
    text: `${PatternGroups.length} decision axes side by side: navigation, panels, collections, surfaces, density.`,
  },
  {
    section: 'guides',
    title: 'Guides',
    text: `${Guides.length} decision guides: answer a few questions, get a layout.`,
  },
  { section: 'lab', title: 'Lab', text: 'Compose navigation × panels × content × surface × density on any device.' },
  {
    section: 'screens',
    title: 'Screens',
    text: `${Screens.length} archetypes built from real SDK components — the wireframes, checked against what ships.`,
  },
  { section: 'components', title: 'Components', text: 'Every exported SDK component, rendered live by family.' },
  { section: 'themes', title: 'Themes', text: 'The theme catalogue as swatches; apply any theme to the whole atlas.' },
  {
    section: 'studio',
    title: 'Studio',
    text: 'Generate an AA-checked theme from an OKLCH seed; share, apply or export it.',
  },
] as const;
</script>

<template>
  <div class="mx-auto flex max-w-6xl flex-col gap-8">
    <section class="flex flex-col gap-2 pt-4">
      <p class="text-xs font-semibold uppercase tracking-widest text-primary">UI atlas</p>
      <h1 class="text-3xl font-semibold tracking-tight">Layouts, patterns, components and themes</h1>
      <p class="max-w-2xl text-muted-foreground">
        A map of how our products are put together — grey wireframes to reason about structure, live components to check
        the details, and every theme to try the mood. Open a layout, say where it fits, and brainstorm from there.
      </p>
    </section>

    <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <a
        v-for="entry in Entrances"
        :key="entry.section"
        :href="href(entry.section)"
        class="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      >
        <p class="font-semibold">{{ entry.title }}</p>
        <p class="mt-1 text-sm text-muted-foreground">{{ entry.text }}</p>
      </a>
    </section>

    <section class="flex flex-col gap-3">
      <div class="flex items-baseline justify-between gap-2">
        <h2 class="text-lg font-semibold">All layouts at a glance</h2>
        <a :href="href('layouts')" class="text-sm text-primary hover:underline">Open the catalogue</a>
      </div>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <WireCard
          v-for="archetype in Archetypes"
          :key="archetype.id"
          :href="href('layouts', archetype.id)"
          :name="archetype.name"
          :summary="archetype.summary"
          :spec="archetype.spec"
        />
      </div>
    </section>
  </div>
</template>
