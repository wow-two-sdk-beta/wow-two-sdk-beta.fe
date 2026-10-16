import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/*
 * The props convention names every standalone boolean with `is*` / `has*` / `can*` / `show*` and forbids inventing
 * an unprefixed idiom. This guard reads each `*Props` interface and fails on a boolean member without the prefix,
 * unless it is a deprecated alias or one of the reviewed carve-outs below: a controlled model root, or a native
 * attribute / third-party prop the component forwards under its own spelling.
 */

const Root = fileURLToPath(new URL('../../../../src/', import.meta.url));
const Prefixed = /^(?:is|has|can|show|default)[A-Z]|^asChild$/u;
const BooleanMember = /^\s*(?:readonly\s+)?([a-zA-Z]\w*)\??\s*:\s*boolean\s*;/u;

/** Controlled state roots — the bare name is the `v-model` target, per the controlled-state rule. */
const ModelRoots = new Set(['open', 'modelValue', 'editing', 'sidebarOpen']);

/** Forwarded under the spelling of the element or library that receives them. */
const Forwarded: Readonly<Record<string, ReadonlyArray<string>>> = {
  'presentation/display/audioPlayer/AudioPlayer.vue': ['autoPlay', 'loop'],
  'presentation/display/videoPlayer/VideoPlayer.vue': ['autoPlay', 'loop', 'muted'],
  'presentation/forms/fileUploadPicker/FileUploadPicker.vue': ['multiple'],
  'router/adapters/vueRouter/appLink/AppLink.vue': ['replace', 'viewTransition'],
  'router/adapters/vueRouter/appNavLink/AppNavLink.vue': ['replace', 'viewTransition'],
  'query/adapters/tanstack/queryDevtools/QueryDevtools.vue': ['initialIsOpen'],
};

function sources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.(vue|ts)$/u.test(entry.name) ? [path] : [];
  });
}

/** Lists `file: member` for every unprefixed, non-deprecated boolean member of a `*Props` interface. */
function unprefixedMembers(): string[] {
  return sources(Root).flatMap((path) => {
    const file = relative(Root, path);
    const found: string[] = [];
    let props = false;
    let depth = 0;
    let previous = '';
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const opens = /^\s*(?:export\s+)?interface\s+\w+Props\b/u.test(line);
      if (opens && depth === 0) props = true;
      depth += (line.match(/\{/gu) ?? []).length - (line.match(/\}/gu) ?? []).length;
      const member = props && depth === 1 ? BooleanMember.exec(line)?.[1] : undefined;
      if (member && !Prefixed.test(member) && !previous.includes('@deprecated') && !ModelRoots.has(member)) {
        if (!(Forwarded[file] ?? []).includes(member)) found.push(`${file}: ${member}`);
      }
      if (depth <= 0) props = false;
      if (line.trim() !== '') previous = line;
    }
    return found;
  });
}

describe('boolean prop names', () => {
  it('prefixes every standalone boolean prop outside the reviewed carve-outs', () => {
    expect(unprefixedMembers()).toEqual([]);
  });

  it('keeps every forwarded carve-out present, so the list cannot rot', () => {
    for (const [file, members] of Object.entries(Forwarded)) {
      const text = readFileSync(join(Root, file), 'utf8');
      for (const member of members)
        expect(text, `${file}: ${member}`).toMatch(new RegExp(`readonly ${member}\\?: boolean;`, 'u'));
    }
  });
});
