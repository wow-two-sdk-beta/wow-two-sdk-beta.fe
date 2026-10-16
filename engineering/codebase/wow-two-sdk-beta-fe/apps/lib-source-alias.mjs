import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Resolves declared JavaScript entries to live source; caller overrides own stylesheet aliases.
 * @param {string} libRoot absolute package root
 * @param {{find: string|RegExp, replacement: string}[]} [extra]
 */
export function libSourceAliases(libRoot, extra = []) {
  const manifest = JSON.parse(readFileSync(path.join(libRoot, 'package.json'), 'utf8'));
  const aliases = Object.entries(manifest.exports).flatMap(([key, target]) => {
    if (typeof target !== 'object' || !target.import?.endsWith('.js')) return [];
    const source = target.import.replace(/^\.\/dist\//, 'src/').replace(/\.js$/, '.ts');
    const replacement = path.resolve(libRoot, source);
    if (!existsSync(replacement)) throw new Error(`Public export has no source: ${key} -> ${source}`);
    const specifier = manifest.name + (key === '.' ? '' : key.slice(1));
    const escaped = specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return [{ find: new RegExp(`^${escaped}$`), replacement }];
  });
  return [...extra, ...aliases];
}
