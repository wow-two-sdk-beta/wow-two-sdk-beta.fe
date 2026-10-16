<script lang="ts">
/* Deep import, not `from '../../actions'`: `ButtonSize` is declared in `Button.vue` and the
   `actions` barrel does not re-export it. The landed `OptionTilePicker.vue` reaches for it the same
   way. Re-exporting it from `actions/button/index.ts` would be the tidier fix, but that file
   belongs to another lane. */
import type { ButtonSize } from '../../actions/button/Button.vue';

/** Defines props for the emoji size control. */
export interface EmojiSizePickerProps {
  /** The emoji rendered inside each tile, so the choice previews the real glyph at that size. */
  readonly glyph: string;

  /** The current size ratio, controlled. The `v-model` binding target. */
  readonly modelValue?: number;

  /**
   * The preset-tile scale, forwarded to each `OptionTilePicker`. Default `sm`.
   *
   * An indexed access into an imported interface (`OptionTilePickerProps['size']`) is
   * opaque to the SFC compiler's type resolver — it fails the build while
   * `vue-tsc` stays green — so the named alias the tile itself uses is spelled
   * out instead.
   */
  readonly size?: ButtonSize;

  /**
   * Largest preview glyph, in px — caps each tile's glyph so it never clips the `OptionTilePicker` frame. Default
   * `24`.
   */
  readonly maxPreviewGlyph?: number;
}
</script>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed } from 'vue';
import { OptionTilePicker, OptionTileGroupField } from '..';
import { ControlGroupField } from '..';
import {
  CenterEmojiSize,
  CenterEmojiSizeDisplays,
  DefaultEmojiSize,
  DefaultMaxPreviewGlyph,
} from './EmojiSizePicker.variants';

/** Renders the emoji size as a tile set — each tile previews the given glyph at that preset size, no numbers. */
defineOptions({ name: 'EmojiSizePicker' });

const props = withDefaults(defineProps<EmojiSizePickerProps>(), {
  maxPreviewGlyph: DefaultMaxPreviewGlyph,
});

const emit = defineEmits<{
  /** Fires when the reader picks a size tile — the `v-model` half. */
  'update:modelValue': [ratio: number];
}>();

/* Controlled-only — the component owns no state, the host does. */
const currentRatio = computed(() => props.modelValue ?? DefaultEmojiSize);

const presets = computed(() =>
  Object.values(CenterEmojiSize).map((preset) => {
    const display = CenterEmojiSizeDisplays[preset];
    return {
      preset,
      label: `Size: ${display.label}`,
      ratio: display.ratio,
      glyphStyle: {
        fontSize: `${Math.min(display.glyph, props.maxPreviewGlyph)}px`,
        lineHeight: 1,
      },
      /* Float compare: the ratios are literals like 0.18/0.25/0.32, so an exact `===` against a
         value that round-tripped through a host would miss. */
      selected: Math.abs(currentRatio.value - display.ratio) < 0.001,
    };
  }),
);

function onSelect(ratio: number): void {
  emit('update:modelValue', ratio);
}

const formResetAnchor = useTemplateRef<HTMLInputElement>('formResetAnchor');
const formResetRevision = useNativeFormReset(formResetAnchor, () => {
  if (currentRatio.value !== DefaultEmojiSize) onSelect(DefaultEmojiSize);
});
</script>

<template>
  <ControlGroupField :key="formResetRevision" label="Size" orientation="vertical" :has-divider="false">
    <OptionTileGroupField label="Emoji size">
      <OptionTilePicker
        v-for="entry in presets"
        :key="entry.preset"
        :size="size"
        :selected="entry.selected"
        :label="entry.label"
        @select="() => onSelect(entry.ratio)"
      >
        <span class="flex h-full w-full items-center justify-center" :style="entry.glyphStyle">
          {{ glyph }}
        </span>
      </OptionTilePicker>
    </OptionTileGroupField>
    <input
      ref="formResetAnchor"
      type="hidden"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      aria-hidden="true"
    />
  </ControlGroupField>
</template>
