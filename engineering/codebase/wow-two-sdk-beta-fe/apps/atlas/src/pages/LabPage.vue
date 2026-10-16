<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Link, RotateCcw } from 'lucide-vue-next';
import { Archetypes, findArchetype } from '../content/layouts';
import { OptionLabels, type Device, type LayoutSpec } from '../content/model';
import { SpecKeys, SpecOptions, specFromQuery, specToQuery } from '../content/specQuery';
import { href, replaceQuery, route } from '../router';
import ChoiceChips from '../shell/ChoiceChips.vue';
import LayoutWire from '../wire/LayoutWire.vue';
import ExportBlock from '../shell/ExportBlock.vue';
import { scaffold } from '../content/scaffold';

const Labels: Readonly<Record<(typeof SpecKeys)[number], string>> = {
  nav: 'Navigation',
  local: 'Local strip',
  leading: 'Leading panel',
  trailing: 'Trailing panel',
  panelMode: 'Panel mode',
  content: 'Content',
  surface: 'Surface',
  density: 'Density',
};

const starting = findArchetype(route.value.query.get('from')) ?? findArchetype('canvas-islands')!;
const spec = ref<LayoutSpec>(specFromQuery(route.value.query, starting.spec));
const device = ref<Device>((route.value.query.get('device') as Device | null) ?? 'desktop');
const preset = ref(route.value.query.get('from') ?? '');

function valueOf(key: (typeof SpecKeys)[number]): string {
  return String(spec.value[key] ?? 'none');
}

function setValue(key: (typeof SpecKeys)[number], value: string): void {
  const next = (key === 'leading' || key === 'trailing') && value === 'none' ? null : value;
  spec.value = { ...spec.value, [key]: next };
  preset.value = '';
}

function applyPreset(id: string): void {
  const archetype = findArchetype(id);
  if (!archetype) return;
  spec.value = archetype.spec;
  preset.value = id;
}

function reset(): void {
  applyPreset(starting.id);
}

watch([spec, device, preset], () => {
  replaceQuery({ ...specToQuery(spec.value, device.value), ...(preset.value ? { from: preset.value } : {}) });
});

/** The archetypes closest to the composition, by how many axes match. */
const nearest = computed(() =>
  Archetypes.map((archetype) => ({
    archetype,
    score: SpecKeys.filter((key) => archetype.spec[key] === spec.value[key]).length,
  }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3),
);

/** The composition as starter code — regenerated on every change. */
const starter = computed(() => scaffold(spec.value));

const copied = ref(false);
async function copyLink(): Promise<void> {
  try {
    await navigator.clipboard.writeText(location.href);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch {
    copied.value = false;
  }
}

const frameWidth = computed(() =>
  device.value === 'desktop'
    ? 'w-full'
    : device.value === 'tablet'
      ? 'mx-auto w-[min(100%,440px)]'
      : 'mx-auto w-[min(100%,280px)]',
);
</script>

<template>
  <div class="mx-auto grid max-w-[1400px] gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
    <aside class="flex flex-col gap-4 lg:sticky lg:top-20 lg:max-h-[calc(100svh-6rem)] lg:overflow-y-auto lg:pr-2">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Lab</h1>
        <p class="mt-1 text-sm text-muted-foreground">Compose a layout. The link always holds the composition.</p>
      </div>
      <label class="flex flex-col gap-1.5">
        <span class="text-xs font-medium text-muted-foreground">Start from an archetype</span>
        <select
          :value="preset"
          class="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          @change="applyPreset(($event.target as HTMLSelectElement).value)"
        >
          <option value="">Custom composition</option>
          <option v-for="archetype in Archetypes" :key="archetype.id" :value="archetype.id">
            {{ archetype.name }}
          </option>
        </select>
      </label>
      <ChoiceChips v-model="device" label="Device" :options="OptionLabels.device" />
      <ChoiceChips
        v-for="key in SpecKeys"
        :key="key"
        :label="Labels[key]"
        :options="SpecOptions[key]"
        :model-value="valueOf(key)"
        @update:model-value="setValue(key, $event)"
      />
      <label class="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          :checked="spec.bottomDock ?? false"
          class="size-4 accent-[var(--color-primary)]"
          @change="spec = { ...spec, bottomDock: ($event.target as HTMLInputElement).checked }"
        />
        Floating tool island along the bottom
      </label>
      <div class="flex gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
          @click="reset"
        >
          <RotateCcw class="size-4" aria-hidden="true" /> Reset
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
          @click="copyLink"
        >
          <Link class="size-4" aria-hidden="true" /> {{ copied ? 'Copied' : 'Copy link' }}
        </button>
      </div>
    </aside>

    <section class="flex flex-col gap-4">
      <div :class="frameWidth">
        <LayoutWire :spec="spec" :device="device" label="Lab composition" />
      </div>
      <div>
        <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Closest archetypes</h2>
        <ul class="grid gap-2 sm:grid-cols-3">
          <li v-for="{ archetype, score } in nearest" :key="archetype.id">
            <a
              :href="href('layouts', archetype.id)"
              class="block rounded-lg border border-border bg-card p-3 hover:border-primary/60"
            >
              <p class="text-sm font-semibold">{{ archetype.name }}</p>
              <p class="text-xs text-muted-foreground">{{ score }} of {{ SpecKeys.length }} axes match</p>
            </a>
          </li>
        </ul>
      </div>
      <div>
        <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Starter code</h2>
        <p class="mb-2 text-sm text-muted-foreground">
          This composition as a single-file component built from the SDK — named regions, placeholder data.
        </p>
        <ExportBlock label="Starter SFC" :text="starter" />
      </div>
    </section>
  </div>
</template>
