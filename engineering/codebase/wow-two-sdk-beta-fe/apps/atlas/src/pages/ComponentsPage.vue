<script setup lang="ts">
import { computed, ref } from 'vue';
import { actionsExamples } from '../../../playground/src/gallery/fixtures/ActionsExamples';
import { displayExamples } from '../../../playground/src/gallery/fixtures/DisplayExamples';
import { feedbackExamples } from '../../../playground/src/gallery/fixtures/FeedbackExamples';
import { formsExamples } from '../../../playground/src/gallery/fixtures/FormsExamples';
import { layoutExamples } from '../../../playground/src/gallery/fixtures/LayoutExamples';
import { navExamples } from '../../../playground/src/gallery/fixtures/NavExamples';
import { overlaysExamples } from '../../../playground/src/gallery/fixtures/OverlaysExamples';
import { href, route } from '../router';
import ComponentCard from '../shell/ComponentCard.vue';

/* The families are the SDK's presentation barrels; the examples are the playground's typed fixtures, so the atlas
   renders exactly what the render and SSR tests mount. */
const Families = [
  {
    id: 'actions',
    name: 'Actions',
    role: 'Buttons, toggles, toolbars and dials people press.',
    examples: actionsExamples,
  },
  { id: 'forms', name: 'Forms', role: 'Inputs and pickers that hold a value.', examples: formsExamples },
  { id: 'display', name: 'Display', role: 'Data, media and text shown to read.', examples: displayExamples },
  { id: 'feedback', name: 'Feedback', role: 'Status, progress, alerts and toasts.', examples: feedbackExamples },
  { id: 'layout', name: 'Layout', role: 'Shells, stacks, grids and panels.', examples: layoutExamples },
  { id: 'nav', name: 'Navigation', role: 'Menus, bars, tabs and links between places.', examples: navExamples },
  {
    id: 'overlays',
    name: 'Overlays',
    role: 'Modals, popovers and sheets over the page — rendered on request.',
    examples: overlaysExamples,
    isOnDemand: true,
  },
] as const;

const family = computed(() => Families.find((entry) => entry.id === route.value.id) ?? Families[0]);
const search = ref('');
const visible = computed(() => {
  const query = search.value.trim().toLowerCase();
  return family.value.examples.filter((example) => example.name.toLowerCase().includes(query));
});
</script>

<template>
  <div class="mx-auto flex max-w-7xl flex-col gap-5">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Components</h1>
        <p class="mt-1 max-w-2xl text-muted-foreground">
          Every exported component, live in the current theme. The playground at port 5176 keeps the curated demos.
        </p>
      </div>
      <input
        v-model="search"
        type="search"
        placeholder="Filter by name"
        aria-label="Filter components by name"
        class="w-64 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
      />
    </header>

    <nav aria-label="Component families" class="flex flex-wrap gap-1">
      <a
        v-for="entry in Families"
        :key="entry.id"
        :href="href('components', entry.id)"
        :aria-current="entry.id === family.id ? 'page' : undefined"
        class="rounded-md px-3 py-1.5 text-sm transition-colors"
        :class="
          entry.id === family.id
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        "
      >
        {{ entry.name }} <span class="opacity-70">{{ entry.examples.length }}</span>
      </a>
    </nav>

    <p class="text-sm text-muted-foreground">{{ family.role }}</p>

    <div class="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
      <ComponentCard
        v-for="example in visible"
        :key="`${family.id}-${example.name}`"
        :example="example"
        :is-on-demand="'isOnDemand' in family && family.isOnDemand"
      />
    </div>
  </div>
</template>
