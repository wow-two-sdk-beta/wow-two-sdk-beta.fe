<script lang="ts">
import type { AnchorHTMLAttributes } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

import type { LazyRoute } from '../RouteConfig';

/** @internal The native anchor attributes `AppLinkProps` accepts — everything but the resolved `href`. */
type AppLinkAttributes = Omit<AnchorHTMLAttributes, 'href'>;

/** Defines the props for {@link AppLink}. */
export interface AppLinkProps extends /* @vue-ignore */ AppLinkAttributes {
  /** The destination — a path, or a full `RouteLocationRaw` (named route, params, query). */
  readonly to: RouteLocationRaw;

  /** Whether only the exact destination, not its descendant paths, marks the link active. */
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
import { computed } from 'vue';
import { RouterLink, useLink } from 'vue-router';

import { prefetchProps } from '../hooks/UsePrefetch';

/**
 * Renders a plain in-app link — a `<RouterLink>` anchor with no chrome of its own, marked `data-active` while its
 * route matches and warming its page on intent. Use it for text links and `Button as-child` targets; `AppNavLink`
 * stays the navigation row.
 */
defineOptions({ name: 'AppLink' });

const props = withDefaults(defineProps<AppLinkProps>(), {
  isExact: undefined,
  end: undefined,
  replace: undefined,
  viewTransition: undefined,
  prefetch: undefined,
});

defineSlots<{
  /** The link's content. */
  default(): unknown;
}>();

const link = useLink({
  to: computed(() => props.to),
  replace: computed(() => props.replace),
});

const isActive = computed(() => ((props.isExact ?? props.end) ? link.isExactActive.value : link.isActive.value));

const intent = computed(() => (props.prefetch ? prefetchProps(props.prefetch) : undefined));
</script>

<template>
  <RouterLink
    :to="props.to"
    :replace="props.replace"
    :view-transition="props.viewTransition"
    :data-active="isActive ? '' : undefined"
    v-bind="intent"
  >
    <slot />
  </RouterLink>
</template>
