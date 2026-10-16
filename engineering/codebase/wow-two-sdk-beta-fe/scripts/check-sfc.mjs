/**
 * SFC compile gate.
 *
 * `vue-tsc --noEmit` type-checks an SFC but does NOT prove it compiles. `@vue/compiler-sfc`
 * resolves `defineProps<T>()` into runtime props with its own type resolver, and that resolver
 * is far narrower than TypeScript's: a prop type derived from a helper generic —
 * `VariantProps<typeof stackVariants>` from `tailwind-variants`, for instance — is opaque to it
 * and throws `Failed to resolve extends base type` at build time while `vue-tsc` stays green.
 *
 * A package that passes typecheck and lint can therefore still fail `vite build`. This script
 * closes that gap by running the real `compileScript` over every SFC, with cross-file type
 * resolution enabled so imported prop interfaces are followed the same way the build follows
 * them. It is wired into `pnpm typecheck` so every lane hits it without changing its command.
 *
 * The fix when it fires is always the same: spell the prop type out as a literal union and lock
 * it against the variants config with an `AssertExact` check, so the union cannot drift.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, compileScript } from 'vue/compiler-sfc';

const root = fileURLToPath(new URL('..', import.meta.url));
const srcDir = join(root, 'src');

/* `compileScript`'s type resolver reads sibling modules through this shim rather than the
   compiler's own cache, which is what makes imported prop interfaces resolvable here. */
/* The resolver probes extensionless specifiers, so a path can name a directory — guard on
   `isFile()` or the read throws EISDIR and reports as a bogus compile failure. */
const isFile = (file) => existsSync(file) && statSync(file).isFile();

const fs = {
  fileExists: (file) => isFile(file),
  readFile: (file) => (isFile(file) ? readFileSync(file, 'utf8') : undefined),
  realpath: (file) => file,
};

function collect(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collect(full, out);
    else if (entry.endsWith('.vue')) out.push(full);
  }
  return out;
}

if (!existsSync(srcDir)) {
  console.log('check-sfc: no src/ yet — nothing to compile.');
  process.exit(0);
}

const files = collect(srcDir);
const failures = [];

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  try {
    const { descriptor, errors } = parse(source, { filename: file });
    if (errors.length) throw new Error(errors.map((e) => e.message).join('; '));
    if (!descriptor.script && !descriptor.scriptSetup) continue;
    compileScript(descriptor, { id: file, fs });
  } catch (error) {
    failures.push({ file: relative(root, file), message: error.message });
  }
}

if (failures.length) {
  console.error(`\ncheck-sfc: ${failures.length} of ${files.length} SFCs failed to compile.\n`);
  for (const { file, message } of failures) console.error(`  ${file}\n    ${message}\n`);
  process.exit(1);
}

console.log(`check-sfc: ${files.length} SFCs compile.`);
