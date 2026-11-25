import { readFileSync } from 'node:fs';
import { BaseSequencer, type TestSpecification } from 'vitest/node';

/*
 * Chromium on Linux cannot hand the pointer back (see `CoarsePointer.ts`): after the first touch-emulation call of
 * either kind a Playwright page reports `(hover: none)` and `(pointer: none)` until it closes, and every file that runs
 * on that page afterwards loses Tailwind's `hover:` variants. A browser project feeds its pages from one queue in
 * sorted order, so with the coarse-pointer files last, nothing but another coarse-pointer file runs after one.
 */
const CoarsePointerImport = /support\/CoarsePointer['"]/;

function usesCoarsePointer(specification: TestSpecification): boolean {
  const file = specification.moduleId;
  if (!/\.(browser|component)\.test\.ts$/.test(file)) return false;
  return CoarsePointerImport.test(readFileSync(file, 'utf8'));
}

/** Vitest's own order, with every file that imports `support/CoarsePointer` moved behind the rest. */
export class CoarseLastSequencer extends BaseSequencer {
  override async sort(files: TestSpecification[]): Promise<TestSpecification[]> {
    const sorted = await super.sort(files);
    const coarse = sorted.filter(usesCoarsePointer);
    return [...sorted.filter((specification) => !coarse.includes(specification)), ...coarse];
  }
}
