<script setup lang="ts">
import { computed, reactive } from 'vue';
import Demo from './Demo.vue';
import ExampleRenderer from './ExampleRenderer.vue';
import type { SmokeCase } from './fixtures/Example';
import { allComponentNames, uncoveredComponents } from './auto';

/** Completes the gallery with typed examples and the required family context. */
const props = defineProps<{
  namespace: Record<string, unknown>;
  covered: readonly string[];
  examples: readonly SmokeCase[];
  /**
   * Mounts each example only when asked. Overlay fixtures open on mount, and a page of open modals and sheets
   * covers every other demo; the browser smoke run (`?smoke=1`) still mounts them all.
   */
  isOnDemand?: boolean;
}>();

const isSmoke = new URLSearchParams(location.search).get('smoke') === '1';
const mounted = reactive(new Set<string>());

const rest = computed(() => {
  const examples = new Map(props.examples.map((example) => [example.name, example]));
  return uncoveredComponents(props.namespace, props.covered).map(({ name }) => {
    const example = examples.get(name);
    return {
      name,
      example: example?.skipMount || ['AudioPlayer', 'VideoPlayer', 'PdfViewer'].includes(name) ? undefined : example,
    };
  });
});
const total = computed(() => allComponentNames(props.namespace).length);

function isLive(name: string): boolean {
  return !props.isOnDemand || isSmoke || mounted.has(name);
}
</script>

<template>
  <div>
    <p class="mb-2 text-xs text-subtle-foreground">
      {{ rest.length }} of {{ total }} exported components use contextual examples below. Media requiring a real source
      stays in its curated example.
      <template v-if="isOnDemand && !isSmoke">Overlays mount on request, so they never cover the page.</template>
    </p>
    <div class="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-2">
      <Demo v-for="{ name, example } in rest" :key="name" :name="name">
        <template v-if="example">
          <ExampleRenderer v-if="isLive(name)" :example="example" />
          <button
            v-else
            type="button"
            class="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
            :data-render="name"
            @click="mounted.add(name)"
          >
            Render (opens on mount)
          </button>
        </template>
        <p v-else class="text-sm text-muted-foreground">Use the composed family example above.</p>
      </Demo>
    </div>
  </div>
</template>
