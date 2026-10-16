import { contrastRatio, oklchToHex, parseColor, type Oklch } from './Oklch';

/* The engine's own text poles — the near-white and near-black every generated `-foreground` token starts from. */
const LightText: Oklch = { l: 0.985, c: 0, h: 0 };
const DarkText: Oklch = { l: 0.18, c: 0, h: 0 };

/**
 * The near-white or near-black text color that reads best on `background`.
 *
 * For surfaces a theme does not own — an event, booking or bar a consumer colors itself. Returns `null` for a color
 * the engine cannot parse (a CSS variable, a named color), leaving the inherited text color in place.
 */
export function readableForeground(background: string | null | undefined): string | null {
  const surface = background ? parseColor(background) : null;
  if (!surface) return null;
  /* Hex, not `oklch()`: an inline style lands in any engine, and the poles are achromatic, so nothing is lost. */
  return contrastRatio(LightText, surface) >= contrastRatio(DarkText, surface)
    ? oklchToHex(LightText)
    : oklchToHex(DarkText);
}
