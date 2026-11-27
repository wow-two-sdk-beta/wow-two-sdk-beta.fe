<script lang="ts">
import type { MapProvider } from './MapProvider';

/** Defines props for the row of map links that opens a place in Yandex Maps and Google Maps. */
export interface MapLinksProps {
  /** The place's text — a name or an address. Each map searches it, so no geocoding is needed. */
  readonly query?: string | null;

  /** The latitude in degrees. Counts only together with `lng`. */
  readonly lat?: number | null;

  /** The longitude in degrees. Counts only together with `lat`. */
  readonly lng?: number | null;

  /** The maps to link, in display order. Default both, Yandex first; an unknown or repeated provider is skipped. */
  readonly providers?: ReadonlyArray<MapProvider>;

  /** The pixel size of each mark. Default 16; the link around it adds `0.5rem` of hit area. */
  readonly size?: number;

  /** A BCP-47 tag for the map's interface language, such as `uz`; Google honors it, Yandex has no such parameter. */
  readonly locale?: string | null;

  /** The Yandex link's accessible name and tooltip. Without it the nearest locale provider answers, else English. */
  readonly yandexLabel?: string;

  /** The Google link's accessible name and tooltip. Without it the nearest locale provider answers, else English. */
  readonly googleLabel?: string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import type { ClassValue } from 'clsx';
import { useLocaleDefaults } from '../../foundation/i18n';
import { cn } from '../../foundation/styles';
import MapBrandMark from './MapBrandMark.vue';
import { isMapProvider, MapProviders } from './MapProvider';
import { mapSearchUrl } from './MapSearchUrl';

/**
 * Renders an inline row of icon-only links that open a place in Yandex Maps and Google Maps, such as right after an
 * event's location text.
 *
 * - Each link searches the place's `query` (or its coordinates) in that map, in a new tab with `rel="noopener
 *   noreferrer"`. It carries the map's brand mark, an accessible name and a tooltip.
 * - The marks are muted at rest (the text color, faded) and show full brand color on hover and focus; the focus ring is
 *   visible.
 * - Renders nothing when no URL can be built: no text and no valid coordinate pair, or no provider.
 * - The row sits above a stretched card link (`z-20`) and stops a click from bubbling, so it never opens the card.
 * - The names come from the nearest locale provider under `MapLinks.yandexLabel` and `MapLinks.googleLabel`.
 */
defineOptions({ name: 'MapLinks', inheritAttrs: false });

const componentProps = withDefaults(defineProps<MapLinksProps>(), {
  query: undefined,
  lat: undefined,
  lng: undefined,
  providers: () => MapProviders,
  size: 16,
  locale: undefined,
  yandexLabel: undefined,
  googleLabel: undefined,
});
const props = useLocaleDefaults(componentProps, 'MapLinks', {
  yandexLabel: 'Open in Yandex Maps',
  googleLabel: 'Open in Google Maps',
});

const attrs = useAttrs();

/* A row of inline links; `z-20` lifts it over a card's stretched link, the way a MediaCard's top controls sit. */
const RowClass = 'relative z-20 inline-flex items-center gap-0.5 align-middle';

/* The hit area is the mark plus `p-1` on each side: 24px at the default size. The ring shows on keyboard focus only. */
const LinkClass =
  'group/map-link inline-grid place-items-center rounded-sm p-1 text-inherit ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring';

/*
 * Two marks share one grid cell. At rest the monochrome one shows in the surrounding text color at `opacity-60`, so it
 * stays legible on a light page and on a dark card panel alike; on hover and keyboard focus the brand-colored one
 * replaces it, and under touch a press does (`group-active`). Fading opacity, not a gray filter, keeps the muted
 * state tied to the text color, never to a fixed gray.
 */
const RestMarkClass =
  'col-start-1 row-start-1 opacity-60 motion-safe:transition-opacity motion-safe:duration-150 ' +
  'group-hover/map-link:opacity-0 group-active/map-link:opacity-0 group-focus-visible/map-link:opacity-0';
const ColorMarkClass =
  'col-start-1 row-start-1 opacity-0 motion-safe:transition-opacity motion-safe:duration-150 ' +
  'group-hover/map-link:opacity-100 group-active/map-link:opacity-100 group-focus-visible/map-link:opacity-100';

const classes = computed(() => cn(RowClass, attrs.class as ClassValue));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

const markSize = computed(() => (Number.isFinite(props.size) && props.size > 0 ? props.size : 16));

/** The links to draw: known providers once each, in the caller's order, each with a URL and its name. */
const links = computed(() => {
  const names: Record<MapProvider, string> = { yandex: props.yandexLabel, google: props.googleLabel };
  const seen = new Set<MapProvider>();
  const result: Array<{ provider: MapProvider; href: string; label: string }> = [];
  for (const provider of props.providers) {
    if (!isMapProvider(provider) || seen.has(provider)) continue;
    seen.add(provider);
    const href = mapSearchUrl(provider, {
      query: props.query,
      lat: props.lat,
      lng: props.lng,
      locale: props.locale,
    });
    if (href !== undefined) result.push({ provider, href, label: names[provider] });
  }
  return result;
});
</script>

<template>
  <span v-if="links.length > 0" v-bind="rest" data-map-links :class="classes" @click.stop @auxclick.stop>
    <a
      v-for="link in links"
      :key="link.provider"
      :href="link.href"
      target="_blank"
      rel="noopener noreferrer"
      :aria-label="link.label"
      :title="link.label"
      :data-map-provider="link.provider"
      :class="LinkClass"
    >
      <MapBrandMark :provider="link.provider" :size="markSize" is-monochrome :class="RestMarkClass" />
      <MapBrandMark :provider="link.provider" :size="markSize" :class="ColorMarkClass" />
    </a>
  </span>
</template>
