<script setup lang="ts">
import { computed } from 'vue';
import { Density } from '@wow-two-beta/ui-vue/foundation/styles';
import { Screens, findScreen } from '../content/screens';
import { route } from '../router';
import { ScreenViews } from '../screens/views';

/* One screen, bare and full-size — the document the device preview loads in an iframe, so the screen meets a real
   phone or tablet viewport: media queries, `useMediaQuery` and touch layouts all see the frame's width. */

const screen = computed(() => findScreen(route.value.id) ?? Screens[0]!);
const view = computed(() => ScreenViews[screen.value.id]);
const density = computed(() => {
  const value = route.value.query.get('density');
  return value === Density.Compact || value === Density.Spacious ? value : Density.Comfortable;
});
</script>

<template>
  <div class="h-svh overflow-hidden bg-background text-foreground" :data-density="density">
    <component :is="view" :key="screen.id" />
  </div>
</template>
