<script setup lang="ts">
import type { LayoutSpec } from '../content/model';
import LayoutWire from '../wire/LayoutWire.vue';

/** A linked thumbnail: the wireframe, a name and one line of summary. */
defineProps<{
  href: string;
  name: string;
  summary: string;
  spec: LayoutSpec;
}>();
</script>

<template>
  <a
    :href="href"
    class="group flex flex-col gap-2 rounded-lg border border-border bg-card p-2 transition-colors hover:border-primary/60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
  >
    <LayoutWire :spec="spec" :label="`${name} wireframe`" />
    <div class="px-1 pb-1">
      <p class="text-sm font-semibold text-foreground group-hover:text-primary">{{ name }}</p>
      <p class="line-clamp-2 text-xs text-muted-foreground">{{ summary }}</p>
    </div>
  </a>
</template>
