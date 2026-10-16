<script lang="ts">
/** Defines the props for {@link RouteAnnouncer}. */
export interface RouteAnnouncerProps {
  /** Whether the very first mount resets focus and announces the route too. Default `false`. */
  readonly canAnnounceInitial?: boolean;
  /** @deprecated Use `canAnnounceInitial` (inverted); this alias is removed next release. */
  readonly skipInitial?: boolean;
}

/** Moves keyboard and screen-reader focus to main content — the shell `<main>`, else any `<main>`, else `<h1>`. */
function focusMainContent(): void {
  const target =
    document.getElementById('app-shell-main') ??
    document.querySelector<HTMLElement>('main') ??
    document.querySelector<HTMLElement>('h1');
  if (!target) return;
  target.tabIndex = -1;
  target.focus({ preventScroll: true });
}
</script>

<script setup lang="ts">
import { nextTick, onMounted, onScopeDispose, shallowRef, watch } from 'vue';
import { useRoute } from 'vue-router';

import { deepestHandleValue, resolveHandleValue } from '../RouteHandles';

/**
 * Renders a polite, visually-hidden live region that announces the newly navigated page title and resets
 * focus to the main content; skips the first mount.
 *
 * Unlike the other root behaviors this stays a COMPONENT rather than becoming a router hook — it
 * owns a live region in the DOM, so it has to render.
 */
defineOptions({ name: 'RouteAnnouncer' });

const props = withDefaults(defineProps<RouteAnnouncerProps>(), {
  canAnnounceInitial: undefined,
  skipInitial: undefined,
});

const route = useRoute();
const message = shallowRef('');

// Keyed on `path` — not `fullPath` — so search/hash-only updates (a filter input syncing through
// `router.replace`) never yank focus back to main mid-interaction. React needed a ref to absorb
// StrictMode's double-invoked mount effect; a non-immediate watcher cannot double-fire.
let lastPath: string | null = null;
let generation = 0;
let disposed = false;
onScopeDispose(() => {
  disposed = true;
  generation += 1;
});

// `onMounted` never runs on the server, which is what this needs: it reads and focuses the DOM.
onMounted(() => {
  const announcesInitial = props.canAnnounceInitial ?? !(props.skipInitial ?? true);
  lastPath = announcesInitial ? null : route.path;
  if (announcesInitial) void announce(route.path);
});

watch(
  () => route.path,
  (path) => {
    if (lastPath === path) return;
    void announce(path);
  },
  { flush: 'post' },
);

async function announce(path: string): Promise<void> {
  const current = ++generation;
  lastPath = path;
  // Clear the live region so adjacent pages with the same title still announce once.
  message.value = '';
  await nextTick();
  if (disposed || current !== generation || route.path !== path) return;
  focusMainContent();
  message.value = deepestHandleValue(route, (handle) => resolveHandleValue(handle.title, route)) ?? document.title;
}
</script>

<template>
  <div aria-live="polite" aria-atomic="true" class="sr-only">{{ message }}</div>
</template>
