/** Defines a discrete emoji size preset — the ratio it applies to the host width, plus its preview glyph. */
export const CenterEmojiSize = {
  /** Refers to the small emoji size. */
  Small: 'small',
  /** Refers to the medium emoji size. */
  Medium: 'medium',
  /** Refers to the large emoji size. */
  Large: 'large',
} as const;

export type CenterEmojiSize = (typeof CenterEmojiSize)[keyof typeof CenterEmojiSize];

/** Defines the display for an emoji size option. */
interface CenterEmojiSizeDisplay {
  label: string;
  ratio: number;
  glyph: number;
}

/** Maps each emoji size to its label, host-width ratio, and preview glyph size (each glyph ≤ the preview cap). */
export const CenterEmojiSizeDisplays: Record<CenterEmojiSize, CenterEmojiSizeDisplay> = {
  [CenterEmojiSize.Small]: { label: 'Small', ratio: 0.18, glyph: 16 },
  [CenterEmojiSize.Medium]: { label: 'Medium', ratio: 0.25, glyph: 22 },
  [CenterEmojiSize.Large]: { label: 'Large', ratio: 0.32, glyph: 24 },
};

/** The emoji size (fraction of the host surface's width) applied as the sensible default when none is set. */
export const DefaultEmojiSize = 0.25;

/** The default preview-glyph cap, in px — caps each tile's glyph so it never clips the `OptionTilePicker` frame. */
export const DefaultMaxPreviewGlyph = 24;
