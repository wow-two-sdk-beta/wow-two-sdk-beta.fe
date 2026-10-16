import {
  AccentMode,
  NeutralTemp,
  SurfaceStyle,
  ThemeRadius,
  ThemeSeeds,
  type Theme,
  type ThemeSeed,
} from '@wow-two-beta/ui-vue/foundation/themes';

/** The id the studio's theme is generated under; its CSS is scoped to `.theme-atlas-generated`. */
export const GeneratedThemeId = 'atlas-generated';

/** The seed the studio opens on when the link carries none — the house hue with the engine defaults. */
export const DefaultSeed: ThemeSeed = {
  id: GeneratedThemeId,
  name: 'My theme',
  primaryHue: 264,
  neutralTemp: NeutralTemp.Neutral,
  accentMode: AccentMode.Complementary,
  surface: SurfaceStyle.Crisp,
  radius: ThemeRadius.Md,
};

/** The studio's option labels per seed axis; the keys are the engine's own enum values. */
export const SeedOptions = {
  neutralTemp: {
    [NeutralTemp.Cool]: 'Cool',
    [NeutralTemp.Neutral]: 'Neutral',
    [NeutralTemp.Warm]: 'Warm',
  },
  accentMode: {
    [AccentMode.Complementary]: 'Complementary',
    [AccentMode.Analogous]: 'Analogous',
    [AccentMode.Triadic]: 'Triadic',
    [AccentMode.Mono]: 'Mono',
  },
  surface: { [SurfaceStyle.Soft]: 'Soft', [SurfaceStyle.Crisp]: 'Crisp' },
  radius: { [ThemeRadius.Sm]: 'Small', [ThemeRadius.Md]: 'Medium', [ThemeRadius.Lg]: 'Large' },
} as const;

type SeedAxis = keyof typeof SeedOptions;

const SeedAxes = Object.keys(SeedOptions) as SeedAxis[];

/** The short query keys a studio link uses. */
const QueryKey: Readonly<Record<SeedAxis, string>> = {
  neutralTemp: 'temp',
  accentMode: 'accent',
  surface: 'surface',
  radius: 'radius',
};

const MaxNameLength = 40;

/** Wraps any number onto the 0–359 hue circle; a non-number yields `null`. */
export function normalizeSeedHue(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  return ((Math.round(value) % 360) + 360) % 360;
}

/** Serializes a seed into query parameters, so a studio theme is a shareable link. */
export function seedToQuery(seed: ThemeSeed): Record<string, string> {
  const query: Record<string, string> = { hue: String(normalizeSeedHue(seed.primaryHue) ?? 0) };
  for (const axis of SeedAxes) {
    const value = seed[axis];
    if (value !== undefined) query[QueryKey[axis]] = value;
  }
  query.name = seed.name;
  return query;
}

/** Reads a seed from query parameters, keeping the fallback's value for anything missing or unknown. */
export function seedFromQuery(query: URLSearchParams, fallback: ThemeSeed = DefaultSeed): ThemeSeed {
  const next: Record<string, unknown> = { ...fallback, id: GeneratedThemeId };
  const hue = query.get('hue');
  const parsedHue = hue === null || hue.trim() === '' ? null : normalizeSeedHue(Number(hue));
  if (parsedHue !== null) next.primaryHue = parsedHue;
  for (const axis of SeedAxes) {
    const value = query.get(QueryKey[axis]);
    if (value !== null && value in SeedOptions[axis]) next[axis] = value;
  }
  const name = query.get('name')?.trim();
  if (name) next.name = name.slice(0, MaxNameLength);
  return next as unknown as ThemeSeed;
}

/** The curated seeds a studio session can start from, by id. */
export const StarterSeeds: ReadonlyArray<ThemeSeed> = ThemeSeeds;

/** A curated seed rebased onto the studio's id, or `undefined` for an unknown id. */
export function starterSeed(id: string | null | undefined): ThemeSeed | undefined {
  const seed = StarterSeeds.find((entry) => entry.id === id);
  return seed && { ...DefaultSeed, ...seed, id: GeneratedThemeId };
}

/** A kebab-case class id from a display name; empty or symbol-only names fall back to `custom-theme`. */
export function themeIdFrom(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, MaxNameLength);
  return slug || 'custom-theme';
}

/** The seed rebased onto the id its export ships under. */
export function exportSeed(seed: ThemeSeed): ThemeSeed {
  return { ...seed, id: themeIdFrom(seed.name) };
}

/** A paste-ready module that regenerates the theme at runtime and applies it to the document. */
export function seedSnippet(seed: ThemeSeed): string {
  const shipped = exportSeed(seed);
  const fields = [
    `  id: '${shipped.id}',`,
    `  name: ${JSON.stringify(shipped.name)},`,
    `  primaryHue: ${normalizeSeedHue(shipped.primaryHue) ?? 0},`,
    ...SeedAxes.flatMap((axis) => (shipped[axis] === undefined ? [] : [`  ${axis}: '${shipped[axis]}',`])),
  ];
  return [
    `import { generateTheme, themeToCss } from '@wow-two-beta/ui-vue/foundation/themes';`,
    ``,
    `const theme = generateTheme({`,
    ...fields,
    `});`,
    ``,
    `// Inject the scoped CSS once, then put the theme class (and \`dark\`) on a root element.`,
    `const style = document.createElement('style');`,
    `style.textContent = themeToCss(theme);`,
    `document.head.append(style);`,
    `document.documentElement.classList.add('theme-${shipped.id}');`,
  ].join('\n');
}

/** The raw light/dark token sets as JSON — for design tools, native apps or a static stylesheet build. */
export function themeJson(theme: Theme): string {
  const { id, name, radius, light, dark } = theme;
  return JSON.stringify({ id, name, radius, light, dark }, null, 2);
}
