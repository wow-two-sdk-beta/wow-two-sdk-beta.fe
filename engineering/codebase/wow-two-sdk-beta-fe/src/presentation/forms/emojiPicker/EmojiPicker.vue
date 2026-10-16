<script lang="ts">
import type { EmojiCatalogEntry } from '../../../domain/emoji';
import type { StorageBroker } from '../../../foundation/storage';
import type { CategoryNavVariant, EmojiPickerSizeInput, EmojiTileShape } from './EmojiPicker.variants';

/** Defines props for the emoji picker. */
export interface EmojiPickerProps {
  /** The current emoji catalog entry, or `null` for none. The `v-model` binding target. */
  readonly modelValue?: EmojiCatalogEntry | null;

  /**
   * The persistence contract backing the "recently used" list — required, so the picker stays pure and
   * storage-agnostic. Plug `localStorageStorageBroker` for browser persistence, `memoryStorageBroker()` for a
   * throwaway in-memory store, or a custom `StorageBroker` (Redux, IndexedDB, …).
   */
  readonly storage: StorageBroker;

  /** The category-navigation affordance. Default `strip`. */
  readonly categoryNavVariant?: CategoryNavVariant;

  /** The element scale — one value for every element, or a per-element `{ search, nav, tile }`. Default `md`. */
  readonly size?: EmojiPickerSizeInput;

  /** The emoji-tile frame — rounded chip or circle. Default `rounded`. */
  readonly tileShape?: EmojiTileShape;

  /** The scrollable tile viewport's height, in tile rows. Default `6`. */
  readonly rowsCount?: number;

  /** The heading rendered above the picker. Default `Emoji`. */
  readonly label?: string;

  /** With recents still empty, opens on the first real category instead of the recents bucket. Default `false`. */
  readonly showFirstCategoryWhenRecentsEmpty?: boolean;

  /** The scrollbar thumb color for the tile viewport — any CSS color. Default `var(--color-border-strong)`. */
  readonly scrollThumbColor?: string;
}
</script>

<script setup lang="ts">
import { useLocaleDefaults, useLocale } from '../../../foundation/i18n';
import { useTemplateRef } from 'vue';
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed } from 'vue';
import { ColorTone, SizePreset } from '../../../foundation/styles';
import { Button, ButtonVariant } from '../../actions';
import { StackLayout } from '../../layout';
import SearchInput from '../searchInput/SearchInput.vue';

import CategoryNav from './CategoryNav.vue';
import EmojiGrid from './EmojiGrid.vue';
import { useEmojiPicker } from './UseEmojiPicker';
import {
  CategoryNavVariant as CategoryNavVariantValue,
  DefaultPickerSize,
  EmojiEmptyLabels,
  EmojiTileShape as EmojiTileShapeValue,
  PickerElement,
  RecentCategory,
  resolveElementSize,
} from './EmojiPicker.variants';

/** Renders a searchable emoji catalog with a recents bucket and a swappable category nav over the bundled set. */
/* Fully controlled: `value = null` means no emoji, and the picked `EmojiCatalogEntry` (or `null`) leaves via
   `@update:modelValue` / `v-model` — consumers read whatever field they need (`entry.glyph`, `entry.label`, …).
   Recents are read through the injected `storage` broker. Size is a separate concern — compose
   `EmojiSizePicker` (passing `entry.glyph`) when a host needs a per-emoji scale. */
defineOptions({ name: 'EmojiPicker' });

const inputProps = withDefaults(defineProps<EmojiPickerProps>(), {
  categoryNavVariant: CategoryNavVariantValue.Strip,
  tileShape: EmojiTileShapeValue.Rounded,
  rowsCount: 6,

  showFirstCategoryWhenRecentsEmpty: false,
});
const props = useLocaleDefaults(inputProps, 'EmojiPicker', { label: 'Emoji' });

const emit = defineEmits<{
  /** Fires when the reader picks an emoji or clears the selection — the `v-model` half. */
  'update:modelValue': [entry: EmojiCatalogEntry | null];
}>();

const currentValue = computed(() => props.modelValue ?? null);

function onChange(entry: EmojiCatalogEntry | null): void {
  emit('update:modelValue', entry);
}

const picker = useEmojiPicker({
  value: () => currentValue.value,
  onChange,
  storage: props.storage,
  showFirstCategoryWhenRecentsEmpty: () => props.showFirstCategoryWhenRecentsEmpty,
});

const searchSize = computed(() => resolveElementSize(props.size, PickerElement.Search, DefaultPickerSize));
const navSize = computed(() => resolveElementSize(props.size, PickerElement.Nav, DefaultPickerSize));
const tileSize = computed(() => resolveElementSize(props.size, PickerElement.Tile, DefaultPickerSize));
/* The strip icon is a single dimension → px straight off the size object (undefined for a
   uniform scale → CategoryNav's nav-derived default). */
const iconSize = computed(() => (typeof props.size === 'object' ? props.size.icon : undefined));

const selectedGlyph = computed(() => picker.selected.value?.glyph ?? null);
const isNoneSelected = computed(() => currentValue.value === null);

const emptyLabel = computed(() => {
  if (picker.showSearch.value) return EmojiEmptyLabels.search;
  return picker.activeCategory.value === RecentCategory ? EmojiEmptyLabels.recents : EmojiEmptyLabels.category;
});

const formResetAnchor = useTemplateRef<HTMLInputElement>('formResetAnchor');
const formResetRevision = useNativeFormReset(formResetAnchor, () => {
  if (currentValue.value !== null) onChange(null);
});

const locale = useLocale();
</script>

<template>
  <StackLayout :key="formResetRevision" gap="3">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium">{{ props.label }}</span>
      <Button
        :variant="isNoneSelected ? undefined : ButtonVariant.Outline"
        :tone="isNoneSelected ? ColorTone.Primary : ColorTone.Neutral"
        :size="SizePreset.Sm"
        :aria-pressed="isNoneSelected"
        @click="picker.clearSelection()"
      >
        {{ locale.t('EmojiPicker.none', undefined, 'None') }}
      </Button>
    </div>

    <SearchInput
      :size="searchSize"
      :placeholder="locale.t('EmojiPicker.searchEmoji', undefined, 'Search emoji…')"
      :model-value="picker.searchKeyword.value"
      @update:model-value="picker.searchKeyword.value = $event"
      @clear="picker.searchKeyword.value = ''"
    />

    <StackLayout gap="2">
      <CategoryNav
        v-if="!picker.showSearch.value"
        :variant="categoryNavVariant"
        :active="picker.activeCategory.value"
        :size="navSize"
        :icon-size="iconSize"
        @select="picker.activeCategory.value = $event"
      />
      <EmojiGrid
        :emojis="picker.visibleEmojis.value"
        :selected-glyph="selectedGlyph"
        :size="tileSize"
        :shape="tileShape"
        :viewport-rows="rowsCount"
        :scroll-thumb-color="scrollThumbColor"
        :empty-label="emptyLabel"
        @select="picker.selectEmoji($event)"
      />
    </StackLayout>
    <input
      ref="formResetAnchor"
      type="hidden"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      aria-hidden="true"
    />
  </StackLayout>
</template>
