<script lang="ts">
import type { CommandErrorHandler, CommandRegistry } from '../CommandRegistry';

/** Props for `CommandsProvider`. */
export interface CommandsProviderProps {
  /** An existing registry to share (module-scope singleton, a test's registry). Omitted → the provider owns one. */
  readonly registry?: CommandRegistry;

  /** Where a failing command's error goes. Ignored when `registry` is supplied — it carries its own handler. */
  readonly onError?: CommandErrorHandler;
}
</script>

<script setup lang="ts">
import { provideCommands } from './CommandsContext';

/**
 * Renders no element of its own — the slot passes straight through — while providing a command registry to every
 * descendant, the mount point for `useCommands` / `useRegisterCommands`.
 *
 * A component that already owns a registry can call `provideCommands` directly instead of wrapping its subtree
 * in this.
 */
defineOptions({ name: 'CommandsProvider' });

const props = defineProps<CommandsProviderProps>();

defineSlots<{
  /** The subtree that reads the provided command registry. */
  default(): unknown;
}>();

provideCommands(
  () => props.registry,
  () => props.onError,
);
</script>

<template>
  <slot />
</template>
