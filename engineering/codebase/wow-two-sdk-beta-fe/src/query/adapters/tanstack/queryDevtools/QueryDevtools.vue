<script lang="ts">
/** Defines the props for {@link QueryDevtools}. */
export interface QueryDevtoolsProps {
  /** Whether the panel starts open. Default `false`. */
  readonly initialIsOpen?: boolean;
}

/*
 * The devtools specifier, assembled at runtime.
 *
 * `@tanstack/vue-query-devtools` is NOT a dependency of this package — devtools are the app's
 * choice, and a library must not force one. A literal specifier would make the bundler resolve
 * (and therefore require) it at build time even inside a dead `import.meta.env.DEV` branch, so the
 * string is built here and the import stays opaque. The app installs the package to get the panel;
 * without it the component renders nothing and says nothing.
 */
const DevtoolsPackage = ['@tanstack', 'vue-query-devtools'].join('/');
</script>

<script setup lang="ts">
import { onMounted, shallowRef, type Component } from 'vue';

/** Renders the TanStack Query devtools in dev only, when the optional devtools package is installed. */
defineOptions({ name: 'QueryDevtools' });

const props = withDefaults(defineProps<QueryDevtoolsProps>(), { initialIsOpen: false });

const devtools = shallowRef<Component | null>(null);

// `onMounted` never runs on the server, and the import is dev-only — production tree-shakes the
// branch away because `import.meta.env.DEV` is statically false there.
onMounted(async () => {
  if (!import.meta.env.DEV) return;
  try {
    const module = (await import(/* @vite-ignore */ DevtoolsPackage)) as { VueQueryDevtools?: Component };
    devtools.value = module.VueQueryDevtools ?? null;
  } catch {
    // Devtools not installed — the normal case for an app that never opted in.
  }
});
</script>

<template>
  <component :is="devtools" v-if="devtools" :initial-is-open="props.initialIsOpen" />
</template>
