<script lang="ts">
/** Defines the props for {@link AppErrorBoundary}. */
export interface AppErrorBoundaryProps {
  /** The path the "back to start" link points at. Default `/`. */
  readonly homePath?: string;

  /** Whether to clear the caught error on the next successful navigation. Default `true`. */
  readonly canResetOnNavigate?: boolean;
  /** @deprecated Use `canResetOnNavigate`; this alias is removed next release. */
  readonly resetOnNavigate?: boolean;
}

/** Reads a numeric `status` off a thrown value (an `ApiError`, a `{ status }` throw). */
function readStatus(error: unknown): number | undefined {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === 'number' ? status : undefined;
}

/** Reads the display message off a thrown value, falling back to the house copy. */
function readMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong.';
}
</script>

<script setup lang="ts">
import { computed, onErrorCaptured, onScopeDispose, shallowRef, watch, type Component } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';

import { toHandle } from '../RouteHandles';

/**
 * Renders the app-level route error boundary — surfaces a thrown route error with a way back.
 *
 * react-router owned this through `errorElement` + `useRouteError`; Vue has no built-in boundary
 * component, so this is the two Vue seams combined: `onErrorCaptured` for render / lifecycle /
 * watcher failures in the subtree, and `router.onError` for navigation failures the subtree never
 * sees — a lazy chunk that will not load being the case that matters.
 *
 * A route's own `errorComponent` (from its `AppRoute`) wins over the built-in fallback, which is how
 * per-route `errorElement` survives without a root layout route to hang it on.
 */
defineOptions({ name: 'AppErrorBoundary' });

defineSlots<{
  /** The guarded subtree — normally `<RouterView />`. */
  default(): unknown;

  /** Replaces the built-in fallback; receives the caught error and a reset callback. */
  fallback?(props: { error: unknown; reset: () => void }): unknown;
}>();

const props = withDefaults(defineProps<AppErrorBoundaryProps>(), {
  homePath: '/',
  canResetOnNavigate: undefined,
  resetOnNavigate: undefined,
});

const route = useRoute();
const router = useRouter();

const error = shallowRef<unknown>(null);

onErrorCaptured((caught) => {
  error.value = caught;
  return false; // handled here — do not propagate to the app-level error handler
});

// A failed navigation (above all a lazy chunk that will not load) never reaches `onErrorCaptured`:
// vue-router rejects it and reports through `onError`. The handler is router-global and outlives the
// component, so it is torn down with the scope.
onScopeDispose(
  router.onError((caught) => {
    error.value = caught;
  }),
);

const reset = (): void => {
  error.value = null;
};

// A recovered navigation clears the boundary, so a retry link works without a reload.
watch(
  () => route.fullPath,
  () => {
    if (props.canResetOnNavigate ?? props.resetOnNavigate ?? true) reset();
  },
);

const status = computed(() => readStatus(error.value));
const message = computed(() => readMessage(error.value));

/** The deepest matched route's own error component, when it declared one. */
const routeErrorComponent = computed<Component | undefined>(() => {
  for (let index = route.matched.length - 1; index >= 0; index -= 1) {
    const component = toHandle(route.matched[index]?.meta)?.errorComponent;
    if (component) return component as Component;
  }
  return undefined;
});
</script>

<template>
  <slot v-if="error === null" />
  <slot v-else-if="$slots.fallback" name="fallback" :error="error" :reset="reset" />
  <component :is="routeErrorComponent" v-else-if="routeErrorComponent" :error="error" :reset="reset" />
  <div v-else class="flex min-h-svh flex-col items-center justify-center gap-3 bg-background p-8 text-center">
    <p v-if="status !== undefined" class="font-mono text-sm text-muted-foreground">{{ status }}</p>
    <h1 class="text-lg font-semibold text-foreground">Something went wrong</h1>
    <p class="max-w-md text-sm text-muted-foreground">{{ message }}</p>
    <RouterLink :to="props.homePath" class="mt-2 text-sm font-medium text-primary hover:underline">
      Back to start
    </RouterLink>
  </div>
</template>
