import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { THEMES, contrastRatioCss } from '@src/foundation/themes';

/*
 * A tone's solid fill (`primary`, `success`, `warning`, `destructive`, `info`) is tuned to carry its `-foreground`,
 * not to be read as text: as text on a page it falls under AA in hundreds of theme and surface pairs. The
 * `-soft-foreground` tokens are the tones' text colors — the validator holds them to AA on every neutral surface.
 * This guard keeps text and icon colors on them, with the graphic tone maps below as the reviewed exceptions.
 */

const Root = fileURLToPath(new URL('../../../../src/presentation/', import.meta.url));
const Tones = ['primary', 'success', 'warning', 'destructive', 'info'] as const;
const PlainToneText = /(?<![\w-])text-(primary|success|warning|destructive|info)(?![\w-])/gu;

/** Files whose plain tone classes are reviewed: graphics held to 3:1, control chrome, or prose about the rule. */
const Reviewed: Readonly<Record<string, string>> = {
  'display/audioWaveformPreview/AudioWaveformPreview.vue': 'waveform bars — a graphic tone map',
  'display/sparkline/Sparkline.vue': 'chart strokes and fills — a graphic tone map',
  'feedback/progressCircleIndicator/ProgressCircleIndicator.vue': 'progress arc — a graphic tone map',
  'feedback/spinner/Spinner.variants.ts': 'busy glyph — a graphic tone map',
  'forms/knobInput/KnobInput.vue': 'knob arc — a graphic tone map',
  'forms/ratingPicker/RatingPicker.vue': 'rating marks — a graphic tone map',
  'forms/checkboxInput/CheckboxInput.vue': 'checkbox chrome — the tone the consumer picks',
  'forms/checkboxInput/CheckboxInput.variants.ts': 'checkbox chrome — the tone the consumer picks',
  'forms/toggleInput/ToggleInput.variants.ts': 'pressed glyph on a dark media scrim, not a page surface',
  'forms/nodeEditor/NodeEditor.vue': 'port hover on a graphic, held to 3:1',
  'display/metricBadge/MetricBadge.vue': 'a comment explaining this rule',
  'nav/linkItem/LinkItem.variants.ts': 'a comment explaining this rule',
};

function sources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.(vue|ts)$/u.test(entry.name) ? [path] : [];
  });
}

describe('tone text', () => {
  it('colors text and icons with the `-soft-foreground` tokens outside the reviewed graphics', () => {
    const offenders = sources(Root).flatMap((path) => {
      const file = relative(Root, path);
      if (file in Reviewed) return [];
      const matches = readFileSync(path, 'utf8').match(PlainToneText) ?? [];
      return matches.map((match) => `${file}: ${match}`);
    });
    expect(offenders).toEqual([]);
  });

  it('keeps every reviewed exception present, so the list cannot rot', () => {
    for (const file of Object.keys(Reviewed)) {
      expect(readFileSync(join(Root, file), 'utf8'), file).toMatch(PlainToneText);
    }
  });

  it('holds the soft text tokens to AA on the page and card surfaces of every theme', () => {
    const failures = THEMES.flatMap((theme) =>
      (['light', 'dark'] as const).flatMap((mode) =>
        Tones.flatMap((tone) =>
          (['background', 'card'] as const).flatMap((surface) => {
            const set = theme[mode] as Record<string, string>;
            const ratio = contrastRatioCss(set[`${tone}-soft-foreground`]!, set[surface]!);
            return ratio >= 4.5 ? [] : [`${theme.id}/${mode}: ${tone} on ${surface} = ${ratio.toFixed(2)}`];
          }),
        ),
      ),
    );
    expect(failures).toEqual([]);
  });
});
