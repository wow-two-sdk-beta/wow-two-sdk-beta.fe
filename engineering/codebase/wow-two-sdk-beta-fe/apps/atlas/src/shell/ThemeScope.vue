<script setup lang="ts">
import { previewClass } from '../theme';

/**
 * Scopes a subtree to one mode of a previewed theme without touching the atlas root.
 * Portaled UI escapes the scope to `<body>`, so preview content stays inline.
 */
defineProps<{
  /** The theme whose preview blocks `useThemePreviewCss` mounted. */
  themeId: string;
  /** Resolves the dark token set and turns on the `dark:` variant inside the scope. */
  isDark?: boolean;
}>();
</script>

<template>
  <div
    :class="[previewClass(themeId, Boolean(isDark)), isDark && 'dark', 'bg-background text-foreground']"
    :style="{ colorScheme: isDark ? 'dark' : 'light' }"
  >
    <slot />
  </div>
</template>
