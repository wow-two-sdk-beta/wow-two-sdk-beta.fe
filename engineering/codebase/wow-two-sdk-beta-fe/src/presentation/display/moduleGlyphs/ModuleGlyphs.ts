// Three-cell preview geometry — cells at these x-positions, each this wide, on a 24-unit canvas.
export const CellPositions = [3, 9.5, 16];
export const CellSize = 5;
export const BarCornerRx = 2.4;

/**
 * Defines props for a fixed-geometry glyph.
 *
 * React shipped all four glyphs from one `ModuleGlyphs.tsx`. An SFC is one
 * component per file, so the four became `DotsGlyph.vue`, `VerticalBarsGlyph.vue`,
 * `HorizontalBarsGlyph.vue` and `CellsGlyph.vue`, with the shared geometry and
 * this prop type left here.
 */
export interface GlyphProps {
  /** The glyph's pixel size. */
  readonly size?: number;
}
