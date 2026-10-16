<script lang="ts">
export interface PortalProps {
  /** The container to render into. Default: `document.body`. */
  readonly container?: HTMLElement | null;

  /** The optional named layer — sets `data-portal-name` on the wrapper. */
  readonly name?: string;
}
</script>

<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue';

/**
 * Renders the slot into a different DOM node (default `document.body`).
 * SSR-inert — renders nothing on the server, teleports in after mount on the client.
 *
 * React's `createPortal` becomes `<Teleport>`; the mount gate is kept because
 * `document.body` cannot be resolved during SSR, and because a `to` target that
 * does not exist yet makes Teleport warn and drop its content.
 */
defineOptions({ name: 'Portal' });

const props = defineProps<PortalProps>();

defineSlots<{
  /** The content teleported into the target container. */
  default(): unknown;
}>();

const isMounted = shallowRef(false);
onMounted(() => {
  isMounted.value = true;
});

const target = computed<HTMLElement | null>(() => (isMounted.value ? (props.container ?? document.body) : null));
</script>

<template>
  <Teleport v-if="target" :to="target">
    <div :data-portal-name="name"><slot /></div>
  </Teleport>
</template>
