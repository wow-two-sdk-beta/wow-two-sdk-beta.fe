import { AiBrandMark } from '@src/domain/aiBrands';
import { smokeCase, type SmokeCase } from '../../../support/Smoke';

/** `domain/aiBrands` — the one SFC: a drawn mark with a gradient, a mono mark, a resolved one and the neutral chip. */
export const aiBrandsCases: readonly SmokeCase[] = [
  smokeCase('AiBrandMark (color, gradient)', AiBrandMark, { brand: 'gemini' }),
  smokeCase('AiBrandMark (mono)', AiBrandMark, { brand: 'claude', variant: 'mono', size: 32 }),
  smokeCase('AiBrandMark (resolved)', AiBrandMark, {
    provider: 'openai',
    model: 'gpt-4.1-mini',
    label: 'GPT-4.1 mini',
  }),
  smokeCase('AiBrandMark (unknown chip)', AiBrandMark, { provider: 'acme' }),
];
