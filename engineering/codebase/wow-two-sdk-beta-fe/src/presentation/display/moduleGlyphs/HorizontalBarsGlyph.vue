<script lang="ts">
import type { GlyphProps } from './ModuleGlyphs';

export type { GlyphProps };
</script>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { BarCornerRx, CellPositions, CellSize } from './ModuleGlyphs';

/** Renders a three-horizontal-bar glyph. */
defineOptions({ name: 'HorizontalBarsGlyph' });

const props = withDefaults(defineProps<GlyphProps>(), { size: 20 });

const el = useTemplateRef<SVGSVGElement>('el');

defineExpose({ el });
</script>

<template>
  <svg ref="el" viewBox="0 0 24 24" :width="props.size" :height="props.size" aria-hidden="true">
    <rect
      v-for="y in CellPositions"
      :key="y"
      :x="4"
      :y="y"
      :width="16"
      :height="CellSize"
      :rx="BarCornerRx"
      fill="currentColor"
    />
  </svg>
</template>
