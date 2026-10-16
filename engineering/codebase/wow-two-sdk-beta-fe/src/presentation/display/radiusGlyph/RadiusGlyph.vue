<script lang="ts">
/** Defines props for the radius glyph. */
export interface RadiusGlyphProps {
  /** The filled inner disc's radius as a fraction of the outer track (`0..1`). */
  readonly extent: number;

  /** The glyph's pixel size. */
  readonly size?: number;

  /** The stroke and fill color. */
  readonly color?: string;

  /** The outer track's stroke width. */
  readonly strokeWidth?: number;

  /** The outer track's opacity. */
  readonly trackOpacity?: number;
}
</script>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';

/** Renders a concentric-circle glyph whose filled inner disc scales with `extent` (`0..1`). */
defineOptions({ name: 'RadiusGlyph' });

const props = withDefaults(defineProps<RadiusGlyphProps>(), {
  /* `extent` stays declared-required — Vue still warns when it is missing — but a
     default keeps `undefined` out of `discRadius`, which rendered as `r="NaN"` and
     made the browser reject the `<circle>`. `0` is the low end of its own `0..1`. */
  extent: 0,
  size: 16,
  color: 'currentColor',
  strokeWidth: 1.5,
  trackOpacity: 0.4,
});

const el = useTemplateRef<SVGSVGElement>('el');

const discRadius = computed(() => Math.max(2, 10 * props.extent));

defineExpose({ el });
</script>

<template>
  <svg ref="el" viewBox="0 0 24 24" :width="props.size" :height="props.size" aria-hidden="true">
    <circle
      cx="12"
      cy="12"
      r="10"
      fill="none"
      :stroke="props.color"
      :stroke-width="props.strokeWidth"
      :opacity="props.trackOpacity"
    />
    <circle cx="12" cy="12" :r="discRadius" :fill="props.color" />
  </svg>
</template>
