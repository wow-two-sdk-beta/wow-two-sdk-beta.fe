<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue';
import { Density } from '@wow-two-beta/ui-vue/foundation/styles';
import { ArrowRight } from 'lucide-vue-next';
import { findArchetype } from '../content/layouts';
import { Screens, findScreen } from '../content/screens';
import { OptionLabels } from '../content/model';
import { href, replaceQuery, route } from '../router';
import ChoiceChips from '../shell/ChoiceChips.vue';
import LayoutWire from '../wire/LayoutWire.vue';
import { ScreenViews } from '../screens/views';

/* The wireframes' real counterparts: each screen is an archetype built only from SDK components, so a layout
   decision can be checked against the parts that will actually ship. */

const screen = computed(() => findScreen(route.value.id) ?? Screens[0]!);
const archetype = computed(() => findArchetype(screen.value.archetype));
const view = computed(() => ScreenViews[screen.value.id]);

/* The SDK's `data-density` on the frame rescales every component inside it; the choice rides in the link. */
function readDensity(value: string | null): Density {
  return value === Density.Compact || value === Density.Spacious ? value : Density.Comfortable;
}
const density = shallowRef<Density>(readDensity(route.value.query.get('density')));

/*
 * Phone and tablet load the screen in an iframe at the device's width, so the screen meets a real viewport: its
 * media queries — and the SDK's, like AppShell's sidebar collapse — see 390 or 820 pixels, not the atlas window.
 */
const DeviceWidth = { tablet: 820, phone: 390 } as const;
/* The `border-8` bezel sits inside the box (border-box), so the frame grows by it to keep the viewport exact. */
const FrameBezel = 8;
type ScreenDevice = 'desktop' | keyof typeof DeviceWidth;
function readDevice(value: string | null): ScreenDevice {
  return value === 'tablet' || value === 'phone' ? value : 'desktop';
}
const device = shallowRef<ScreenDevice>(readDevice(route.value.query.get('device')));
const frameSource = computed(() =>
  href('frame', screen.value.id, density.value === Density.Comfortable ? undefined : { density: density.value }),
);

watch([density, device], ([nextDensity, nextDevice]) => {
  replaceQuery({
    ...(nextDensity === Density.Comfortable ? {} : { density: nextDensity }),
    ...(nextDevice === 'desktop' ? {} : { device: nextDevice }),
  });
});
</script>

<template>
  <div class="mx-auto flex max-w-7xl flex-col gap-5">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Screens</h1>
        <p class="mt-1 max-w-2xl text-muted-foreground">
          Archetypes built from real SDK components — the wireframe's promise, checked against the parts that ship. They
          follow the atlas theme and the light/dark switch.
        </p>
      </div>
    </header>

    <nav aria-label="Screens" class="flex flex-wrap gap-1">
      <a
        v-for="entry in Screens"
        :key="entry.id"
        :href="href('screens', entry.id)"
        :aria-current="entry.id === screen.id ? 'page' : undefined"
        class="rounded-md border px-3 py-1.5 text-sm transition-colors"
        :class="
          entry.id === screen.id
            ? 'border-transparent bg-primary text-primary-foreground'
            : 'border-border hover:bg-muted'
        "
      >
        {{ entry.name }}
      </a>
    </nav>

    <section class="grid gap-4 rounded-lg border border-border bg-card p-4 md:grid-cols-[200px_minmax(0,1fr)]">
      <a v-if="archetype" :href="href('layouts', archetype.id)" class="group flex flex-col gap-2">
        <LayoutWire :spec="archetype.spec" :label="`${archetype.name} wireframe`" />
        <span class="inline-flex items-center gap-1 text-xs text-primary group-hover:underline">
          {{ archetype.name }} wireframe <ArrowRight class="size-3" aria-hidden="true" />
        </span>
      </a>
      <div class="flex flex-col gap-2">
        <h2 class="text-lg font-semibold">{{ screen.name }}</h2>
        <p class="text-sm text-muted-foreground">{{ screen.summary }}</p>
        <p class="text-xs font-medium text-muted-foreground">Built with</p>
        <ul class="flex flex-wrap gap-1" aria-label="Components used">
          <li
            v-for="name in screen.components"
            :key="name"
            class="rounded-md border border-border bg-background px-2 py-0.5 font-mono text-xs"
          >
            {{ name }}
          </li>
        </ul>
      </div>
    </section>

    <div class="flex flex-wrap gap-6">
      <ChoiceChips
        label="Device"
        :options="OptionLabels.device"
        :model-value="device"
        @update:model-value="(value) => (device = readDevice(value))"
      />
      <ChoiceChips
        label="Density"
        :options="OptionLabels.density"
        :model-value="density"
        @update:model-value="(value) => (density = readDensity(value))"
      />
    </div>

    <div
      v-if="device === 'desktop'"
      class="h-[680px] overflow-hidden rounded-lg border border-border bg-background shadow-sm"
      :data-density="density"
    >
      <component :is="view" :key="screen.id" />
    </div>
    <div v-else class="flex justify-center overflow-x-auto rounded-lg bg-muted/40 p-4">
      <iframe
        :key="`${screen.id}-${device}`"
        :src="frameSource"
        :title="`${screen.name} at ${DeviceWidth[device]} pixels`"
        :style="{ width: `${DeviceWidth[device] + FrameBezel * 2}px`, height: `${720 + FrameBezel * 2}px` }"
        class="shrink-0 rounded-[1.75rem] border-8 border-foreground/80 bg-background shadow-lg"
      />
    </div>
  </div>
</template>
