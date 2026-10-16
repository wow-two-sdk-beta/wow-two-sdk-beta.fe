<script lang="ts">
import type { RouteLocationRaw } from 'vue-router';

import type { LazyRoute } from '../RouteConfig';

/**
 * Defines the props for {@link AppNavLink}.
 *
 * `aria-current` is NOT declared — a hyphenated prop would arrive as `props.ariaCurrent` and stop
 * being an attribute. `NavItem` sets `aria-current="page"` off the resolved active state instead.
 */
export interface AppNavLinkProps {
  /** The destination — a path, or a full `RouteLocationRaw` (named route, params, query). */
  readonly to: RouteLocationRaw;

  /** Whether to match the destination exactly (no descendant paths) for the active state. */
  readonly isExact?: boolean;
  /** @deprecated Use `isExact`; this alias is removed next release. */
  readonly end?: boolean;

  /** Whether to replace the current history entry instead of pushing. */
  readonly replace?: boolean;

  /** Whether to animate this navigation with the View Transitions API. */
  readonly viewTransition?: boolean;

  /** The destination's lazy module — warmed on hover / focus (intent prefetch). */
  readonly prefetch?: LazyRoute;
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { RouterLink, useLink } from 'vue-router';

import { NavItem } from '../../../../presentation/nav';

import { prefetchProps } from '../hooks/UsePrefetch';

/** Renders a nav row — `NavItem` chrome (`as-child`) forwarding to a `<RouterLink>`, active from the route match. */
defineOptions({ name: 'AppNavLink', inheritAttrs: false });

defineSlots<{
  /** The link label — React's `children`. */
  default(): unknown;

  /** The leading icon. React's `icon` prop. */
  icon?(): unknown;

  /** The trailing slot — typically a count badge or status dot. */
  trailing?(): unknown;
}>();

/*
 * `isExact` / `end` / `replace` / `viewTransition` default to `undefined`, not `false`: an optional boolean prop
 * with no default is cast to `false`, which would pin `replace` off and forbid a consumer's own
 * fallthrough from ever reading as absent.
 */
const props = withDefaults(defineProps<AppNavLinkProps>(), {
  isExact: undefined,
  end: undefined,
  replace: undefined,
  viewTransition: undefined,
  prefetch: undefined,
});

const attrs = useAttrs();

// react-router resolved the active state with `useMatch({ path, end })`; `useLink` is the vue-router
// counterpart and hands back both flags off one resolved location. `isExact` picks the exact one — the
// same `end ?? false` default react-router had, since `isActive` already covers descendants.
const link = useLink({
  to: computed(() => props.to),
  replace: computed(() => props.replace),
});

const isActive = computed(() => ((props.isExact ?? props.end) ? link.isExactActive.value : link.isActive.value));

const intent = computed(() => (props.prefetch ? prefetchProps(props.prefetch) : undefined));
</script>

<template>
  <NavItem as-child :is-active="isActive" v-bind="attrs">
    <template v-if="$slots.icon" #icon><slot name="icon" /></template>
    <RouterLink :to="props.to" :replace="props.replace" :view-transition="props.viewTransition" v-bind="intent">
      <slot />
    </RouterLink>
    <template v-if="$slots.trailing" #trailing><slot name="trailing" /></template>
  </NavItem>
</template>
