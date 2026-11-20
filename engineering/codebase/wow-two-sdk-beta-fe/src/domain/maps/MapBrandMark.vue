<script lang="ts">
import type { MapProvider } from './MapProvider';

/** Defines props for the mark of a web map's brand. */
export interface MapBrandMarkProps {
  /** The map whose mark to draw: `yandex` or `google`. */
  readonly provider: MapProvider;

  /** The pixel size of the square mark. Default 16. */
  readonly size?: number;

  /** Paints the mark with `currentColor` instead of the brand's own colors. Default `false`. */
  readonly isMonochrome?: boolean;

  /** The accessible name. Without it the mark is decorative (`aria-hidden`). */
  readonly label?: string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../foundation/styles';
import { MapBrandMarkData } from './MapBrandMarkData';

/**
 * Draws the mark of a web map — the Yandex Maps pin or the Google Maps pin — as inline SVG, so a link can name the map
 * it opens without a network request.
 *
 * - Full color by default; `isMonochrome` paints with `currentColor`, so the mark follows the surrounding text color.
 * - A provider the SDK has no mark for draws nothing.
 * - Without `label` the mark is decorative (`aria-hidden`); with it, `role="img"` and `aria-label`.
 */
defineOptions({ name: 'MapBrandMark', inheritAttrs: false });

const props = withDefaults(defineProps<MapBrandMarkProps>(), { size: 16, isMonochrome: false, label: undefined });
const attrs = useAttrs();
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

/** The drawn art, or `undefined` for a provider the SDK has no mark for — nothing is drawn, never a broken box. */
const art = computed(() => {
  if (!Object.hasOwn(MapBrandMarkData, props.provider)) return undefined;
  const entry = MapBrandMarkData[props.provider];
  return props.isMonochrome ? entry.mono : entry.color;
});

const isNamed = computed(() => props.label !== undefined && props.label !== '');
</script>

<template>
  <svg
    v-if="art !== undefined"
    v-bind="rest"
    :class="cn('inline-block shrink-0', attrs.class as ClassValue)"
    :width="size"
    :height="size"
    :viewBox="art.viewBox"
    :data-map-provider="provider"
    :data-variant="isMonochrome ? 'mono' : 'color'"
    :role="isNamed ? 'img' : undefined"
    :aria-label="isNamed ? label : undefined"
    :aria-hidden="isNamed ? undefined : 'true'"
    focusable="false"
  >
    <path v-for="shape in art.shapes" :key="shape.d" :d="shape.d" :fill="shape.fill" :fill-rule="shape.fillRule" />
  </svg>
</template>
