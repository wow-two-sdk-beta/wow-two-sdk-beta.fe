import { oklchToCss, parseColor } from './Oklch';
import type { SemanticToken, TokenSet } from './Tokens';
import { contrastPairs, contrastPairRatio } from './Validate';

/** Adjusts text and required indicator lightness only; surfaces, brand fills and hue inputs remain intact. */
export function ensureForegroundContrast(tokens: TokenSet): TokenSet {
  const adjusted = { ...tokens };
  const requirements = new Map<SemanticToken, Array<ReturnType<typeof contrastPairs>[number]>>();
  for (const pair of contrastPairs()) {
    const group = requirements.get(pair.fg) ?? [];
    group.push(pair);
    requirements.set(pair.fg, group);
  }
  for (const [foreground, pairs] of requirements) {
    const original = tokens[foreground];
    const passes = (color: string, margin = 0): boolean =>
      pairs.every((pair) => contrastPairRatio(tokens, pair, color) >= pair.min + margin);
    if (passes(original)) continue;
    const parsed = parseColor(original);
    if (parsed === null) throw new Error(`Invalid theme foreground: ${foreground}`);
    const candidates: Array<{ color: string; distance: number }> = [];
    for (const pole of [0, 1]) {
      const at = (lightness: number): string => oklchToCss({ ...parsed, l: lightness });
      if (!passes(at(pole), 0.02)) continue;
      let failing = parsed.l;
      let passing = pole;
      for (let step = 0; step < 24; step++) {
        const middle = (failing + passing) / 2;
        if (passes(at(middle), 0.02)) passing = middle;
        else failing = middle;
      }
      candidates.push({ color: at(passing), distance: Math.abs(passing - parsed.l) });
    }
    candidates.sort((a, b) => a.distance - b.distance);
    const selected = candidates[0];
    if (selected === undefined) throw new Error(`No foreground can satisfy the declared surfaces: ${foreground}`);
    adjusted[foreground] = selected.color;
  }
  return adjusted;
}
