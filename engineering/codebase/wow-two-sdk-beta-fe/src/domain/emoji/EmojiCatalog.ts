import type { EmojiCategory } from './EmojiCategory';
import { emojiCatalogData } from './EmojiCatalogData';

/** Represents one catalog emoji — its glyph, display label, search tags, and display category. */
export interface EmojiCatalogEntry {
  /** The emoji glyph (a base emoji, no skin-tone variant). */
  readonly glyph: string;

  /** The human-readable display name. */
  readonly label: string;

  /** The lowercase keywords the search matches against. */
  readonly tags: ReadonlyArray<string>;

  /** The top-level category the entry is grouped under. */
  readonly category: EmojiCategory;
}

/** Returns every catalog emoji in `category`, preserving display order. */
const entries: ReadonlyArray<EmojiCatalogEntry> = Object.freeze(emojiCatalogData);
for (const entry of entries) {
  Object.freeze(entry.tags);
  Object.freeze(entry);
}

function byCategory(category: EmojiCategory): ReadonlyArray<EmojiCatalogEntry> {
  return entries.filter((entry) => entry.category === category);
}

/**
 * Searches the catalog by a free-text keyword, case-insensitively.
 * Matches on label and tags; ranks label matches above tag-only matches, and a
 * label-prefix hit above a label-substring hit. Ties keep display order. A blank
 * keyword returns the whole catalog.
 */
function search(keyword: string): ReadonlyArray<EmojiCatalogEntry> {
  const needle = keyword.trim().toLowerCase();
  if (!needle) return entries;

  const ranked: { entry: EmojiCatalogEntry; rank: number; order: number }[] = [];
  for (let order = 0; order < entries.length; order++) {
    // `noUncheckedIndexedAccess` widens the element; the loop is length-bound, so this never trips.
    const entry = entries[order];
    if (entry === undefined) continue;
    const label = entry.label.toLowerCase();

    let rank: number;
    if (label.startsWith(needle)) rank = 0;
    else if (label.includes(needle)) rank = 1;
    else if (entry.tags.some((tag) => tag.includes(needle))) rank = 2;
    else continue;

    ranked.push({ entry, rank, order });
  }

  ranked.sort((a, b) => a.rank - b.rank || a.order - b.order);
  return ranked.map((hit) => hit.entry);
}

/** Provides the standard emoji set, base only, plus its category and search lookups. */
export const EmojiCatalog = {
  /** Every catalog emoji, in display order. */
  all: entries,
  byCategory,
  search,
};
