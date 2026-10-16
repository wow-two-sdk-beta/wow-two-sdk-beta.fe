<script lang="ts">
import type { EmojiCatalogEntry } from '../../../domain/emoji';
import { EmojiTileShape, type EmojiPickerSize } from './EmojiPicker.variants';

/** Maps each tile shape to its frame classes (border + corner); the selection + hover wash layers on top. */
const TileFrames: Record<EmojiTileShape, string> = {
  [EmojiTileShape.Rounded]: 'rounded-md border',
  [EmojiTileShape.Circle]: 'rounded-full border',
};

/** Defines props for a single selectable emoji tile. */
export interface EmojiTileProps {
  /** The catalog emoji this tile renders. */
  readonly entry: EmojiCatalogEntry;

  /** Whether this tile is the active selection. */
  readonly isSelected: boolean;

  /** The tile scale. */
  readonly size: EmojiPickerSize;

  /** The tile frame — rounded chip or circle. */
  readonly shape: EmojiTileShape;

  /** Whether this tile holds the grid's single roving tab stop. */
  readonly isActive: boolean;
}
</script>

<script setup lang="ts">
import { computed, type CSSProperties } from 'vue';
import { EmojiPickerSizes, EmojiTileShape as EmojiTileShapeValue } from './EmojiPicker.variants';

/** Renders one emoji tile as a listbox option — glyph sized by the picker scale, framed by the tile shape. */
defineOptions({ name: 'EmojiTile' });

const props = defineProps<EmojiTileProps>();

const emit = defineEmits<{
  /** Fires when the reader clicks or keys this tile, carrying its catalog entry. Replaces React's `onSelect`. */
  select: [entry: EmojiCatalogEntry];
}>();

const tokens = computed(() => EmojiPickerSizes[props.size]);
const isCircle = computed(() => props.shape === EmojiTileShapeValue.Circle);

const stateClass = computed(() =>
  props.isSelected ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-muted',
);

const tileClass = computed(
  () =>
    `flex items-center justify-center leading-none transition-colors ${TileFrames[props.shape]} ${stateClass.value} ${
      isCircle.value ? 'place-self-center' : ''
    }`,
);

/* A circle must read as round: pin it to a `tile`×`tile` square (so `rounded-full` is a circle,
   not a pill) and center it in its grid cell. A rounded chip stretches to fill the column, so
   only its height is fixed. */
const tileStyle = computed<CSSProperties>(() =>
  isCircle.value
    ? {
        height: `${tokens.value.tile}px`,
        width: `${tokens.value.tile}px`,
        fontSize: `${tokens.value.glyph}px`,
      }
    : { height: `${tokens.value.tile}px`, fontSize: `${tokens.value.glyph}px` },
);
</script>

<template>
  <button
    type="button"
    role="option"
    :title="entry.label"
    :aria-label="entry.label"
    :aria-selected="isSelected"
    :tabindex="isActive ? 0 : -1"
    :class="tileClass"
    :style="tileStyle"
    @click="emit('select', entry)"
  >
    {{ entry.glyph }}
  </button>
</template>
