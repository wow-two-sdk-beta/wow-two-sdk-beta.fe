<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ArrowLeft, FlaskConical, MonitorSmartphone } from 'lucide-vue-next';
import { Archetypes, findArchetype } from '../content/layouts';
import { OptionLabels, type Device } from '../content/model';
import { screenFor } from '../content/screens';
import { specToQuery } from '../content/specQuery';
import { href, route } from '../router';
import ChoiceChips from '../shell/ChoiceChips.vue';
import Verdicts from '../shell/Verdicts.vue';
import WireCard from '../shell/WireCard.vue';
import LayoutWire from '../wire/LayoutWire.vue';

const archetype = computed(() => findArchetype(route.value.id));

/** Tag filter for the catalogue. */
const tags = computed(() => ['all', ...new Set(Archetypes.flatMap((entry) => entry.tags))]);
const tag = ref('all');
const visible = computed(() =>
  tag.value === 'all' ? Archetypes : Archetypes.filter((entry) => entry.tags.includes(tag.value)),
);
const tagOptions = computed(() => Object.fromEntries(tags.value.map((value) => [value, value])));

const device = ref<Device>('desktop');
watch(
  () => route.value.id,
  () => {
    device.value = 'desktop';
  },
);

const related = computed(() =>
  (archetype.value?.related ?? []).flatMap((id) => {
    const entry = findArchetype(id);
    return entry ? [entry] : [];
  }),
);

/** The real-component screen built on this archetype, when one exists. */
const screen = computed(() => (archetype.value ? screenFor(archetype.value.id) : undefined));

const labLink = computed(() =>
  archetype.value
    ? href('lab', null, { ...specToQuery(archetype.value.spec, device.value), from: archetype.value.id })
    : '',
);

const axes = computed(() => {
  const spec = archetype.value?.spec;
  if (!spec) return [];
  return [
    ['Navigation', OptionLabels.nav[spec.nav]],
    ['Local', OptionLabels.local[spec.local]],
    ['Leading panel', spec.leading ? OptionLabels.panel[spec.leading] : '—'],
    ['Trailing panel', spec.trailing ? OptionLabels.panel[spec.trailing] : '—'],
    ['Panels', OptionLabels.panelMode[spec.panelMode]],
    ['Content', OptionLabels.content[spec.content]],
    ['Surface', OptionLabels.surface[spec.surface]],
    ['Density', OptionLabels.density[spec.density]],
  ];
});
</script>

<template>
  <div v-if="archetype" class="mx-auto flex max-w-6xl flex-col gap-6">
    <a
      :href="href('layouts')"
      class="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft class="size-4" aria-hidden="true" /> All layouts
    </a>
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">{{ archetype.name }}</h1>
        <p class="mt-1 max-w-2xl text-muted-foreground">{{ archetype.summary }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <a
          v-if="screen"
          :href="href('screens', screen.id)"
          class="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <MonitorSmartphone class="size-4" aria-hidden="true" /> See it built
        </a>
        <a
          :href="labLink"
          class="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <FlaskConical class="size-4" aria-hidden="true" /> Open in the lab
        </a>
      </div>
    </header>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div class="flex flex-col gap-3">
        <ChoiceChips v-model="device" label="Device" :options="OptionLabels.device" />
        <div
          :class="
            device === 'desktop'
              ? 'w-full'
              : device === 'tablet'
                ? 'mx-auto w-[min(100%,420px)]'
                : 'mx-auto w-[min(100%,260px)]'
          "
        >
          <LayoutWire :spec="archetype.spec" :device="device" :label="`${archetype.name} wireframe`" />
        </div>
      </div>
      <aside class="flex flex-col gap-4">
        <section>
          <h2 class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Anatomy</h2>
          <ol class="list-decimal space-y-1 pl-5 text-sm">
            <li v-for="part in archetype.anatomy" :key="part">{{ part }}</li>
          </ol>
        </section>
        <section>
          <h2 class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Axes</h2>
          <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <template v-for="[name, value] in axes" :key="name">
              <dt class="text-muted-foreground">{{ name }}</dt>
              <dd>{{ value }}</dd>
            </template>
          </dl>
        </section>
      </aside>
    </div>

    <Verdicts :shines="archetype.shines" :avoid="archetype.avoid" />

    <section v-if="archetype.examples.length">
      <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">In our products</h2>
      <ul class="grid gap-2 sm:grid-cols-2">
        <li
          v-for="example in archetype.examples"
          :key="example.note"
          class="rounded-lg border border-border bg-card p-3 text-sm"
        >
          <span class="mr-1.5 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">{{
            example.app
          }}</span>
          {{ example.note }}
        </li>
      </ul>
    </section>

    <section v-if="related.length">
      <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Related</h2>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <WireCard
          v-for="entry in related"
          :key="entry.id"
          :href="href('layouts', entry.id)"
          :name="entry.name"
          :summary="entry.summary"
          :spec="entry.spec"
        />
      </div>
    </section>
  </div>

  <div v-else class="mx-auto flex max-w-6xl flex-col gap-5">
    <header>
      <h1 class="text-2xl font-semibold tracking-tight">Layouts</h1>
      <p class="mt-1 max-w-2xl text-muted-foreground">
        Every archetype is one composition of navigation, panels, content, surface and density. Open one to see where it
        shines, where it fails and which of our products uses it.
      </p>
    </header>
    <ChoiceChips v-model="tag" label="Filter" :options="tagOptions" />
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <WireCard
        v-for="entry in visible"
        :key="entry.id"
        :href="href('layouts', entry.id)"
        :name="entry.name"
        :summary="entry.summary"
        :spec="entry.spec"
      />
    </div>
  </div>
</template>
