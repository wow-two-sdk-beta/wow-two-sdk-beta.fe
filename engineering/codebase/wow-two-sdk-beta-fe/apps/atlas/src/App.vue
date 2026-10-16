<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import { Moon, Sun } from 'lucide-vue-next';
import { Sections, href, route } from './router';
import { GeneratedThemeId } from './content/seedQuery';
import { generatedSeed, isDark, themeId, themes } from './theme';

/* Pages load on demand; the components page pulls every fixture, so it only loads when opened. */
const Pages = {
  home: defineAsyncComponent(() => import('./pages/HomePage.vue')),
  layouts: defineAsyncComponent(() => import('./pages/LayoutsPage.vue')),
  patterns: defineAsyncComponent(() => import('./pages/PatternsPage.vue')),
  guides: defineAsyncComponent(() => import('./pages/GuidesPage.vue')),
  lab: defineAsyncComponent(() => import('./pages/LabPage.vue')),
  screens: defineAsyncComponent(() => import('./pages/ScreensPage.vue')),
  components: defineAsyncComponent(() => import('./pages/ComponentsPage.vue')),
  themes: defineAsyncComponent(() => import('./pages/ThemesPage.vue')),
  studio: defineAsyncComponent(() => import('./pages/StudioPage.vue')),
  frame: defineAsyncComponent(() => import('./pages/FramePage.vue')),
} as const;

const page = computed(() => Pages[route.value.section]);
const pageKey = computed(() => `${route.value.section}/${route.value.id ?? ''}`);
</script>

<template>
  <!-- A device frame's document: the screen alone, no atlas chrome. -->
  <component :is="page" v-if="route.section === 'frame'" :key="pageKey" />
  <div v-else class="surface-ambient min-h-svh bg-background text-foreground">
    <header
      class="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70"
    >
      <div class="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4">
        <a :href="href('home')" class="flex items-center gap-2 font-semibold">
          <span class="grid size-7 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground"
            >UI</span
          >
          <span class="hidden sm:inline">Atlas</span>
        </a>
        <nav aria-label="Atlas sections" class="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
          <a
            v-for="section in Sections.slice(1)"
            :key="section.key"
            :href="href(section.key)"
            :aria-current="route.section === section.key ? 'page' : undefined"
            class="shrink-0 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors"
            :class="
              route.section === section.key
                ? 'bg-primary-soft text-primary-soft-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            "
          >
            {{ section.label }}
          </a>
        </nav>
        <select
          v-model="themeId"
          aria-label="Theme"
          class="hidden max-w-44 rounded-md border border-border bg-background px-2 py-1.5 text-xs md:block"
        >
          <option v-if="generatedSeed" :value="GeneratedThemeId">Studio · {{ generatedSeed.name }}</option>
          <option v-for="theme in themes" :key="theme.id" :value="theme.id">{{ theme.name }}</option>
        </select>
        <button
          type="button"
          class="grid size-8 place-items-center rounded-md border border-border hover:bg-muted"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="isDark = !isDark"
        >
          <Sun v-if="isDark" class="size-4" aria-hidden="true" />
          <Moon v-else class="size-4" aria-hidden="true" />
        </button>
      </div>
    </header>
    <main class="px-4 py-6">
      <component :is="page" :key="pageKey" />
    </main>
  </div>
</template>
