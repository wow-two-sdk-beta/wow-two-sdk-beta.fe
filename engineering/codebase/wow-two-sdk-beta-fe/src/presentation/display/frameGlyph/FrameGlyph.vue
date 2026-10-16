<script lang="ts">
/** Defines props for a frame glyph. */
export interface FrameGlyphProps {
  /** The outer frame's corner radius (`0` = square). */
  readonly frameRx: number;

  /** The pupil's roundness as a fraction of its size (`0` = square, `0.5` = circle). */
  readonly pupilRoundness: number;

  /** The dot-only mode — renders only the enlarged inner pupil instead of the full frame + pupil. */
  readonly isDot?: boolean;

  /** The glyph's pixel size. */
  readonly size?: number;
}
</script>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';

/**
 * Renders a nested-frame glyph — an outer frame plus inner pupil, or the enlarged pupil alone.
 *
 * `isDot` picks the pupil-only form. Reads as a scanner / viewfinder / QR-eye indicator.
 */
defineOptions({ name: 'FrameGlyph' });

/* `isDot` defaults to `undefined`, not `false`: Vue casts an absent `Boolean`
   prop to `false`, and React's original left it genuinely optional. */
/* `frameRx` / `pupilRoundness` stay declared-required — Vue still warns when one is
   missing — but the defaults keep `undefined` out of the `rx` attributes, which
   rendered as `rx="NaN"` and made the browser reject the `<rect>`. `0` = square for
   both, which is each prop's own documented zero. */
const props = withDefaults(defineProps<FrameGlyphProps>(), {
  frameRx: 0,
  pupilRoundness: 0,
  isDot: undefined,
  size: 20,
});

const el = useTemplateRef<SVGSVGElement>('el');

const pupilSize = computed(() => (props.isDot ? 12 : 8));
const pupilOffset = computed(() => (props.isDot ? 6 : 8));

defineExpose({ el });
</script>

<template>
  <svg ref="el" viewBox="0 0 24 24" :width="props.size" :height="props.size" aria-hidden="true">
    <rect
      v-if="!props.isDot"
      :x="2"
      :y="2"
      :width="20"
      :height="20"
      :rx="props.frameRx"
      fill="none"
      stroke="currentColor"
      :stroke-width="2.5"
    />
    <rect
      :x="pupilOffset"
      :y="pupilOffset"
      :width="pupilSize"
      :height="pupilSize"
      :rx="pupilSize * props.pupilRoundness"
      fill="currentColor"
    />
  </svg>
</template>
