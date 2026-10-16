import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/*
 * Mechanical rename sweeps (`open` → `isOpen`, `Code` → `CodeText`, `Select` → `SelectPicker`) have reached text
 * they were never meant to touch: state selectors that no element ever matches, and labels a reader sees or hears.
 * These patterns only ever come from that accident.
 */

const Root = fileURLToPath(new URL('../../../../src/', import.meta.url));

const Damage: ReadonlyArray<[string, RegExp]> = [
  // A state value is a DOM attribute value (`open`, `checked`), never a prop name.
  ['is-prefixed state selector', /(?:data|aria)-\[[a-z-]+=is[A-Z]\w*\]/u],
  ['doubled is-prefix', /\bis-is[A-Z]|\bisIs[A-Z]/u],
  // Component names inside quoted human text.
  [
    'component name in a label',
    /'(?:[^'\n]*\s)?(?:SelectPicker|InlineLayout|CodeText|QuoteText|LinkItem|ListGroup|StackLayout)\s[a-z][^'\n]*'|(?:label|title|placeholder): '(?:LinkItem|ListGroup)'/u,
  ],
];

function sources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.(vue|ts)$/u.test(entry.name) ? [path] : [];
  });
}

describe('rename sweeps', () => {
  it('left no damage in selectors or reader-facing text', () => {
    const findings = sources(Root).flatMap((path) => {
      const lines = readFileSync(path, 'utf8').split('\n');
      return lines.flatMap((line, index) =>
        Damage.filter(([, pattern]) => pattern.test(line)).map(
          ([kind]) => `${relative(Root, path)}:${index + 1} ${kind}: ${line.trim()}`,
        ),
      );
    });
    expect(findings).toEqual([]);
  });
});
