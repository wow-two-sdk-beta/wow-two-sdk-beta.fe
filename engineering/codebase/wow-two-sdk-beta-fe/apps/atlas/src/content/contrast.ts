import {
  contrastPairRatio,
  contrastPairs,
  type ContrastPair,
  type Theme,
} from '@wow-two-beta/ui-vue/foundation/themes';

/** One evaluated foreground↔surface pair. */
export interface PairResult {
  readonly label: string;
  readonly ratio: number;
  readonly min: number;
  readonly isPassing: boolean;
}

/** One mode's contrast report: every pair, the failures and the pairs closest to their threshold. */
export interface ModeReport {
  readonly mode: 'light' | 'dark';
  readonly pairs: ReadonlyArray<PairResult>;
  readonly failures: ReadonlyArray<PairResult>;
  readonly tightest: ReadonlyArray<PairResult>;
}

function pairLabel(pair: ContrastPair): string {
  const surface =
    pair.opacity === undefined ? pair.bg : `${pair.bg} ${Math.round(pair.opacity * 100)}% over ${pair.over}`;
  return `${pair.fg} on ${surface}`;
}

/** Scores every validator pair for one mode, with the same composite math the engine gates on. */
export function contrastReport(theme: Theme, mode: 'light' | 'dark', tightestCount = 6): ModeReport {
  const set = theme[mode];
  const pairs = contrastPairs().map((pair) => {
    const ratio = contrastPairRatio(set, pair);
    return { label: pairLabel(pair), ratio, min: pair.min, isPassing: Number.isFinite(ratio) && ratio >= pair.min };
  });
  const tightest = [...pairs].sort((a, b) => a.ratio / a.min - b.ratio / b.min).slice(0, tightestCount);
  return { mode, pairs, failures: pairs.filter((pair) => !pair.isPassing), tightest };
}
