import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/*
 * A template that opens with a comment renders a fragment in development builds — production strips comments —
 * and Vue cannot fall attributes through onto a fragment. Such a component must bind its attributes itself
 * (`inheritAttrs: false` plus `v-bind`), or a consumer's `class` and listeners vanish in development only.
 */

const Root = fileURLToPath(new URL('../../../../src/', import.meta.url));

function sfcs(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sfcs(path);
    return entry.name.endsWith('.vue') ? [path] : [];
  });
}

describe('comment-led templates', () => {
  it('bind their own attributes, since a fragment root cannot inherit them', () => {
    const offenders = sfcs(Root).flatMap((path) => {
      const source = readFileSync(path, 'utf8');
      const opensWithComment = /<template>\s*<!--/u.test(source);
      return opensWithComment && !source.includes('inheritAttrs: false') ? [relative(Root, path)] : [];
    });
    expect(offenders).toEqual([]);
  });
});
