/* ---------------------------------------------------------------------------
 * Curated theme registry.
 *
 * ~24 named presets. Every one is authored as a `ThemeSeed` and expanded through
 * `generateTheme`, so the whole catalog is contrast-validated the same way an
 * app's bespoke theme would be. Names nod to well-known palettes but the colors
 * are generated (not literal clones) — the seed captures the *vibe* (hue family,
 * neutral temperature, accent scheme, surface character).
 *
 * `THEMES` resolves and caches entries on first access; `getTheme(id)` looks one up.
 * ------------------------------------------------------------------------- */

import type { Theme, ThemeSeed } from './Theme';
import { ThemeStatus } from './Theme';
import { generateTheme } from './Generate';
import { AuthoredThemes } from './constants/Authored';
import { PoolSeeds } from './constants/Pool';

/** The authoring seeds. Order here = order in `THEMES` and the emitted stylesheet. */
export const ThemeSeeds: ReadonlyArray<ThemeSeed> = [
  {
    id: 'wow',
    name: 'WoW',
    description: 'House blue — the @wow-two-beta/ui default vibe, regenerated in OKLCH.',
    tags: ['brand', 'default'],
    primaryHue: 264,
    neutralTemp: 'cool',
    accentMode: 'analogous',
    surface: 'crisp',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep indigo on cool slate — calm, focused, low-glare.',
    tags: ['cool', 'calm'],
    primaryHue: 268,
    neutralTemp: 'cool',
    accentMode: 'triadic',
    surface: 'soft',
  },
  {
    id: 'slate',
    name: 'Slate',
    description: 'Neutral steel-blue brand on balanced greys — quiet and professional.',
    tags: ['neutral', 'professional'],
    primaryHue: 235,
    neutralTemp: 'cool',
    accentMode: 'complementary',
    surface: 'crisp',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Azure brand with a teal accent over cool neutrals.',
    tags: ['cool', 'fresh'],
    primaryHue: 222,
    neutralTemp: 'cool',
    accentMode: 'analogous',
    surface: 'crisp',
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Pine green brand, warm-leaning neutrals, earthy accent.',
    tags: ['nature', 'warm'],
    primaryHue: 150,
    neutralTemp: 'warm',
    accentMode: 'analogous',
    surface: 'soft',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    description: 'Vivid green-teal brand on crisp cool greys.',
    tags: ['nature', 'cool'],
    primaryHue: 165,
    neutralTemp: 'cool',
    accentMode: 'complementary',
    surface: 'crisp',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm orange brand with a violet accent — energetic dusk palette.',
    tags: ['warm', 'vibrant'],
    primaryHue: 42,
    neutralTemp: 'warm',
    accentMode: 'complementary',
    surface: 'crisp',
  },
  {
    id: 'amber',
    name: 'Amber',
    description: 'Golden brand on warm stone — cozy and grounded.',
    tags: ['warm', 'cozy'],
    primaryHue: 75,
    neutralTemp: 'warm',
    accentMode: 'triadic',
    surface: 'soft',
  },
  {
    id: 'rose',
    name: 'Rose',
    description: 'Soft crimson-pink brand with a warm neutral ground.',
    tags: ['warm', 'soft'],
    primaryHue: 12,
    neutralTemp: 'warm',
    accentMode: 'analogous',
    surface: 'soft',
  },
  {
    id: 'crimson',
    name: 'Crimson',
    description: 'Bold red brand on neutral greys — high-impact and direct.',
    tags: ['warm', 'bold'],
    primaryHue: 25,
    neutralTemp: 'neutral',
    accentMode: 'complementary',
    surface: 'crisp',
  },
  {
    id: 'plum',
    name: 'Plum',
    description: 'Rich magenta-purple brand with a green accent.',
    tags: ['vibrant', 'cool'],
    primaryHue: 330,
    neutralTemp: 'cool',
    accentMode: 'complementary',
    surface: 'crisp',
  },
  {
    id: 'grape',
    name: 'Grape',
    description: 'Royal violet brand over cool neutrals, analogous accent.',
    tags: ['cool', 'vibrant'],
    primaryHue: 295,
    neutralTemp: 'cool',
    accentMode: 'analogous',
    surface: 'soft',
  },
  {
    id: 'lavender',
    name: 'Lavender',
    description: 'Gentle violet brand, soft surfaces, low-glare.',
    tags: ['cool', 'soft'],
    primaryHue: 285,
    neutralTemp: 'cool',
    accentMode: 'triadic',
    surface: 'soft',
  },
  {
    id: 'teal',
    name: 'Teal',
    description: 'Balanced teal brand with a coral accent on neutral greys.',
    tags: ['cool', 'fresh'],
    primaryHue: 195,
    neutralTemp: 'neutral',
    accentMode: 'complementary',
    surface: 'crisp',
  },
  {
    id: 'cyan',
    name: 'Cyan',
    description: 'Bright cyan brand, cool neutrals, electric feel.',
    tags: ['cool', 'vibrant'],
    primaryHue: 210,
    neutralTemp: 'cool',
    accentMode: 'analogous',
    surface: 'crisp',
  },
  {
    id: 'mint',
    name: 'Mint',
    description: 'Light spring-green brand on soft cool greys.',
    tags: ['nature', 'soft'],
    primaryHue: 158,
    neutralTemp: 'neutral',
    accentMode: 'analogous',
    surface: 'soft',
  },
  {
    id: 'nord',
    name: 'Nord',
    description: 'Arctic blue brand on desaturated cool slate — Nord-inspired.',
    tags: ['cool', 'calm', 'muted'],
    primaryHue: 213,
    neutralTemp: 'cool',
    accentMode: 'analogous',
    surface: 'soft',
  },
  {
    id: 'solarized',
    name: 'Solarized',
    description: 'Cyan-blue brand on warm tan neutrals — Solarized-inspired balance.',
    tags: ['warm', 'muted'],
    primaryHue: 205,
    neutralTemp: 'warm',
    accentMode: 'complementary',
    surface: 'soft',
  },
  {
    id: 'dracula',
    name: 'Dracula',
    description: 'Purple brand with a pink-magenta accent on cool neutrals — Dracula-inspired.',
    tags: ['cool', 'vibrant'],
    primaryHue: 265,
    neutralTemp: 'cool',
    accentMode: 'triadic',
    surface: 'crisp',
  },
  {
    id: 'gruvbox',
    name: 'Gruvbox',
    description: 'Warm orange-amber brand on retro warm neutrals — Gruvbox-inspired.',
    tags: ['warm', 'retro', 'muted'],
    primaryHue: 50,
    neutralTemp: 'warm',
    accentMode: 'analogous',
    surface: 'soft',
  },
  {
    id: 'monokai',
    name: 'Monokai',
    description: 'Lime-green brand with a magenta accent on neutral greys — Monokai-inspired.',
    tags: ['vibrant', 'neutral'],
    primaryHue: 130,
    neutralTemp: 'neutral',
    accentMode: 'complementary',
    surface: 'crisp',
  },
  {
    id: 'mono',
    name: 'Mono',
    description: 'Achromatic — black/white brand on pure neutral greys. Minimal, content-first.',
    tags: ['neutral', 'minimal', 'grayscale'],
    primaryHue: 270,
    neutralTemp: 'neutral',
    accentMode: 'mono',
    surface: 'crisp',
  },
  {
    id: 'graphite',
    name: 'Graphite',
    description: 'Near-mono with a faint cool-blue brand — understated and dense.',
    tags: ['neutral', 'minimal'],
    primaryHue: 240,
    neutralTemp: 'cool',
    accentMode: 'mono',
    surface: 'crisp',
  },
  {
    id: 'sand',
    name: 'Sand',
    description: 'Warm taupe brand on soft sandy neutrals — paper-like and gentle.',
    tags: ['warm', 'soft', 'minimal'],
    primaryHue: 60,
    neutralTemp: 'warm',
    accentMode: 'mono',
    surface: 'soft',
  },
];

/**
 * Every candidate seed, in emit order: the curated 24 first, then the larger
 * diverse pool (named editor/brand palettes + the full-wheel hue sweep) from
 * `constants/Pool.ts`. Kept as a single list so `ThemeIds`/`ThemeSeeds` consumers and
 * the studio see the whole candidate catalog.
 */
const CandidateSeeds: ReadonlyArray<ThemeSeed> = [...ThemeSeeds, ...PoolSeeds];

/**
 * The generator-built presets. AA-proven by the engine but not yet validated
 * against a real app surface → `generateTheme` stamps them `status: "candidate"`.
 */
const ResolvedCandidates = new Map<ThemeSeed, Theme>();

/** Dense array accessors defer expensive color generation until that entry is read. */
function createThemeCatalog(): ReadonlyArray<Theme> {
  const themes = [...AuthoredThemes];
  for (const seed of CandidateSeeds) {
    Object.defineProperty(themes, themes.length, {
      enumerable: true,
      get: () => {
        let resolved = ResolvedCandidates.get(seed);
        if (resolved === undefined) {
          resolved = generateTheme(seed);
          ResolvedCandidates.set(seed, resolved);
        }
        return resolved;
      },
    });
  }
  return Object.freeze(themes);
}

/**
 * The full registry: validated (real-app-proven) themes FIRST, then the curated
 * candidate presets. Order here = order in the emitted stylesheet / manifest.
 */
export const THEMES: ReadonlyArray<Theme> = createThemeCatalog();

/** Look up a theme by id. Returns `undefined` when absent. */
export function getTheme(id: string): Theme | undefined {
  const index = ThemeIds.indexOf(id);
  return index < 0 ? undefined : THEMES[index];
}

/** Themes proven against a real app surface (`status === "validated"`). */
export function validatedThemes(): ReadonlyArray<Theme> {
  return [
    ...AuthoredThemes.filter((theme) => theme.status === ThemeStatus.Validated),
    ...CandidateSeeds.flatMap((seed) => {
      const theme = ResolvedCandidates.get(seed);
      return theme?.status === ThemeStatus.Validated ? [theme] : [];
    }),
  ];
}

/** Engine-proven curated presets not yet app-validated (`status === "candidate"`). */
export function candidateThemes(): ReadonlyArray<Theme> {
  return THEMES.filter((t) => t.status === ThemeStatus.Candidate);
}

/** Ids of all curated themes, in registry order. */
export const ThemeIds: ReadonlyArray<string> = [
  ...AuthoredThemes.map((theme) => theme.id),
  ...CandidateSeeds.map((seed) => seed.id),
];

/** Lightweight catalog metadata; reading this list does not generate candidate colors. */
export const ThemeCatalog: ReadonlyArray<Pick<Theme, 'id' | 'name' | 'status'>> = [
  ...AuthoredThemes.map(({ id, name, status }) => ({ id, name, status })),
  ...CandidateSeeds.map(({ id, name }) => ({ id, name, status: ThemeStatus.Candidate })),
];
