<script lang="ts">
/** Represents the prop surface of `PageHeaderActions` — content only. */
export type PageHeaderActionsProps = Record<string, never>;
</script>

<script setup lang="ts">
import { usePageHeaderOutlet } from './PageHeaderOutlet';

/**
 * Places a page's primary actions in the app's `PageHeader`, wherever the page renders. Without a mounted header
 * the actions render in place.
 */
defineOptions({ name: 'PageHeaderActions' });

/** The actions — usually buttons. */
defineSlots<{ default(): unknown }>();

const outlet = usePageHeaderOutlet();
</script>

<template>
  <Teleport :to="outlet ?? 'body'" :disabled="!outlet"><slot /></Teleport>
</template>
