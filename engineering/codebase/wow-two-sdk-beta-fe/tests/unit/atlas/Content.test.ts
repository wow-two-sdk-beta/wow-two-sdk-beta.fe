import { describe, expect, it } from 'vitest';
import { generateTheme } from '@src/foundation/themes';
import { Archetypes, findArchetype } from '../../../apps/atlas/src/content/layouts';
import { Guides, recommend, type Guide } from '../../../apps/atlas/src/content/guides';
import { PatternGroups } from '../../../apps/atlas/src/content/patterns';
import { SpecKeys, SpecOptions, specFromQuery, specToQuery } from '../../../apps/atlas/src/content/specQuery';
import { contrastReport } from '../../../apps/atlas/src/content/contrast';
import { Screens, screenFor } from '../../../apps/atlas/src/content/screens';
import {
  DefaultSeed,
  GeneratedThemeId,
  StarterSeeds,
  exportSeed,
  normalizeSeedHue,
  seedFromQuery,
  seedSnippet,
  seedToQuery,
  starterSeed,
  themeIdFrom,
  themeJson,
} from '../../../apps/atlas/src/content/seedQuery';
import type { LayoutSpec } from '../../../apps/atlas/src/content/model';

/* The atlas is a teaching surface: a dangling "related" link, a guide outcome no answer can reach or a lab link
   that does not round-trip is wrong content, not a cosmetic slip. These pin the content graph and the codecs. */

function specValues(spec: LayoutSpec): Record<string, string> {
  return Object.fromEntries(SpecKeys.map((key) => [key, String(spec[key] ?? 'none')]));
}

function everySpec(): Array<[string, LayoutSpec]> {
  return [
    ...Archetypes.map((entry): [string, LayoutSpec] => [entry.id, entry.spec]),
    ...PatternGroups.flatMap((group) =>
      group.patterns.map((pattern): [string, LayoutSpec] => [pattern.id, pattern.spec]),
    ),
    ...Guides.flatMap((guide) => guide.outcomes.map((outcome): [string, LayoutSpec] => [outcome.id, outcome.spec])),
  ];
}

describe('layout content', () => {
  it('keeps archetype ids unique and every related link resolvable', () => {
    expect(new Set(Archetypes.map((entry) => entry.id)).size).toBe(Archetypes.length);
    for (const entry of Archetypes) {
      for (const id of entry.related) expect(findArchetype(id), `${entry.id} → ${id}`).toBeDefined();
      expect(entry.related, `${entry.id} relates to itself`).not.toContain(entry.id);
    }
  });

  it('draws every spec from the values the lab offers', () => {
    for (const [id, spec] of everySpec()) {
      for (const [key, value] of Object.entries(specValues(spec))) {
        expect(SpecOptions[key as (typeof SpecKeys)[number]], `${id}.${key} = ${value}`).toHaveProperty(value);
      }
    }
  });

  it('round-trips every spec through a lab link', () => {
    for (const [id, spec] of everySpec()) {
      const query = new URLSearchParams(specToQuery(spec, 'tablet'));
      expect(specValues(specFromQuery(query)), id).toEqual(specValues(spec));
      expect(query.get('device')).toBe('tablet');
    }
  });

  it('ignores unknown lab values instead of rendering a broken spec', () => {
    const fallback = findArchetype('board')!.spec;
    const spec = specFromQuery(new URLSearchParams('nav=sideways&content=grid&leading=none'), fallback);
    expect(spec.nav).toBe(fallback.nav);
    expect(spec.content).toBe('grid');
    expect(spec.leading).toBeNull();
  });
});

describe('decision guides', () => {
  function outcomesReached(guide: Guide): Set<string> {
    const reached = new Set<string>();
    const walk = (index: number, answers: Record<string, number>): void => {
      if (index === guide.questions.length) {
        reached.add(recommend(guide, answers).id);
        return;
      }
      const question = guide.questions[index]!;
      question.options.forEach((_, option) => walk(index + 1, { ...answers, [question.id]: option }));
    };
    walk(0, {});
    return reached;
  }

  it.each(Guides.map((guide) => [guide.id, guide] as const))('%s weighs only its own outcomes', (_, guide) => {
    const ids = new Set(guide.outcomes.map((outcome) => outcome.id));
    for (const question of guide.questions) {
      for (const option of question.options) {
        for (const outcome of Object.keys(option.weights)) {
          expect(ids.has(outcome), `${question.id} / ${option.label} → ${outcome}`).toBe(true);
        }
      }
    }
    for (const outcome of guide.outcomes) {
      if (outcome.archetype) expect(findArchetype(outcome.archetype), outcome.id).toBeDefined();
    }
  });

  it.each(Guides.map((guide) => [guide.id, guide] as const))('%s can land on every outcome', (_, guide) => {
    expect([...outcomesReached(guide)].sort()).toEqual(guide.outcomes.map((outcome) => outcome.id).sort());
  });

  it('falls back to the first outcome before any answer', () => {
    for (const guide of Guides) expect(recommend(guide, {})).toBe(guide.outcomes[0]);
  });
});

describe('studio seeds', () => {
  it('round-trips a seed through a studio link', () => {
    const seed = { ...DefaultSeed, primaryHue: 12, name: 'Clay studio', neutralTemp: 'warm' as const };
    expect(seedFromQuery(new URLSearchParams(seedToQuery(seed)))).toEqual({ ...seed, id: GeneratedThemeId });
  });

  it('wraps hues onto the circle and drops what it cannot read', () => {
    expect(normalizeSeedHue(-30)).toBe(330);
    expect(normalizeSeedHue(725)).toBe(5);
    expect(normalizeSeedHue(Number.NaN)).toBeNull();
    const seed = seedFromQuery(new URLSearchParams('hue=abc&temp=lukewarm&radius=lg&name=%20%20'));
    expect(seed.primaryHue).toBe(DefaultSeed.primaryHue);
    expect(seed.neutralTemp).toBe(DefaultSeed.neutralTemp);
    expect(seed.radius).toBe('lg');
    expect(seed.name).toBe(DefaultSeed.name);
  });

  it('caps a linked name so a crafted link cannot flood the page', () => {
    expect(seedFromQuery(new URLSearchParams({ name: 'x'.repeat(500) })).name).toHaveLength(40);
  });

  it('rebases a curated seed onto the studio id', () => {
    const [first] = StarterSeeds;
    expect(starterSeed(first!.id)).toMatchObject({ primaryHue: first!.primaryHue, id: GeneratedThemeId });
    expect(starterSeed('no-such-seed')).toBeUndefined();
  });

  it('derives a class-safe export id from the display name', () => {
    expect(themeIdFrom('Café Noir 2')).toBe('cafe-noir-2');
    expect(themeIdFrom('  --Brand!!  ')).toBe('brand');
    expect(themeIdFrom('✨')).toBe('custom-theme');
    expect(exportSeed({ ...DefaultSeed, name: 'Night Shift' }).id).toBe('night-shift');
  });

  it('exports a runnable module and token JSON under the exported id', () => {
    const seed = { ...DefaultSeed, name: 'Night Shift', primaryHue: 300 };
    const snippet = seedSnippet(seed);
    expect(snippet).toContain(`id: 'night-shift'`);
    expect(snippet).toContain('primaryHue: 300,');
    expect(snippet).toContain(`classList.add('theme-night-shift')`);
    const json = JSON.parse(themeJson(generateTheme(exportSeed(seed)))) as { id: string; light: object };
    expect(json.id).toBe('night-shift');
    expect(Object.keys(json.light).length).toBeGreaterThan(20);
  });
});

describe('studio contrast report', () => {
  it('agrees with the engine verdict and ranks the tightest pairs first', () => {
    const theme = generateTheme(DefaultSeed);
    const reports = [contrastReport(theme, 'light'), contrastReport(theme, 'dark')];
    expect(reports.every((report) => report.failures.length === 0)).toBe(theme.meta.contrastAA);
    for (const report of reports) {
      const margins = report.tightest.map((pair) => pair.ratio / pair.min);
      expect(margins).toEqual([...margins].sort((a, b) => a - b));
      expect(report.pairs.length).toBeGreaterThan(report.tightest.length);
    }
  });
});

describe('real-component screens', () => {
  it('realize distinct, existing archetypes under unique ids', () => {
    expect(new Set(Screens.map((screen) => screen.id)).size).toBe(Screens.length);
    expect(new Set(Screens.map((screen) => screen.archetype)).size).toBe(Screens.length);
    for (const screen of Screens) {
      expect(findArchetype(screen.archetype), screen.id).toBeDefined();
      expect(screenFor(screen.archetype)).toBe(screen);
      expect(screen.components.length).toBeGreaterThan(2);
    }
  });
});
