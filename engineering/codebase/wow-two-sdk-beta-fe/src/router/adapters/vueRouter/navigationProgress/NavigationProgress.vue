<script lang="ts">
import { AriaAttribute } from '../../../../foundation/dom';
import type { NavigationProgressMode, NavigationProgressVariant } from '../../../NavigationProgressModes';

/**
 * Defines the props for {@link NavigationProgress}.
 *
 * `aria-label` is NOT declared: a hyphenated prop arrives as `props.ariaLabel` and stops being an
 * attribute, so it stays a fallthrough attr, read off `useAttrs()` and defaulted to `Loading`.
 */
export interface NavigationProgressProps {
  /** The visual form — a slim top bar (default) or a pulsing heartbeat. */
  readonly variant?: NavigationProgressVariant;

  /** The busy sources that toggle visibility — route (default), manual (backend), or both. */
  readonly mode?: NavigationProgressMode;
}

/** Attrs this component places by hand — everything else falls through untouched. */
const OwnedAttributes: ReadonlySet<string> = new Set(['class', AriaAttribute.Label]);
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { cn } from '../../../../foundation/styles';

// `NavigationProgressMode` / `NavigationProgressVariant` are already imported as TYPES by the plain
// `<script>` block above; the two blocks compile into ONE module, so the VALUES come in under local
// aliases rather than re-importing the same identifiers.
import {
  NavigationProgressMode as ModeToken,
  NavigationProgressVariant as VariantToken,
} from '../../../NavigationProgressModes';
import { useOptionalNavigationProgress } from '../../../hooks/UseNavigationProgress';
import { useRouteNavigating } from '../hooks/UseRouteNavigating';

/** Renders the navigation / backend-wait indicator — a slim bar or a pulsing heartbeat, shown only while busy. */
defineOptions({ name: 'NavigationProgress', inheritAttrs: false });

const props = withDefaults(defineProps<NavigationProgressProps>(), {
  variant: VariantToken.Bar,
  mode: ModeToken.Auto,
});

const attrs = useAttrs();

// `useRouteNavigating` covers lazy-chunk + async-guard waits (react-router's `useNavigation`); the
// optional injected state covers app data fetches. Neither requires the other to be present.
const routeBusy = useRouteNavigating();
const progress = useOptionalNavigationProgress();

const isHeartbeat = computed(() => props.variant === VariantToken.Heartbeat);

const isActive = computed(() => {
  const manualBusy = progress?.isBusy ?? false;
  if (props.mode === ModeToken.Manual) return manualBusy;
  if (props.mode === ModeToken.Both) return routeBusy.value || manualBusy;
  return routeBusy.value;
});

const ariaLabel = computed(() => (attrs[AriaAttribute.Label] as string | undefined) ?? 'Loading');

const classes = computed(() =>
  cn(
    isHeartbeat.value
      ? 'fixed right-4 top-4 z-toast inline-flex h-3 w-3 items-center justify-center'
      : 'fixed inset-x-0 top-0 z-toast h-0.5 overflow-hidden',
    attrs.class as string | undefined,
  ),
);

/** Everything this component does not place itself — `class` folds through `cn`, `aria-label` through its default. */
const rest = computed(() => Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))));
</script>

<template>
  <div
    v-if="isActive"
    role="progressbar"
    :aria-busy="true"
    :aria-label="ariaLabel"
    :data-variant="props.variant"
    v-bind="rest"
    :class="classes"
  >
    <template v-if="isHeartbeat">
      <!-- Ping ring conveys the beat; reduced-motion drops it, leaving the solid dot as a static cue. -->
      <span class="absolute inline-flex h-full w-full rounded-full bg-primary/60 animate-ping motion-reduce:hidden" />
      <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
    </template>
    <!-- Indeterminate slide; reduced-motion pins it full-width and static. -->
    <div v-else class="h-full w-1/3 bg-primary animate-indeterminate motion-reduce:w-full motion-reduce:animate-none" />
  </div>
</template>
