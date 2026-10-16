import { computed, onMounted, ref, toValue, type ComputedRef, type MaybeRefOrGetter, type Ref } from 'vue';

import { EmojiCatalog, EmojiCategory, type EmojiCatalogEntry } from '../../../domain/emoji';
import { useRecentItems } from '../../../foundation/storage';
import { type StorageBroker } from '../../../foundation/storage';

import { type CategoryKey, EmojiRecentsKey, RecentCategory } from './EmojiPicker.variants';

/** Identifies a recent emoji by its glyph. */
const emojiGlyphIdentity = (entry: EmojiCatalogEntry): string => entry.glyph;

/** Defines the inputs the picker view-model binds to the live selection value. */
export interface UseEmojiPickerOptions {
  /** The current emoji entry, or `null` for none. Pass a getter to keep it reactive. */
  readonly value: MaybeRefOrGetter<EmojiCatalogEntry | null>;

  /** Emits the next emoji entry, or `null` to clear it. */
  readonly onChange: (entry: EmojiCatalogEntry | null) => void;

  /** The persistence contract backing recents — keeps the picker storage-agnostic (localStorage, Redux, …). */
  readonly storage: StorageBroker;

  /**
   * When `true` and recents is empty at mount, the initial category is the first real category,
   * not the recents bucket. Default `false`.
   */
  readonly showFirstCategoryWhenRecentsEmpty?: MaybeRefOrGetter<boolean>;
}

/**
 * Represents the headless picker state — layout-agnostic, shared by every nav variant.
 *
 * React exposed `setSearchKeyword` / `setActiveCategory` alongside the values; here
 * both are writable refs, which already are their own setters, so the paired setters
 * are gone.
 */
export interface EmojiPickerModel {
  /** The current search keyword. Writable. */
  readonly searchKeyword: Ref<string>;

  /** The active category (or the synthetic recents bucket). Writable. */
  readonly activeCategory: Ref<CategoryKey>;

  /** Whether a non-empty keyword is driving the visible list, bypassing categories. */
  readonly showSearch: ComputedRef<boolean>;

  /** The emoji to render right now — search results, recents, or the active category. */
  readonly visibleEmojis: ComputedRef<ReadonlyArray<EmojiCatalogEntry>>;

  /** The most-recently-used emoji, most-recent-first. */
  readonly recents: ComputedRef<ReadonlyArray<EmojiCatalogEntry>>;

  /** The selected emoji entry, or `null` for none. */
  readonly selected: ComputedRef<EmojiCatalogEntry | null>;

  /** Picks an emoji — sets the selection to that entry and records it as recent. */
  readonly selectEmoji: (entry: EmojiCatalogEntry) => void;

  /** Clears the selected emoji. */
  readonly clearSelection: () => void;
}

/**
 * Manages the emoji picker independent of layout: owns the keyword, the active category, the derived
 * visible list, and the recents MRU — and folds a pick back into the selection entry + the recents list.
 */
export function useEmojiPicker({
  value,
  onChange,
  storage,
  showFirstCategoryWhenRecentsEmpty = false,
}: UseEmojiPickerOptions): EmojiPickerModel {
  const { recents, push } = useRecentItems<EmojiCatalogEntry>(EmojiRecentsKey, {
    identify: emojiGlyphIdentity,
    broker: storage,
  });

  const searchKeyword = ref('');
  /* Default to the recents bucket; when asked and there are no recents yet, open on the first real category
     instead. Recents hydrate from the broker on mount (SSR-safe), so setup never sees them: the first category is
     the provisional pick, settled once on mount — the persistent state's hydrate hook was registered first and
     has already run. Decided once, so a later arrival of recents never yanks the reader's category away. */
  const wantsFirstCategory = toValue(showFirstCategoryWhenRecentsEmpty);
  const activeCategory = ref<CategoryKey>(wantsFirstCategory ? EmojiCategory.SmileysPeople : RecentCategory);
  if (wantsFirstCategory) {
    onMounted(() => {
      if (recents.value.length > 0 && activeCategory.value === EmojiCategory.SmileysPeople) {
        activeCategory.value = RecentCategory;
      }
    });
  }

  const trimmedKeyword = computed(() => searchKeyword.value.trim());
  const showSearch = computed(() => trimmedKeyword.value.length > 0);

  const visibleEmojis = computed<ReadonlyArray<EmojiCatalogEntry>>(() => {
    if (showSearch.value) return EmojiCatalog.search(trimmedKeyword.value);
    if (activeCategory.value === RecentCategory) return recents.value;
    return EmojiCatalog.byCategory(activeCategory.value);
  });

  const selected = computed<EmojiCatalogEntry | null>(() => toValue(value));

  function selectEmoji(entry: EmojiCatalogEntry): void {
    onChange(entry);
    push(entry);
  }

  function clearSelection(): void {
    onChange(null);
  }

  return {
    searchKeyword,
    activeCategory,
    showSearch,
    visibleEmojis,
    recents,
    selected,
    selectEmoji,
    clearSelection,
  };
}
