<script lang="ts">
import type { GlyphProps } from './ModuleGlyphs';

export type { GlyphProps };
</script>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { BarCornerRx, CellPositions, CellSize } from './ModuleGlyphs';

/** Renders a three-vertical-bar glyph. */
defineOptions({ name: 'VerticalBarsGlyph' });

const props = withDefaults(defineProps<GlyphProps>(), { size: 20 });

const el = useTemplateRef<SVGSVGElement>('el');

defineExpose({ el });
</script>

<template>
  <svg ref="el" viewBox="0 0 24 24" :width="props.size" :height="props.size" aria-hidden="true">
    <rect
      v-for="x in CellPositions"
      :key="x"
      :x="x"
      :y="4"
      :width="CellSize"
      :height="16"
      :rx="BarCornerRx"
      fill="currentColor"
    />
  </svg>
</template>
