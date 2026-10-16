<script lang="ts">
/**
 * The prop surface of `ScrollSpy`.
 *
 * React declared `extends UseScrollSpyOptions`; that interface carries
 * `MaybeRefOrGetter` fields here (the house composable contract), which a prop
 * cannot hold, so the plain-value mirror is spelled out instead.
 */
export interface ScrollSpyProps {
  readonly ids: ReadonlyArray<string>;
  readonly rootMargin?: string;
  readonly threshold?: number | ReadonlyArray<number>;
  /** Element to observe within. Defaults to viewport. */
  readonly root?: Element | Document | null;
}
</script>

<script setup lang="ts">
import { watch } from 'vue';
import { useScrollSpy } from './UseScrollSpy';

/**
 * Renders nothing by default — hands the topmost in-view section's id to its default slot.
 * The scoped-slot variant of `useScrollSpy`; the id also leaves through `active-change`.
 */
defineOptions({ name: 'ScrollSpy' });

defineSlots<{
  /** React's render-prop `children` — receives the currently-active section id. */
  default?(props: { activeId: string | null }): unknown;
}>();

const props = defineProps<ScrollSpyProps>();

const emit = defineEmits<{
  /** Fires when a different section becomes the topmost in view; fires once on mount as well. */
  'active-change': [id: string | null];
}>();

const activeId = useScrollSpy(() => props.ids, {
  rootMargin: () => props.rootMargin,
  threshold: () => props.threshold,
  root: () => props.root,
});

watch(activeId, (id) => emit('active-change', id), { immediate: true, flush: 'post' });
</script>

<template>
  <slot v-bind="{ activeId }" />
</template>
