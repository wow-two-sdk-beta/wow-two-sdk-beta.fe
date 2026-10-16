<script setup lang="ts">
import { Check, X } from 'lucide-vue-next';

/** The "shines / avoid" pair every archetype and pattern carries. */
defineProps<{
  shines: ReadonlyArray<string>;
  avoid: ReadonlyArray<string>;
  isCompact?: boolean;
}>();
</script>

<template>
  <div class="grid gap-3" :class="isCompact ? 'grid-cols-1' : 'sm:grid-cols-2'">
    <div>
      <h4 class="mb-1 text-xs font-semibold uppercase tracking-wide text-success">Shines</h4>
      <ul class="space-y-1">
        <li v-for="item in shines" :key="item" class="flex gap-1.5 text-sm">
          <Check class="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true" />
          <span>{{ item }}</span>
        </li>
      </ul>
    </div>
    <div>
      <h4 class="mb-1 text-xs font-semibold uppercase tracking-wide text-destructive">Avoid when</h4>
      <ul class="space-y-1">
        <li v-for="item in avoid" :key="item" class="flex gap-1.5 text-sm">
          <X class="mt-0.5 size-3.5 shrink-0 text-destructive" aria-hidden="true" />
          <span>{{ item }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
