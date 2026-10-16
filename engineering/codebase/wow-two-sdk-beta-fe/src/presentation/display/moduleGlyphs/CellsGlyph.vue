<script lang="ts">
import type { GlyphProps } from './ModuleGlyphs';

/** Defines props for the cells glyph. */
export interface CellsGlyphProps extends GlyphProps {
  /** The cells' corner radius. */
  readonly cornerRx: number;
}
</script>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { CellPositions, CellSize } from './ModuleGlyphs';

/** Renders a three-cell glyph with the given corner radius. */
defineOptions({ name: 'CellsGlyph' });

/* `cornerRx` stays declared-required — Vue still warns when it is missing — but a
   default keeps `undefined` out of the `rx` attribute, which rendered as
   `rx="NaN"` and made the browser reject the whole `<rect>`. `0` = square. */
const props = withDefaults(defineProps<CellsGlyphProps>(), { cornerRx: 0, size: 20 });

const el = useTemplateRef<SVGSVGElement>('el');

defineExpose({ el });
</script>

<template>
  <svg ref="el" viewBox="0 0 24 24" :width="props.size" :height="props.size" aria-hidden="true">
    <rect
      v-for="x in CellPositions"
      :key="x"
      :x="x"
      :y="9.5"
      :width="CellSize"
      :height="CellSize"
      :rx="props.cornerRx"
      fill="currentColor"
    />
  </svg>
</template>
