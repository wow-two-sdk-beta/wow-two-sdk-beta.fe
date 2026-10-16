<script lang="ts">
import type { EmojiCatalogEntry } from '../../../domain/emoji';
import type { EmojiPickerSize, EmojiTileShape } from './EmojiPicker.variants';

/** Defines props for the emoji tile grid. */
export interface EmojiGridProps {
  /** The emoji to lay out, in order. */
  readonly emojis: ReadonlyArray<EmojiCatalogEntry>;

  /** The selected emoji's glyph, or `null`. */
  readonly selectedGlyph: string | null;

  /** The tile scale. */
  readonly size: EmojiPickerSize;

  /** The tile frame — rounded chip or circle. */
  readonly shape: EmojiTileShape;

  /** The muted hint shown when `emojis` is empty. */
  readonly emptyLabel?: string;

  /** The fixed viewport height, in tile rows; when set, the grid scrolls inside a constant-height box. */
  readonly viewportRows?: number;

  /** The scrollbar thumb color — any CSS color. Default `var(--color-border-strong)`. */
  readonly scrollThumbColor?: string;
}

/** Reads the grid's column count from the resolved `grid-template-columns` — the step for a vertical arrow move. */
function columnCount(grid: HTMLElement): number {
  const template = getComputedStyle(grid).gridTemplateColumns;
  return template ? template.split(' ').length : 1;
}

/* WebKit/Blink: slim scrollbar via the shadow-DOM pseudo-elements (not inline-styleable),
   expressed as Tailwind arbitrary variants — ~8px, transparent track, rounded thumb on the
   resolved color. */
const ScrollbarClass =
  '[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent ' +
  '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--emoji-scroll-thumb)]';
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, ref, useTemplateRef, watch, type CSSProperties } from 'vue';
import { Key } from '../../../foundation/dom';
import { EmojiEmptyLabels, EmojiPickerSizes } from './EmojiPicker.variants';
import EmojiTile from './EmojiTile.vue';

/** Renders emoji as an auto-filling `listbox`, or a muted hint when the visible set is empty. */
/* A single roving `tabindex` keeps the ~1870-tile grid to one tab stop; arrow keys (plus Home / End) move
   focus between options. */
defineOptions({ name: 'EmojiGrid' });

const props = defineProps<EmojiGridProps>();

const emit = defineEmits<{
  /** Fires when the reader activates a tile in the grid, carrying its entry. Replaces React's `onSelect`. */
  select: [entry: EmojiCatalogEntry];
}>();

const grid = useTemplateRef<HTMLDivElement>('grid');
const activeIndex = ref(0);

const tokens = computed(() => EmojiPickerSizes[props.size]);

/* Return the roving stop to the first tile whenever the visible set changes (category switch,
   search) — the tab stop moves back to tile 0 without stealing focus. */
watch(
  () => props.emojis,
  () => {
    activeIndex.value = 0;
  },
);

/* Clamp the roving stop for the transient render before the reset watcher runs, so no
   out-of-range tile is active. */
const activeStop = computed(() => Math.min(activeIndex.value, props.emojis.length - 1));

function moveFocus(event: KeyboardEvent): void {
  const node = grid.value;
  if (node === null || props.emojis.length === 0) return;

  const columns = columnCount(node);
  let next: number;
  switch (event.key) {
    case Key.ArrowRight:
      next = activeIndex.value + 1;
      break;
    case Key.ArrowLeft:
      next = activeIndex.value - 1;
      break;
    case Key.ArrowDown:
      next = activeIndex.value + columns;
      break;
    case Key.ArrowUp:
      next = activeIndex.value - columns;
      break;
    case Key.Home:
      next = 0;
      break;
    case Key.End:
      next = props.emojis.length - 1;
      break;
    default:
      return;
  }

  next = Math.max(0, Math.min(next, props.emojis.length - 1));
  event.preventDefault();
  if (next === activeIndex.value) return;

  activeIndex.value = next;
  node.querySelectorAll<HTMLElement>('[role="option"]')[next]?.focus();
}

/* Pointer focus (a click, a tap) and programmatic focus move the roving stop too, so the next arrow key starts
   from the tile the reader is on — not from the last tile the keyboard reached. */
function syncStop(event: FocusEvent): void {
  const options = grid.value?.querySelectorAll<HTMLElement>('[role="option"]');
  const index = options ? [...options].indexOf(event.target as HTMLElement) : -1;
  if (index >= 0) activeIndex.value = index;
}

const gridStyle = computed<CSSProperties>(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(${tokens.value.tile}px, 1fr))`,
  gap: `${tokens.value.gap}px`,
}));

/* Default to a slightly darker neutral than the hairline border so the bar reads clearly; any
   CSS color plugs in. Falls back to `--color-border` for themes that don't define the stronger
   token — never worse than the old bar. */
const thumbColor = computed(() => props.scrollThumbColor ?? 'var(--color-border-strong, var(--color-border))');

const viewportStyle = computed<CSSProperties>(() => ({
  height: `${(props.viewportRows ?? 0) * (tokens.value.tile + tokens.value.gap)}px`,
  overflowY: 'auto',
  scrollbarGutter: 'stable',
  /* Firefox: a slim bar with the resolved thumb color over a transparent track. */
  scrollbarWidth: 'thin',
  scrollbarColor: `${thumbColor.value} transparent`,
  /* Drives the WebKit thumb below — arbitrary-variant classes can't read a prop, so route it
     through a CSS var. */
  '--emoji-scroll-thumb': thumbColor.value,
}));

const locale = useLocale();
</script>

<template>
  <p v-if="emojis.length === 0" class="py-6 text-center text-xs text-muted-foreground">
    {{ emptyLabel ?? EmojiEmptyLabels.category }}
  </p>

  <!--
    Two branches rather than one always-present wrapper: React returned the bare grid when
    `viewportRows` is undefined, and an unconditional extra block would become a stray flex
    item in the picker's `StackLayout`.
  -->
  <div v-else-if="viewportRows !== undefined" :class="ScrollbarClass" :style="viewportStyle">
    <div
      ref="grid"
      role="listbox"
      :aria-label="locale.t('EmojiGrid.emoji', undefined, 'Emoji')"
      :style="gridStyle"
      @keydown="moveFocus"
      @focusin="syncStop"
    >
      <EmojiTile
        v-for="(entry, index) in emojis"
        :key="entry.glyph"
        :entry="entry"
        :is-selected="entry.glyph === selectedGlyph"
        :size="size"
        :shape="shape"
        :is-active="index === activeStop"
        @select="emit('select', $event)"
      />
    </div>
  </div>

  <div
    v-else
    ref="grid"
    role="listbox"
    :aria-label="locale.t('EmojiGrid.emoji', undefined, 'Emoji')"
    :style="gridStyle"
    @keydown="moveFocus"
    @focusin="syncStop"
  >
    <EmojiTile
      v-for="(entry, index) in emojis"
      :key="entry.glyph"
      :entry="entry"
      :is-selected="entry.glyph === selectedGlyph"
      :size="size"
      :shape="shape"
      :is-active="index === activeStop"
      @select="emit('select', $event)"
    />
  </div>
</template>
