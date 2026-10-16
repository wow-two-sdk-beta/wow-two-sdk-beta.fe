<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue';
import { generateTheme, themeToCss, type ThemeSeed } from '@wow-two-beta/ui-vue/foundation/themes';
import { Button, CopyButton } from '@wow-two-beta/ui-vue/presentation/actions';
import {
  Badge,
  TabsGroup,
  TabsGroupList,
  TabsGroupPanel,
  TabsGroupTab,
} from '@wow-two-beta/ui-vue/presentation/display';
import { SliderInput, TextInput } from '@wow-two-beta/ui-vue/presentation/forms';
import {
  DefaultSeed,
  GeneratedThemeId,
  SeedOptions,
  StarterSeeds,
  exportSeed,
  normalizeSeedHue,
  seedFromQuery,
  seedSnippet,
  seedToQuery,
  starterSeed,
  themeJson,
} from '../content/seedQuery';
import { replaceQuery, route } from '../router';
import { applyGeneratedSeed, generatedSeed, isDark, themeId, useThemePreviewCss } from '../theme';
import ChoiceChips from '../shell/ChoiceChips.vue';
import ContrastPanel from '../shell/ContrastPanel.vue';
import ExportBlock from '../shell/ExportBlock.vue';
import PreviewBoard from '../shell/PreviewBoard.vue';
import ThemeScope from '../shell/ThemeScope.vue';

/* The theme studio: an OKLCH seed drives `generateTheme` live. The seed lives in the URL, so a studio theme is a
   link; "Apply to atlas" makes it the atlas theme; the export tabs ship it as code, CSS or token JSON. */

const initial = starterSeed(route.value.query.get('from')) ?? DefaultSeed;
const seed = shallowRef<ThemeSeed>(seedFromQuery(route.value.query, initial));
const starter = shallowRef(route.value.query.get('from') ?? '');
const previewMode = shallowRef<'light' | 'dark'>(isDark.value ? 'dark' : 'light');

const theme = computed(() => generateTheme(seed.value));
const shipped = computed(() => generateTheme(exportSeed(seed.value)));
useThemePreviewCss(theme);

const css = computed(() => themeToCss(shipped.value));
const json = computed(() => themeJson(shipped.value));
const snippet = computed(() => seedSnippet(seed.value));
/** True while the atlas already wears exactly this seed. */
const isApplied = computed(
  () =>
    themeId.value === GeneratedThemeId &&
    generatedSeed.value !== null &&
    JSON.stringify(seedToQuery(generatedSeed.value)) === JSON.stringify(seedToQuery(seed.value)),
);

watch([seed, starter], () => {
  replaceQuery({ ...seedToQuery(seed.value), ...(starter.value ? { from: starter.value } : {}) });
});

function update(patch: Partial<ThemeSeed>): void {
  seed.value = { ...seed.value, ...patch };
  starter.value = '';
}

function setHue(value: string | number): void {
  const hue = normalizeSeedHue(Number(value));
  if (hue !== null) update({ primaryHue: hue });
}

function startFrom(id: string): void {
  const next = starterSeed(id);
  if (!next) return;
  seed.value = { ...next, name: seed.value.name === DefaultSeed.name ? next.name : seed.value.name };
  starter.value = id;
}

function reset(): void {
  seed.value = DefaultSeed;
  starter.value = '';
}

const shareLink = computed(() => (typeof location === 'undefined' ? '' : location.href));

const HueTrack =
  'linear-gradient(to right, oklch(0.7 0.16 0), oklch(0.7 0.16 60), oklch(0.7 0.16 120), oklch(0.7 0.16 180), oklch(0.7 0.16 240), oklch(0.7 0.16 300), oklch(0.7 0.16 360))';
const Swatches = ['background', 'card', 'muted', 'border', 'primary', 'primary-soft', 'accent', 'ring'] as const;
const modeOptions = { light: 'Light', dark: 'Dark' };
</script>

<template>
  <div class="mx-auto flex max-w-7xl flex-col gap-5">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Studio</h1>
        <p class="mt-1 max-w-2xl text-muted-foreground">
          Tune an OKLCH seed and <code class="text-sm">generateTheme</code> rebuilds an AA-checked theme on every
          change. The link is the theme: share it, apply it to the atlas, or export it.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <CopyButton :text="shareLink" aria-label="Copy studio link" variant="soft" size="sm">
          <template #default="{ copied }">{{ copied ? 'Link copied' : 'Copy link' }}</template>
        </CopyButton>
        <Button size="sm" variant="outline" @click="reset">Reset</Button>
        <Button size="sm" :is-disabled="isApplied" @click="applyGeneratedSeed(seed)">
          {{ isApplied ? 'Applied to atlas' : 'Apply to atlas' }}
        </Button>
      </div>
    </header>

    <div class="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside class="flex flex-col gap-4">
        <section class="flex flex-col gap-4 rounded-lg border border-border bg-card p-4" aria-label="Seed">
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-muted-foreground">Start from</span>
            <select
              :value="starter"
              class="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              @change="startFrom(($event.target as HTMLSelectElement).value)"
            >
              <option value="" disabled>A curated seed…</option>
              <option v-for="entry in StarterSeeds" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
            </select>
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-medium text-muted-foreground">Name</span>
            <TextInput
              :model-value="seed.name"
              maxlength="40"
              @update:model-value="(value: string) => update({ name: value || DefaultSeed.name })"
            />
          </label>
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span id="studio-hue-label">Primary hue</span>
              <span class="font-mono tabular-nums text-foreground">{{ seed.primaryHue }}°</span>
            </div>
            <SliderInput
              :model-value="seed.primaryHue"
              min="0"
              max="359"
              aria-labelledby="studio-hue-label"
              @update:model-value="setHue"
            />
            <div class="h-2 rounded-full" :style="{ background: HueTrack }" aria-hidden="true" />
          </div>
          <ChoiceChips
            label="Neutral temperature"
            :options="SeedOptions.neutralTemp"
            :model-value="seed.neutralTemp ?? 'neutral'"
            @update:model-value="(value) => update({ neutralTemp: value as ThemeSeed['neutralTemp'] })"
          />
          <ChoiceChips
            label="Accent"
            :options="SeedOptions.accentMode"
            :model-value="seed.accentMode ?? 'complementary'"
            @update:model-value="(value) => update({ accentMode: value as ThemeSeed['accentMode'] })"
          />
          <ChoiceChips
            label="Surface"
            :options="SeedOptions.surface"
            :model-value="seed.surface ?? 'crisp'"
            @update:model-value="(value) => update({ surface: value as ThemeSeed['surface'] })"
          />
          <ChoiceChips
            label="Radius"
            :options="SeedOptions.radius"
            :model-value="seed.radius ?? 'md'"
            @update:model-value="(value) => update({ radius: value as ThemeSeed['radius'] })"
          />
        </section>

        <section class="rounded-lg border border-border bg-card p-4" aria-label="Contrast">
          <div class="mb-3 flex items-center justify-between gap-2">
            <h2 class="text-sm font-semibold">Contrast</h2>
            <Badge :variant="theme.meta.contrastAA ? 'success' : 'danger'" size="sm">
              {{ theme.meta.contrastAA ? 'AA in both modes' : `${theme.meta.failures?.length ?? 0} failing` }}
            </Badge>
          </div>
          <ContrastPanel :theme="theme" />
        </section>
      </aside>

      <div class="flex min-w-0 flex-col gap-4">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <ChoiceChips
            label="Preview"
            :options="modeOptions"
            :model-value="previewMode"
            @update:model-value="(value) => (previewMode = value === 'dark' ? 'dark' : 'light')"
          />
          <div class="flex overflow-hidden rounded-md border border-border" aria-label="Key tokens">
            <span
              v-for="token in Swatches"
              :key="token"
              class="size-7"
              :style="{ background: theme[previewMode][token] }"
              :title="`${token}: ${theme[previewMode][token]}`"
            />
          </div>
        </div>
        <ThemeScope
          :theme-id="GeneratedThemeId"
          :is-dark="previewMode === 'dark'"
          class="rounded-lg border border-border p-4"
        >
          <PreviewBoard />
        </ThemeScope>

        <TabsGroup default-value="code">
          <TabsGroupList>
            <TabsGroupTab value="code">Use in code</TabsGroupTab>
            <TabsGroupTab value="css">CSS</TabsGroupTab>
            <TabsGroupTab value="json">Token JSON</TabsGroupTab>
          </TabsGroupList>
          <TabsGroupPanel value="code" class="pt-3">
            <ExportBlock label="Runtime module" :text="snippet" />
          </TabsGroupPanel>
          <TabsGroupPanel value="css" class="pt-3">
            <ExportBlock :label="`.theme-${shipped.id} stylesheet`" :text="css" />
          </TabsGroupPanel>
          <TabsGroupPanel value="json" class="pt-3">
            <ExportBlock label="Light and dark tokens" :text="json" />
          </TabsGroupPanel>
        </TabsGroup>
      </div>
    </div>
  </div>
</template>
