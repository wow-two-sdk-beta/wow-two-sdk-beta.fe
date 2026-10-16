<script lang="ts">
/** Defines props for the subtree error boundary. */
export interface ErrorBoundaryProps {
  /** Values that clear a caught error when any of them changes — a route id, a record id, a retry count. */
  readonly resetKeys?: ReadonlyArray<unknown>;

  /** The built-in fallback's heading. Default `"Something went wrong"`, localized. */
  readonly title?: string;

  /** The built-in fallback's retry button text. Default `"Try again"`, localized. */
  readonly retryLabel?: string;
}

/**
 * @internal The error-info tags Vue reports for a listener that threw — the development text and the
 * production reference code. A failed handler leaves the subtree rendered, as React boundaries do.
 */
const HandlerErrorInfo = [
  'native event handler',
  'component event handler',
  'https://vuejs.org/error-reference/#runtime-5',
  'https://vuejs.org/error-reference/#runtime-6',
] as const;

/** @internal Whether a captured error came from an event handler rather than rendering or a lifecycle. */
function isHandlerError(info: string): boolean {
  return (HandlerErrorInfo as ReadonlyArray<string>).includes(info);
}
</script>

<script setup lang="ts">
import { computed, onErrorCaptured, shallowRef, useAttrs, watch } from 'vue';
import { useLocaleDefaults } from '../../../foundation/i18n';
import { cn } from '../../../foundation/styles';

/**
 * Renders its subtree until a descendant throws while rendering, setting up, updating or running a
 * lifecycle hook or watcher, then renders a fallback with a retry that remounts the subtree.
 */
defineOptions({ name: 'ErrorBoundary', inheritAttrs: false });

defineSlots<{
  /** The guarded subtree. */
  default(): unknown;

  /** Replaces the built-in fallback; receives the caught error and the reset. */
  fallback?(props: { error: unknown; reset: () => void }): unknown;
}>();

const componentProps = withDefaults(defineProps<ErrorBoundaryProps>(), {
  resetKeys: () => [],
});
const props = useLocaleDefaults(componentProps, 'ErrorBoundary', {
  title: 'Something went wrong',
  retryLabel: 'Try again',
});

const emit = defineEmits<{
  /** Fires for every error a descendant throws, with Vue's error-info tag; handler errors keep the subtree. */
  error: [error: unknown, info: string];

  /** Fires when a caught error clears — the retry, or a `resetKeys` change. */
  reset: [];
}>();

const attrs = useAttrs();

/** The caught error, wrapped so a thrown `null` or `undefined` still counts as caught. */
const caught = shallowRef<{ readonly error: unknown } | null>(null);

const hasError = computed(() => caught.value !== null);

const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

/** The built-in fallback's classes, with the caller's `class` merged last. */
const fallbackClass = computed(() =>
  cn(
    'space-y-2 rounded-md border border-destructive/40 bg-destructive-soft p-3',
    'text-sm text-destructive-soft-foreground',
    attrs.class as string | undefined,
  ),
);

/** Clears a caught error when any reset key changes. */
watch(
  () => [...props.resetKeys],
  (next, previous) => {
    if (next.length === previous.length && next.every((value, index) => Object.is(value, previous[index]))) return;
    if (hasError.value) reset();
  },
);

/** Swaps rendering and lifecycle failures for the fallback; a handler failure only reports and propagates. */
onErrorCaptured((error, _instance, info) => {
  emit('error', error, info);
  if (isHandlerError(info)) return true;
  caught.value = { error };
  return false;
});

/** Clears the caught error, which remounts the subtree. */
function reset(): void {
  if (!hasError.value) return;
  caught.value = null;
  emit('reset');
}
</script>

<template>
  <slot v-if="!caught" />
  <slot v-else name="fallback" :error="caught.error" :reset="reset">
    <div role="alert" v-bind="rest" :class="fallbackClass">
      <p class="font-medium">{{ props.title }}</p>
      <button
        type="button"
        class="rounded-sm font-medium underline underline-offset-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        @click="reset"
      >
        {{ props.retryLabel }}
      </button>
    </div>
  </slot>
</template>
