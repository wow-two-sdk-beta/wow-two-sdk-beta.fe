<script lang="ts">
import type { CategoryKey, CategoryNavVariant, EmojiPickerSize } from './EmojiPicker.variants';

/** Defines props for the horizontal category nav. */
export interface CategoryNavProps {
  /** The category-nav layout — segmented icon strip or labelled pills. */
  readonly variant: CategoryNavVariant;

  /** The active category. */
  readonly active: CategoryKey;

  /** The nav scale. */
  readonly size: EmojiPickerSize;

  /** The strip icon size in px. Default `round(nav * 0.8)` derived from the scale. */
  readonly iconSize?: number;
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, type CSSProperties } from 'vue';
import { ToggleInput, ToggleGroup, ToggleGroupVariant, ToggleInputVariant, ToggleMode } from '..';
import {
  CategoryDisplays,
  CategoryNavVariant as CategoryNavVariantValue,
  CategoryOrder,
  EmojiPickerSizes,
} from './EmojiPicker.variants';

/** Renders the category picker as a single-select `ToggleGroup` — segmented icon strip or labelled pill row. */
defineOptions({ name: 'CategoryNav' });

const props = defineProps<CategoryNavProps>();

const emit = defineEmits<{
  /** Fires when the reader picks a category from the nav, carrying its key. Replaces React's `onSelect`. */
  select: [category: CategoryKey];
}>();

const isPills = computed(() => props.variant === CategoryNavVariantValue.Pills);
const navSize = computed(() => EmojiPickerSizes[props.size].nav);
/* 0.55, not the React original's 0.8. `EmojiPickerSizes` already fixes the house glyph-in-box
   ratio at 0.55 (md: glyph 22 in tile 40); 0.8 left a 24px icon in a 30px segment, filling the
   strip edge-to-edge. Matching the tile ratio puts the nav back in scale with the picker. */
const stripIconSize = computed(() => props.iconSize ?? Math.round(navSize.value * 0.55));
const stripItemStyle = computed<CSSProperties>(() => ({ height: `${navSize.value}px` }));

const categories = computed(() =>
  CategoryOrder.map((key) => ({ key, label: CategoryDisplays[key].label, icon: CategoryDisplays[key].Icon })),
);

/* A category is always selected: the group emits `null` when the active button is re-clicked —
   ignore it. */
function selectCategory(key: CategoryKey | null | ReadonlyArray<string>): void {
  if (typeof key === 'string') emit('select', key as CategoryKey);
}

const locale = useLocale();
</script>

<template>
  <ToggleGroup
    v-if="isPills"
    :type="ToggleMode.Single"
    :is-attached="false"
    :model-value="active"
    :aria-label="locale.t('CategoryNav.emojiCategories', undefined, 'Emoji categories')"
    class="flex-wrap"
    @update:modelValue="selectCategory"
  >
    <ToggleInput
      v-for="category in categories"
      :key="category.key"
      :value="category.key"
      :variant="ToggleInputVariant.Outline"
      :size="size"
    >
      {{ category.label }}
    </ToggleInput>
  </ToggleGroup>

  <ToggleGroup
    v-else
    :type="ToggleMode.Single"
    :variant="ToggleGroupVariant.Segmented"
    :model-value="active"
    :aria-label="locale.t('CategoryNav.emojiCategories', undefined, 'Emoji categories')"
    class="w-full"
    @update:modelValue="selectCategory"
  >
    <ToggleInput
      v-for="category in categories"
      :key="category.key"
      :value="category.key"
      :title="category.label"
      :aria-label="category.label"
      class="flex-1"
      :style="stripItemStyle"
    >
      <component :is="category.icon" :size="stripIconSize" class="shrink-0" aria-hidden="true" />
    </ToggleInput>
  </ToggleGroup>
</template>
