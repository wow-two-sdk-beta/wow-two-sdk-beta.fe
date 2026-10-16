import { execFileSync } from 'node:child_process';
import {
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { build } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scratch = mkdtempSync(join(tmpdir(), 'ui-vue-package-'));
let installed;
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

function run(command, args, cwd = scratch) {
  return execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function linkDependency(name) {
  const target = join(scratch, 'node_modules', name);
  if (existsSync(target)) return;
  mkdirSync(dirname(target), { recursive: true });
  symlinkSync(realpathSync(join(root, 'node_modules', name)), target, 'dir');
}

// Only these public adapters may require optional peers.
const adapters = {
  './router': ['vue-router'],
  './query': ['@tanstack/vue-query'],
  './query/testing': ['@tanstack/vue-query', '@vue/test-utils'],
  './forms-engine/tanstack': ['@tanstack/vue-form'],
};

try {
  const packed = JSON.parse(
    run(
      'npm',
      ['pack', '--json', '--ignore-scripts', '--cache', join(scratch, 'cache'), '--pack-destination', scratch],
      root,
    ),
  )[0];
  const modules = join(scratch, 'node_modules');
  const packageRoot = join(modules, manifest.name);
  mkdirSync(packageRoot, { recursive: true });
  run('tar', ['-xzf', join(scratch, packed.filename), '--strip-components=1', '-C', packageRoot]);

  for (const file of packed.files) {
    if (!file.path.startsWith('dist/') && !['package.json', 'README.md', 'LICENSE'].includes(file.path)) {
      throw new Error(`Unexpected published file: ${file.path}`);
    }
  }

  const published = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
  function verifyTarget(target) {
    if (typeof target === 'string') {
      if (!target.startsWith('./') || !existsSync(join(packageRoot, target))) {
        throw new Error(`Missing packed export: ${target}`);
      }
    } else {
      for (const value of Object.values(target)) verifyTarget(value);
    }
  }
  for (const target of Object.values(published.exports)) verifyTarget(target);

  const optional = published.peerDependenciesMeta ?? {};
  for (const name of Object.keys(published.dependencies ?? {})) linkDependency(name);
  for (const name of Object.keys(published.peerDependencies ?? {})) {
    if (!optional[name]?.optional) linkDependency(name);
  }

  const entries = Object.entries(published.exports).filter(([, value]) => typeof value === 'object' && value.import);
  const specifier = (key) => published.name + (key === '.' ? '' : key.slice(1));
  const importEntries = (keys, cwd = scratch) =>
    run(
      process.execPath,
      ['--input-type=module', '-e', keys.map((key) => `await import(${JSON.stringify(specifier(key))});`).join('\n')],
      cwd,
    );
  const core = entries.map(([key]) => key).filter((key) => !adapters[key]);
  importEntries(core);

  // Exercise numeric values from the actual archive, with no source aliases or development transforms.
  run(process.execPath, [
    '--input-type=module',
    '-e',
    `
    import { ExactNumber } from '${published.name}/foundation/numbers';
    import { LosslessJson } from '${published.name}/foundation/json';
    const parsed = LosslessJson.parse('{"id":9223372036854775807,"amount":0.1}');
    const increment = ExactNumber.parse('0.2');
    if (!parsed.ok || !increment.ok) throw new Error('Packed numeric parse failed');
    const sum = parsed.value.amount.add(increment.value);
    if (!sum.ok || sum.value.toString() !== '0.3') throw new Error('Packed exact arithmetic failed');
    const encoded = LosslessJson.stringify({ id: parsed.value.id, amount: sum.value });
    if (!encoded.ok || encoded.value !== '{"id":9223372036854775807,"amount":0.3}')
      throw new Error('Packed numeric wire round trip failed');
  `,
  ]);

  // Compile through package exports without optional peers or source aliases.
  const typecheck = (keys, cwd = scratch) => {
    writeFileSync(
      join(cwd, 'consumer.mts'),
      keys
        .map((key, index) => `import * as Entry${index} from ${JSON.stringify(specifier(key))};\nvoid Entry${index};`)
        .join('\n'),
    );
    writeFileSync(
      join(cwd, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          noEmit: true,
          module: 'ESNext',
          moduleResolution: 'Bundler',
          target: 'ES2022',
          lib: ['ES2022', 'DOM', 'DOM.Iterable'],
          types: [],
          skipLibCheck: false,
        },
        files: ['consumer.mts'],
      }),
    );
    run(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '-p', join(cwd, 'tsconfig.json')], cwd);
  };

  // Compile actual templates against packed declarations: TS-only import probes miss generic slot regressions.
  const templateCheck = (cwd = scratch) => {
    for (const fixture of ['consumer.vue', 'consumer-invalid.vue']) {
      copyFileSync(join(root, 'scripts/fixtures', fixture), join(cwd, fixture));
    }
    const config = (file) =>
      JSON.stringify({
        compilerOptions: {
          strict: true,
          noEmit: true,
          module: 'ESNext',
          moduleResolution: 'Bundler',
          target: 'ES2022',
          lib: ['ES2022', 'DOM', 'DOM.Iterable'],
          types: [],
          skipLibCheck: false,
        },
        vueCompilerOptions: { strictTemplates: true },
        files: [file],
      });
    const command = [join(root, 'node_modules/vue-tsc/bin/vue-tsc.js'), '-p', join(cwd, 'tsconfig-template.json')];
    writeFileSync(join(cwd, 'tsconfig-template.json'), config('consumer.vue'));
    run(process.execPath, command, cwd);
    writeFileSync(join(cwd, 'tsconfig-template.json'), config('consumer-invalid.vue'));
    let diagnostics = '';
    try {
      run(process.execPath, command, cwd);
    } catch (error) {
      diagnostics = String(error.stdout ?? '') + String(error.stderr ?? '');
    }
    if (
      !diagnostics.includes('TS2322') ||
      !diagnostics.includes("Property 'toFixed' does not exist on type 'string'")
    ) {
      throw new Error(`Packed Vue templates lost model or field-slot type safety:\n${diagnostics}`);
    }
  };
  typecheck(core);
  templateCheck();

  for (const [key, peers] of Object.entries(adapters)) {
    for (const peer of peers) {
      if (!published.peerDependencies?.[peer] || !optional[peer]?.optional) {
        throw new Error(`Adapter peer must be declared optional: ${key} -> ${peer}`);
      }
      linkDependency(peer);
    }
    importEntries([key]);
    typecheck([key]);
    // These entries are directory symlinks; unlink the fixture without following its target.
    for (const peer of peers) unlinkSync(join(modules, peer));
  }
  for (const peers of Object.values(adapters)) for (const peer of peers) linkDependency(peer);
  typecheck(entries.map(([key]) => key));

  // A consumer's own sources contain no SDK utility tokens. The shipped CSS must register its package sources.
  linkDependency('tailwindcss');
  writeFileSync(
    join(scratch, 'main.ts'),
    `import { Button } from '${published.name}/presentation/actions';\n` +
      `import '${published.name}/styles.css';\nexport { Button };\n`,
  );
  const bundles = await build({
    root: scratch,
    configFile: false,
    logLevel: 'silent',
    plugins: [tailwindcss()],
    build: {
      write: false,
      minify: false,
      cssMinify: false,
      lib: { entry: join(scratch, 'main.ts'), formats: ['es'], cssFileName: 'consumer' },
    },
  });
  const css = (Array.isArray(bundles) ? bundles : [bundles])
    .flatMap((bundle) => bundle.output)
    .filter((item) => item.type === 'asset' && item.fileName.endsWith('.css'))
    .map((item) => String(item.source))
    .join('\n');
  for (const token of ['.h-9', 'outline-hidden', 'forced-colors: active', '--color-primary']) {
    if (!css.includes(token)) throw new Error(`Packed consumer CSS omits SDK styling: ${token}`);
  }
  console.log('check-package: production consumer bundles packed JavaScript and generates SDK utility CSS.');

  // A component-only consumer can scan PointControl without pulling the package-wide utility surface.
  writeFileSync(
    join(scratch, 'point-control.css'),
    `@import 'tailwindcss' source(none);\n` +
      `@import '${published.name}/presentation/forms/point-control/styles.css';\n` +
      `@theme { --color-border: #ccc; --color-ring: #000; --color-primary: #000; }\n`,
  );
  writeFileSync(join(scratch, 'point-control.ts'), `import './point-control.css';\n`);
  const pointBundles = await build({
    root: scratch,
    configFile: false,
    logLevel: 'silent',
    plugins: [tailwindcss()],
    build: {
      write: false,
      minify: false,
      cssMinify: false,
      lib: { entry: join(scratch, 'point-control.ts'), formats: ['es'], cssFileName: 'point-control' },
    },
  });
  const pointCss = (Array.isArray(pointBundles) ? pointBundles : [pointBundles])
    .flatMap((bundle) => bundle.output)
    .filter((item) => item.type === 'asset' && item.fileName.endsWith('.css'))
    .map((item) => String(item.source))
    .join('\n');
  for (const token of ['.aspect-square', '.touch-none', '.bg-primary']) {
    if (!pointCss.includes(token)) throw new Error(`PointControl CSS omits component styling: ${token}`);
  }
  if (pointCss.includes('.h-9')) throw new Error('PointControl CSS scanned unrelated SDK controls.');
  console.log('check-package: PointControl public stylesheet scans only its compiled component chunk.');

  // A component-only toast consumer gets the host, card and countdown styling without the package-wide surface.
  writeFileSync(
    join(scratch, 'toast-host.css'),
    `@import 'tailwindcss' source(none);\n` +
      `@import '${published.name}/presentation/feedback/toast-host/styles.css';\n` +
      `@theme { --color-popover: #fff; --color-popover-foreground: #111; --color-border: #ccc; --color-primary: #000; ` +
      `--color-destructive-soft-foreground: #900; }\n`,
  );
  writeFileSync(join(scratch, 'toast-host.ts'), `import './toast-host.css';\n`);
  const toastBundles = await build({
    root: scratch,
    configFile: false,
    logLevel: 'silent',
    plugins: [tailwindcss()],
    build: {
      write: false,
      minify: false,
      cssMinify: false,
      lib: { entry: join(scratch, 'toast-host.ts'), formats: ['es'], cssFileName: 'toast-host' },
    },
  });
  const toastCss = (Array.isArray(toastBundles) ? toastBundles : [toastBundles])
    .flatMap((bundle) => bundle.output)
    .filter((item) => item.type === 'asset' && item.fileName.endsWith('.css'))
    .map((item) => String(item.source))
    .join('\n');
  for (const token of [
    '.w-80',
    '.bg-popover',
    '.z-toast',
    '.origin-left',
    '--animate-slide-in-right',
    '.stroke-primary',
    '.text-destructive-soft-foreground',
    '.min-h-6',
  ]) {
    if (!toastCss.includes(token)) throw new Error(`ToastHost CSS omits component styling: ${token}`);
  }
  if (toastCss.includes('.h-9')) throw new Error('ToastHost CSS scanned unrelated SDK controls.');
  console.log('check-package: ToastHost public stylesheet scans only its compiled toast chunks.');
  // JS-only production consumers; Vue is external, all other dependencies are included.
  // UI ceilings retain headroom while rejecting the previous duplicate class-merge engine.
  for (const [entry, symbol, maximumGzip] of [
    ['presentation/actions', 'Button', 24_000],
    ['presentation/display', 'Text', 18_000],
    ['presentation/display', 'Card', 19_500],
    ['foundation/http', 'createApiClient', 4_500],
    ['foundation/numbers', 'ExactNumber', 12_500],
  ]) {
    const file = join(scratch, `budget-${symbol}.mjs`);
    writeFileSync(file, `import { ${symbol} } from '${published.name}/${entry}'; globalThis.__sdkBudget = ${symbol};`);
    const result = await build({
      root: scratch,
      configFile: false,
      logLevel: 'silent',
      build: {
        write: false,
        minify: 'esbuild',
        rollupOptions: { input: file, external: ['vue'], output: { format: 'es' } },
      },
    });
    const code = (Array.isArray(result) ? result : [result])
      .flatMap((bundle) => bundle.output)
      .filter((item) => item.type === 'chunk')
      .map((item) => item.code)
      .join('');
    const size = gzipSync(code).length;
    if (size > maximumGzip) throw new Error(`${symbol} consumer exceeds gzip budget: ${size} > ${maximumGzip}`);
    console.log(`check-package: ${symbol} JS consumer ${size}/${maximumGzip} gzip bytes.`);
  }
  if (process.argv.includes('--install')) {
    // Separate root prevents Node/TypeScript resolving through the linked fixture's ancestor node_modules.
    installed = mkdtempSync(join(tmpdir(), 'ui-vue-installed-'));
    const dependencies = { [published.name]: `file:${join(scratch, packed.filename)}` };
    for (const peer of Object.keys(published.peerDependencies ?? {})) {
      dependencies[peer] = JSON.parse(readFileSync(join(root, 'node_modules', peer, 'package.json'), 'utf8')).version;
    }
    writeFileSync(join(installed, 'package.json'), JSON.stringify({ private: true, type: 'module', dependencies }));
    run(
      'npm',
      [
        'install',
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
        '--package-lock=false',
        '--cache',
        join(scratch, 'cache'),
      ],
      installed,
    );
    importEntries(
      entries.map(([key]) => key),
      installed,
    );
    typecheck(
      entries.map(([key]) => key),
      installed,
    );
    templateCheck(installed);
    console.log('check-package: clean npm tarball install passes without workspace dependency links.');
  }
  console.log(
    `check-package: ${Object.keys(published.exports).length} packed exports exist; ` +
      `${core.length} entries import/typecheck without optional peers; all ${entries.length} entries pass with adapters.`,
  );
  const outputIndex = process.argv.indexOf('--output');
  if (outputIndex !== -1) {
    const output = process.argv[outputIndex + 1];
    if (!output) throw new Error('--output requires a tarball path');
    const archive = join(scratch, packed.filename);
    copyFileSync(archive, resolve(output), constants.COPYFILE_EXCL);
    const integrity = createHash('sha512').update(readFileSync(archive)).digest('base64');
    console.log(`check-package: verified ${published.name}@${published.version}; sha512-${integrity}`);
  }
} catch (error) {
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  throw error;
} finally {
  if (installed) rmSync(installed, { recursive: true, force: true });
  rmSync(scratch, { recursive: true, force: true });
}
