<script lang="ts">
/** Defines the props for {@link NotFound}. */
export interface NotFoundProps {
  /** The path the "back to start" link points at. Default `/`. */
  readonly homePath?: string;
}
</script>

<script setup lang="ts">
import { RouterLink } from 'vue-router';

/** Renders the `*` catch-all page — any unknown path resolves here. */
defineOptions({ name: 'NotFound' });

const props = withDefaults(defineProps<NotFoundProps>(), { homePath: '/' });
</script>

<template>
  <div class="flex min-h-svh flex-col items-center justify-center gap-3 bg-background p-8 text-center">
    <p class="font-mono text-sm text-muted-foreground">404</p>
    <h1 class="text-lg font-semibold text-foreground">Page not found</h1>
    <p class="max-w-md text-sm text-muted-foreground">That page doesn't exist or has moved.</p>
    <RouterLink :to="props.homePath" class="mt-2 text-sm font-medium text-primary hover:underline">
      Back to start
    </RouterLink>
  </div>
</template>
