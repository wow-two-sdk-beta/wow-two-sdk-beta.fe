/* ---------------------------------------------------------------------------
 * @wow-two-beta/ui-vue — themes (foundation module).
 *
 * A theme ENGINE: derive proven light/dark token sets from an OKLCH seed, apply
 * a curated theme by name, validate any theme for WCAG AA, and emit the scoped
 * CSS / JSON manifest an app (or Claude) uses to "use theme X".
 *
 * Import: `import { THEMES, getTheme, generateTheme } from '@wow-two-beta/ui-vue/themes'`
 * Apply : add `theme-{id}` to a root element; toggle `.dark` for dark mode.
 *         The matching stylesheet ships at `@wow-two-beta/ui-vue/themes.css`.
 *
 * Foundation layer — no upward imports (ESLint enforces).
 * ------------------------------------------------------------------------- */

// Color engine
export { Oklch } from './Oklch';
export type { Oklch as OklchColor } from './Oklch';
export {
  normalizeHue,
  isInSrgbGamut,
  clampChromaToGamut,
  oklchToHex,
  oklchToCss,
  parseColor,
  relativeLuminance,
  contrastRatio,
  contrastRatioCss,
} from './Oklch';

// Token contract
export type { SemanticToken, TokenSet, RadiusScale, ToneFamilyName, ToneSlots } from './Tokens';
export { SemanticTokens, SurfaceTokens, ToneFamilies, applyToneSlots } from './Tokens';

// Theme + seed shapes
export type { Theme, ThemeAmbient, ThemeMeta, ThemeSeed } from './Theme';
// Const-object enums + a type of the same name (value + type export).
export { ThemeStatus, ThemeRadius, NeutralTemp, AccentMode, SurfaceStyle } from './Theme';

// Generator
export { generateTheme } from './Generate';
export { readableForeground } from './ReadableForeground';

// Validator
export { validateTheme, contrastPairs, contrastPairRatio, AaText, AaUi, type ContrastPair } from './Validate';

// CSS / manifest emitters
export { themeToCss, emitAllThemesCss, emitThemesManifest, type ThemeManifestEntry } from './Css';

// Curated registry
export { THEMES, ThemeSeeds, ThemeIds, ThemeCatalog, getTheme, validatedThemes, candidateThemes } from './Registry';
