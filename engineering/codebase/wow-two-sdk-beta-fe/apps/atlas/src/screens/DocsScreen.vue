<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue';
import { Callout } from '@wow-two-beta/ui-vue/presentation/feedback';
import { CodeText, KbdText } from '@wow-two-beta/ui-vue/presentation/display';
import { NavItem, TableOfContents } from '@wow-two-beta/ui-vue/presentation/nav';

/* Docs archetype: section navigation, an article held to a readable measure, and an on-this-page outline that
   follows the reader. The atlas routes by hash, so the outline scrolls in place instead of rewriting the URL. */

const Sections = ['Getting started', 'Theming', 'Forms', 'Overlays'] as const;
const current = shallowRef<(typeof Sections)[number]>('Theming');

const Outline = [
  { id: 'docs-tokens', label: 'Tokens', depth: 0 },
  { id: 'docs-tone-text', label: 'Tone text', depth: 1 },
  { id: 'docs-generate', label: 'Generate a theme', depth: 0 },
  { id: 'docs-apply', label: 'Apply at runtime', depth: 0 },
] as const;

const article = useTemplateRef<HTMLElement>('article');
</script>

<template>
  <div
    class="grid h-full min-h-0 grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)] xl:grid-cols-[180px_minmax(0,1fr)_180px]"
  >
    <nav aria-label="Documentation" class="hidden flex-col gap-0.5 border-r border-border p-2 md:flex">
      <NavItem v-for="section in Sections" :key="section" as-child :is-active="section === current">
        <button type="button" @click="current = section">{{ section }}</button>
      </NavItem>
    </nav>

    <article ref="article" class="min-h-0 overflow-auto px-6 py-5">
      <div class="mx-auto flex max-w-[65ch] flex-col gap-4 text-sm leading-relaxed">
        <h2 class="text-2xl font-semibold">{{ current }}</h2>
        <p class="text-muted-foreground">
          Every component reads its colors from semantic tokens, so one class on the root restyles the whole app.
        </p>

        <h3 id="docs-tokens" class="text-lg font-semibold">Tokens</h3>
        <p>
          Surfaces pair with a foreground: <CodeText>background</CodeText> with <CodeText>foreground</CodeText>,
          <CodeText>card</CodeText> with <CodeText>card-foreground</CodeText>. The validator holds every pair to WCAG AA
          in light and dark.
        </p>

        <h4 id="docs-tone-text" class="font-semibold">Tone text</h4>
        <Callout severity="warning" title="Use the soft foreground for text">
          A tone's solid fill is tuned to carry its own foreground, not to be read as text on a page.
        </Callout>

        <h3 id="docs-generate" class="text-lg font-semibold">Generate a theme</h3>
        <p>
          <CodeText>generateTheme</CodeText> expands an OKLCH seed — a hue, a neutral temperature and an accent rule —
          into both modes, nudging every foreground until it clears AA.
        </p>
        <p>Try it in the atlas studio; press <KbdText>Tab</KbdText> to walk the controls.</p>

        <h3 id="docs-apply" class="text-lg font-semibold">Apply at runtime</h3>
        <p>
          Inject <CodeText>themeToCss(theme)</CodeText> once, then put <CodeText>theme-{id}</CodeText> on the root and
          toggle <CodeText>dark</CodeText> for dark mode.
        </p>
        <div class="h-48" aria-hidden="true" />
      </div>
    </article>

    <aside class="hidden border-l border-border p-3 xl:block">
      <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">On this page</p>
      <TableOfContents :items="Outline" :source="article" :can-update-hash="false" />
    </aside>
  </div>
</template>
