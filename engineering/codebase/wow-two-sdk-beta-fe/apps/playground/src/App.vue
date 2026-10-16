<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue';
import { useGroupNavigation } from './navigation';
import { isDark, themeId, themes } from './theme';
import { diagnostics } from './diagnostics';

/* One group at a time. A single page holding every component is slow to
   scroll, slow to re-render on a theme switch, and impossible to screenshot
   usefully — the whole point of the gallery is looking at it. */
const GROUPS = [
  { key: 'layout', label: 'layout', view: defineAsyncComponent(() => import('./groups/LayoutGroup.vue')) },
  { key: 'actions', label: 'actions', view: defineAsyncComponent(() => import('./groups/ActionsGroup.vue')) },
  { key: 'forms', label: 'forms', view: defineAsyncComponent(() => import('./groups/FormsGroup.vue')) },
  { key: 'display', label: 'display', view: defineAsyncComponent(() => import('./groups/DisplayGroup.vue')) },
  { key: 'feedback', label: 'feedback', view: defineAsyncComponent(() => import('./groups/FeedbackGroup.vue')) },
  { key: 'nav', label: 'nav', view: defineAsyncComponent(() => import('./groups/NavGroup.vue')) },
  { key: 'overlays', label: 'overlays', view: defineAsyncComponent(() => import('./groups/OverlaysGroup.vue')) },
] as const;

const { active, hrefFor, navigate } = useGroupNavigation(
  GROUPS.map((group) => group.key),
  'layout',
);
const showDiagnostics = ref(false);

const activeView = computed(() => GROUPS.find((g) => g.key === active.value)?.view ?? GROUPS[0].view);

const errorCount = computed(() => diagnostics.filter((d) => d.kind === 'error').length);
const warnCount = computed(() => diagnostics.filter((d) => d.kind === 'warn').length);
</script>

<template>
  <div class="min-h-svh bg-background text-foreground">
    <header
      class="sticky top-0 z-50 flex flex-wrap items-center gap-3 border-b border-border bg-background/95 px-4 py-2 backdrop-blur"
    >
      <span class="font-mono text-sm font-semibold">@wow-two-beta/ui-vue</span>

      <nav class="flex flex-wrap gap-1">
        <a
          v-for="g in GROUPS"
          :key="g.key"
          :href="hrefFor(g.key)"
          @click="navigate($event, g.key)"
          :aria-current="active === g.key ? 'page' : undefined"
          class="rounded-md px-2 py-1 font-mono text-xs transition-colors"
          :class="active === g.key ? 'bg-primary text-primary-foreground' : 'text-subtle-foreground hover:bg-muted'"
          :data-group="g.key"
        >
          {{ g.label }}
        </a>
      </nav>

      <div class="ml-auto flex items-center gap-2">
        <a
          href="http://localhost:5178/"
          class="rounded-md border border-border px-2 py-1 text-xs text-subtle-foreground hover:bg-muted"
          title="Layouts, patterns and themes — the atlas app (pnpm --filter atlas dev)"
        >
          atlas ↗
        </a>
        <button
          type="button"
          class="rounded-md border border-border px-2 py-1 text-xs"
          :class="errorCount ? 'border-destructive text-destructive' : 'text-subtle-foreground'"
          data-testid="diagnostics-toggle"
          @click="showDiagnostics = !showDiagnostics"
        >
          {{ errorCount }} err / {{ warnCount }} warn
        </button>

        <select
          aria-label="Theme"
          v-model="themeId"
          class="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground"
          data-testid="theme-select"
        >
          <option v-for="t in themes" :key="t.id" :value="t.id">{{ t.name }} — {{ t.id }} ({{ t.status }})</option>
        </select>

        <button
          type="button"
          class="rounded-md border border-border px-2 py-1 text-xs"
          data-testid="dark-toggle"
          @click="isDark = !isDark"
        >
          {{ isDark ? 'dark' : 'light' }}
        </button>
      </div>
    </header>

    <div v-if="showDiagnostics" class="max-h-[50svh] overflow-auto border-b border-border bg-card px-4 py-3">
      <p v-if="!diagnostics.length" class="text-xs text-subtle-foreground">No Vue warnings or errors captured.</p>
      <ul v-else class="space-y-1">
        <li
          v-for="(d, i) in diagnostics"
          :key="i"
          class="font-mono text-[11px]"
          :class="d.kind === 'error' ? 'text-destructive' : 'text-warning'"
        >
          <span class="font-semibold">[{{ d.kind }}×{{ d.count }}]</span>
          <span class="text-foreground">{{ d.component }}</span>
          — {{ d.message }}
        </li>
      </ul>
    </div>

    <main class="px-4 py-4">
      <component :is="activeView" />
    </main>
  </div>
</template>
