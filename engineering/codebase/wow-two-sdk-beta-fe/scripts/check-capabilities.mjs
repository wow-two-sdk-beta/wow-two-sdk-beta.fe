import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { resolveSourcePath, indexCaseMismatches } from './source-paths.mjs';

// The nonvisual capability gate includes type imports: contracts must remain acyclic too.
// Forms and presentation have separate sweep owners. Pass --all to include their capability nodes.
const root = fileURLToPath(new URL('../src/', import.meta.url));
const excluded = new Set(process.argv.includes('--all') ? [] : ['presentation', 'formsEngine']);
const graph = new Map();
const edges = [];
const unresolved = [];

function capability(file) {
  const parts = path.relative(root, file).split(path.sep);
  return ['foundation', 'domain'].includes(parts[0]) ? parts.slice(0, 2).join('/') : parts[0];
}

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files(file) : /\.(?:ts|tsx|vue)$/.test(file) ? [file] : [];
  });
}

const sourceFiles = files(root);
const exactPaths = new Set(sourceFiles);
const trackedPaths = execFileSync('git', ['ls-files', '-z', '--', 'src'], {
  cwd: path.dirname(root.slice(0, -1)),
  encoding: 'utf8',
})
  .split('\0')
  .filter(Boolean)
  .map((file) => path.resolve(root, '..', file));
const indexCasing = indexCaseMismatches(trackedPaths, sourceFiles);

function reference(file, specifier) {
  if (!specifier.startsWith('.') && !specifier.startsWith('@src/')) return;
  const base = specifier.startsWith('@src/')
    ? path.join(root, specifier.slice(5))
    : path.resolve(path.dirname(file), specifier);
  const target = resolveSourcePath(base, exactPaths);
  if (!target) {
    unresolved.push({ file: path.relative(root, file), specifier });
    return;
  }
  const from = capability(file);
  const to = capability(target);
  if (from !== to && target.startsWith(root)) {
    graph.get(from).add(to);
    edges.push({ from, to, file: path.relative(root, file), specifier });
  }
}

for (const file of sourceFiles) {
  const owner = capability(file);
  if (excluded.has(owner)) continue;
  if (!graph.has(owner)) graph.set(owner, new Set());
  let source = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.vue')) {
    source = [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1]).join('\n');
  }
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      reference(file, node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      reference(file, node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
}

function reachable(start) {
  const visited = new Set();
  const pending = [start];
  while (pending.length) {
    for (const next of graph.get(pending.pop()) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        pending.push(next);
      }
    }
  }
  return visited;
}

const reachability = new Map([...graph.keys()].map((node) => [node, reachable(node)]));
const grouped = new Set();
const cycles = [];
for (const node of graph.keys()) {
  if (grouped.has(node)) continue;
  const component = [...graph.keys()].filter(
    (other) => other !== node && reachability.get(node).has(other) && reachability.get(other).has(node),
  );
  if (component.length) {
    component.push(node);
    component.sort();
    component.forEach((member) => grouped.add(member));
    cycles.push(component);
  }
}
console.log(
  JSON.stringify(
    {
      capabilities: graph.size,
      crossCapabilityReferences: edges.length,
      cycles,
      unresolved,
      indexCaseMismatches: indexCasing,
    },
    null,
    2,
  ),
);
if (cycles.length || unresolved.length || indexCasing.length) process.exitCode = 1;
