import path from 'node:path';

/** Resolve only names present in the inventory, even on case-insensitive hosts. */
export function resolveSourcePath(base, exactPaths) {
  return [base, base + '.ts', base + '.tsx', base + '.vue', path.join(base, 'index.ts')].find((candidate) =>
    exactPaths.has(candidate),
  );
}

/** Detect case-only renames that exist on disk but were never staged in Git. */
export function indexCaseMismatches(trackedPaths, sourceFiles) {
  const exactPaths = new Set(sourceFiles);
  const foldedPaths = new Set(sourceFiles.map((file) => file.toLowerCase()));
  return trackedPaths.filter((file) => !exactPaths.has(file) && foldedPaths.has(file.toLowerCase()));
}
