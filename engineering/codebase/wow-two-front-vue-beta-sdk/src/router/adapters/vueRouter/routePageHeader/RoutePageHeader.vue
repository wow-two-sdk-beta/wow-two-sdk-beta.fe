<script lang="ts">
import type { PageHeaderProps } from '../../../../presentation/layout/pageHeader';

/** Represents the prop surface of `RoutePageHeader` — `PageHeader`'s, with route fallbacks for the copy. */
export type RoutePageHeaderProps = PageHeaderProps;
</script>

<script setup lang="ts">
import { computed, useAttrs, useSlots } from 'vue';
import { useRoute } from 'vue-router';

import { PageHeader } from '../../../../presentation/layout/pageHeader';
import { deepestHandleValue, resolveHandleValue } from '../RouteHandles';

/**
 * Renders a `PageHeader` whose title and description follow the current route: the deepest matched `handle.title`,
 * and `handle.description` (else the route's meta description). A prop or slot overrides either.
 */
defineOptions({ name: 'RoutePageHeader', inheritAttrs: false });

defineSlots<{
  /** The rich override for the title. */
  title?(): unknown;
  /** The rich override for the description. */
  description?(): unknown;
  /** The header's own actions, before any a page contributes through `PageHeaderActions`. */
  actions?(): unknown;
}>();

const props = withDefaults(defineProps<RoutePageHeaderProps>(), {
  title: undefined,
  description: undefined,
  level: 1,
  size: 'xl',
});

const attrs = useAttrs();
const slots = useSlots();
const route = useRoute();

const title = computed(() => props.title ?? deepestHandleValue(route, (h) => resolveHandleValue(h.title, route)));

const description = computed(
  () =>
    props.description ??
    deepestHandleValue(
      route,
      (h) => resolveHandleValue(h.description, route) ?? resolveHandleValue(h.meta, route)?.description,
    ),
);
</script>

<template>
  <PageHeader v-bind="attrs" :title="title" :description="description" :level="props.level" :size="props.size">
    <template v-if="slots.title" #title><slot name="title" /></template>
    <template v-if="slots.description" #description><slot name="description" /></template>
    <template v-if="slots.actions" #actions><slot name="actions" /></template>
  </PageHeader>
</template>
