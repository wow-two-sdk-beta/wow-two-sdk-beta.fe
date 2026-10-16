<script lang="ts">
export interface ScrollLockProviderProps {
  readonly isEnabled?: boolean;
}
</script>

<script setup lang="ts">
import { useScrollLock } from '../../dom/hooks/UseScrollLock';

/**
 * Renders nothing of its own: the slot is returned as-is, so this component is
 * transparent to layout (React returned a bare fragment for the same reason).
 *
 * A component wrapper around `useScrollLock` — handy when scroll lock should
 * follow a child's mount lifecycle (e.g. inside a Modal's teleport).
 * Multiple wrappers stack; lock releases when the count reaches zero.
 */
defineOptions({ name: 'ScrollLockProvider' });

const props = withDefaults(defineProps<ScrollLockProviderProps>(), { isEnabled: true });

defineSlots<{
  /** The content whose mount lifetime holds the scroll lock. */
  default(): unknown;
}>();

// Passed as a getter so the lock follows the prop, matching the React effect's
// `[enabled]` dependency.
useScrollLock(() => props.isEnabled);
</script>

<template>
  <slot />
</template>
