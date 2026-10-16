<script lang="ts">
import type { NavigationProgressState } from './hooks/UseNavigationProgress';

/** Defines the props for {@link ProgressProvider}. */
export interface ProgressProviderProps {
  /** An externally created state to provide (from `createNavigationProgress()`); a fresh one when omitted. */
  readonly state?: NavigationProgressState;
}
</script>

<script setup lang="ts">
// `NavigationProgressState` is already imported by the plain `<script>` block above — the two
// blocks compile into ONE module, so importing it again here is a duplicate identifier.
import { createNavigationProgress, provideNavigationProgress } from './hooks/UseNavigationProgress';

/**
 * Renders no element of its own — the slot passes straight through — while providing the
 * navigation-progress state to that subtree, ref-counting the manual busy spans that
 * `<NavigationProgress mode="manual">` (and `QueryProgressBridge`) drive.
 */
defineOptions({ name: 'ProgressProvider' });

defineSlots<{
  /** The subtree that can drive and observe the shared manual busy state. */
  default(): unknown;
}>();

const props = withDefaults(defineProps<ProgressProviderProps>(), { state: undefined });

const local = createNavigationProgress();
const current = (): NavigationProgressState => props.state ?? local;

provideNavigationProgress({
  get isBusy() {
    return current().isBusy;
  },
  begin: () => current().begin(),
  end: () => current().end(),
  track: <T,>(promise: Promise<T>): Promise<T> => current().track(promise),
});
</script>

<template>
  <slot />
</template>
