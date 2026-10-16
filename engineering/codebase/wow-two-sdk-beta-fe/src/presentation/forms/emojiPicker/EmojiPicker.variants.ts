import { Bike, Car, Clock, Flag, Hash, Lightbulb, PawPrint, Smile, Utensils } from 'lucide-vue-next';

import { SizePreset } from '../../../foundation/styles';
import { type IconAdapter } from '../../../foundation/icons';
import { EmojiCategory } from '../../../domain/emoji';

/** A uniform t-shirt scale, applied per picker element (search, category nav, tiles). */
export type EmojiPickerSize = Extract<SizePreset, 'sm' | 'md' | 'lg'>;

/** The picker's element scale applied wherever no per-element size is given. */
export const DefaultPickerSize: EmojiPickerSize = SizePreset.Md;

/** Defines a picker element that can carry its own scale — the search box, the category nav, or the tiles. */
export const PickerElement = {
  /** Refers to the search input. */
  Search: 'search',
  /** Refers to the category nav. */
  Nav: 'nav',
  /** Refers to the emoji tiles. */
  Tile: 'tile',
} as const;

export type PickerElement = (typeof PickerElement)[keyof typeof PickerElement];

/**
 * A single scale for the whole picker, or a per-element override map — `search`/`nav`/`tile` as
 * t-shirt scales plus `icon` as the strip icon size in px (one dimension, so px not a scale).
 */
export type EmojiPickerSizeInput =
  EmojiPickerSize | (Partial<Record<PickerElement, EmojiPickerSize>> & { icon?: number });

/**
 * Resolves the scale for one picker element — a uniform size applies to every element, a map
 * falls back to `fallback` per element.
 */
export function resolveElementSize(
  size: EmojiPickerSizeInput | undefined,
  element: PickerElement,
  fallback: EmojiPickerSize,
): EmojiPickerSize {
  return typeof size === 'string' ? size : (size?.[element] ?? fallback);
}

/** Defines which category-navigation affordance the picker renders. */
export const CategoryNavVariant = {
  /** Refers to the segmented icon-strip layout. */
  Strip: 'strip',
  /** Refers to the labelled pill-row layout. */
  Pills: 'pills',
} as const;

export type CategoryNavVariant = (typeof CategoryNavVariant)[keyof typeof CategoryNavVariant];

/** Defines how each emoji tile is framed — a rounded-rect chip or a circle. */
export const EmojiTileShape = {
  /** Refers to a rounded-rect chip frame. */
  Rounded: 'rounded',
  /** Refers to a circular frame. */
  Circle: 'circle',
} as const;

export type EmojiTileShape = (typeof EmojiTileShape)[keyof typeof EmojiTileShape];

/** The default `StorageBroker` key the picker persists its most-recently-used emoji under. */
export const EmojiRecentsKey = 'wow-two-beta.emoji.recents';

/** Defines the pixel geometry an `EmojiPickerSize` maps to for the rolled tile + nav elements. */
export interface EmojiPickerSizeTokens {
  /** The emoji tile's min edge, in px; the grid auto-fills columns at this width. */
  readonly tile: number;

  /** The emoji glyph's font size, in px. */
  readonly glyph: number;

  /** The category-nav control's edge, in px. */
  readonly nav: number;

  /** The inter-tile gap, in px. */
  readonly gap: number;
}

/** Maps each `EmojiPickerSize` to its tile / glyph / nav / gap pixel geometry. */
export const EmojiPickerSizes: Record<EmojiPickerSize, EmojiPickerSizeTokens> = {
  sm: { tile: 32, glyph: 18, nav: 26, gap: 4 },
  md: { tile: 40, glyph: 22, nav: 30, gap: 6 },
  lg: { tile: 48, glyph: 26, nav: 34, gap: 8 },
};

/** The synthetic "recently used" bucket — nav index 0, backed by the MRU list rather than the catalog. */
export const RecentCategory = 'recent';

/** A navigable picker section: the synthetic recents bucket or one real catalog category. */
export type CategoryKey = typeof RecentCategory | EmojiCategory;

/** Defines a category's nav presentation — its accessible label and glyph. */
interface CategoryDisplay {
  label: string;
  Icon: IconAdapter;
}

/** The nav categories in display order — recents first, then the catalog's Telegram-order groups. */
export const CategoryOrder: ReadonlyArray<CategoryKey> = [
  RecentCategory,
  EmojiCategory.SmileysPeople,
  EmojiCategory.AnimalsNature,
  EmojiCategory.FoodDrink,
  EmojiCategory.Activity,
  EmojiCategory.TravelPlaces,
  EmojiCategory.Objects,
  EmojiCategory.Symbols,
  EmojiCategory.Flags,
];

/** Maps each nav category to its label + icon. */
export const CategoryDisplays: Record<CategoryKey, CategoryDisplay> = {
  [RecentCategory]: { label: 'Recent', Icon: Clock },
  [EmojiCategory.SmileysPeople]: { label: 'Smileys & people', Icon: Smile },
  [EmojiCategory.AnimalsNature]: { label: 'Animals & nature', Icon: PawPrint },
  [EmojiCategory.FoodDrink]: { label: 'Food & drink', Icon: Utensils },
  [EmojiCategory.Activity]: { label: 'Activity', Icon: Bike },
  [EmojiCategory.TravelPlaces]: { label: 'Travel & places', Icon: Car },
  [EmojiCategory.Objects]: { label: 'Objects', Icon: Lightbulb },
  [EmojiCategory.Symbols]: { label: 'Symbols', Icon: Hash },
  [EmojiCategory.Flags]: { label: 'Flags', Icon: Flag },
};

/** The muted hints shown when a picker surface has no emoji to render. */
export const EmojiEmptyLabels = {
  /** Refers to the empty search-results hint. */
  search: 'No matches.',
  /** Refers to the empty recents hint. */
  recents: 'Your picks show up here.',
  /** Refers to the empty category hint. */
  category: 'No emoji here yet.',
} as const;
