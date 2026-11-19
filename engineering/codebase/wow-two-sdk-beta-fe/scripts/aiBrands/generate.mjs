/**
 * AI brand mark generator.
 *
 * Reads `@lobehub/icons-static-svg` (a devDependency, MIT) as DATA and writes
 * `src/domain/aiBrands/AiBrandMarkData.ts`: per brand, the inner markup and viewBox of its color and mono mark.
 * Nothing from the package is imported or executed; its SVG files are parsed here, checked against an allow-list of
 * tags and attributes, and re-serialized, so no script, style, external reference or event handler can reach the
 * bundle. Gradient ids are rewritten to a per-instance token the component replaces at mount.
 *
 *   node scripts/aiBrands/generate.mjs           (from the package directory) writes the data file
 *   node scripts/aiBrands/generate.mjs --check   exits 1 when the committed file differs from the source package
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';

const root = fileURLToPath(new URL('../..', import.meta.url));
const outFile = join(root, 'src/domain/aiBrands/AiBrandMarkData.ts');

/** The placeholder the component replaces with a per-instance id; it prefixes every gradient id. */
export const ID_TOKEN = '@@ID@@';

/**
 * The brands the SDK ships, in display order. `source` is the file stem in the package when it differs from the id:
 * the package has no ChatGPT mark, so `chatgpt` carries the OpenAI one.
 */
export const BRANDS = [
  { id: 'claude' },
  { id: 'anthropic' },
  { id: 'openai' },
  { id: 'chatgpt', source: 'openai' },
  { id: 'gemini' },
  { id: 'google' },
  { id: 'meta' },
  { id: 'mistral' },
  { id: 'deepseek' },
  { id: 'qwen' },
  { id: 'grok' },
  { id: 'xai' },
  { id: 'groq' },
  { id: 'ollama' },
  { id: 'openrouter' },
  { id: 'cohere' },
  { id: 'perplexity' },
  { id: 'azure' },
];

const ELEMENTS = new Set([
  'g',
  'defs',
  'path',
  'circle',
  'ellipse',
  'rect',
  'line',
  'polyline',
  'polygon',
  'linearGradient',
  'radialGradient',
  'stop',
  'clipPath',
]);

const ATTRIBUTES = new Set([
  'id',
  'd',
  'fill',
  'fill-rule',
  'fill-opacity',
  'clip-rule',
  'clip-path',
  'opacity',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-opacity',
  'transform',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'x',
  'y',
  'x1',
  'x2',
  'y1',
  'y2',
  'width',
  'height',
  'points',
  'offset',
  'stop-color',
  'stop-opacity',
  'gradientUnits',
  'gradientTransform',
]);

/** The root attributes the package ships; anything else is refused so a new one is looked at, not dropped. */
const ROOT_ATTRIBUTES = new Set(['fill', 'fill-rule', 'clip-rule', 'height', 'width', 'style', 'viewBox', 'xmlns']);
const ROOT_STYLE = 'flex:none;line-height:1';

/** A reference to one of the mark's own rewritten ids. */
const LOCAL_URL = new RegExp(`url\\(#${ID_TOKEN}-\\d+\\)`, 'g');

const TAG = /<(\/?)([A-Za-z][\w:-]*)((?:\s+[^\s=/>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*)\s*(\/?)>|([^<]+)/gy;
const ATTRIBUTE = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g;

function fail(label, message) {
  throw new Error(`${label}: ${message}`);
}

/** Parses one SVG file into `{ name, attrs, children }`; refuses comments, doctypes, entities and stray text. */
export function parseSvg(source, label) {
  if (/<!|<\?/.test(source)) fail(label, 'comments, doctypes and processing instructions are not allowed');
  const stack = [{ name: '#document', attrs: {}, children: [] }];
  TAG.lastIndex = 0;
  let consumed = 0;
  for (let match = TAG.exec(source); match !== null; match = TAG.exec(source)) {
    consumed = TAG.lastIndex;
    const [, closing, name, rawAttrs, selfClosing, text] = match;
    if (text !== undefined) {
      // Only `<title>` holds text, and it is dropped before serializing.
      if (text.trim() !== '' && stack.at(-1).name !== 'title') {
        fail(label, `text content is not allowed: ${JSON.stringify(text.trim().slice(0, 30))}`);
      }
      continue;
    }
    if (closing) {
      const open = stack.pop();
      if (open?.name !== name) fail(label, `mismatched closing tag </${name}>`);
      continue;
    }
    const attrs = {};
    for (const [, key, double, single] of rawAttrs.matchAll(ATTRIBUTE)) {
      const value = double ?? single;
      if (value === undefined) fail(label, `<${name}> attribute ${key} has no value`);
      if (key in attrs) fail(label, `<${name}> repeats attribute ${key}`);
      attrs[key] = value;
    }
    const node = { name, attrs, children: [] };
    stack.at(-1).children.push(node);
    if (!selfClosing) stack.push(node);
  }
  if (consumed !== source.length) fail(label, 'markup could not be parsed to its end');
  if (stack.length !== 1) fail(label, `unclosed <${stack.at(-1).name}>`);
  const [svg, ...extra] = stack[0].children;
  if (svg?.name !== 'svg' || extra.length > 0) fail(label, 'expected exactly one <svg> root');
  return svg;
}

const escapeAttribute = (value) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

/** Collects every `id` in document order, so references that precede their `<defs>` still resolve. */
function collectIds(node, ids = []) {
  if ('id' in node.attrs) ids.push(node.attrs.id);
  for (const child of node.children) collectIds(child, ids);
  return ids;
}

/**
 * Turns one parsed mark into `{ viewBox, markup }`: the root's own `fill-rule`/`clip-rule` move onto a wrapping `<g>`,
 * the root `fill="currentColor"` is left to the component, `<title>` is dropped, and every gradient id becomes
 * `${ID_TOKEN}-n`. `mono` marks must carry no color of their own, or `currentColor` would not recolor them.
 */
export function buildMark(svg, label, { mono }) {
  for (const [key, value] of Object.entries(svg.attrs)) {
    if (!ROOT_ATTRIBUTES.has(key)) fail(label, `unexpected <svg> attribute ${key}`);
    if (key === 'style' && value !== ROOT_STYLE) fail(label, `unexpected <svg> style ${JSON.stringify(value)}`);
    if (key === 'fill' && value !== 'currentColor') fail(label, `unexpected <svg> fill ${JSON.stringify(value)}`);
  }
  const viewBox = svg.attrs.viewBox;
  if (!/^-?\d+(\.\d+)?( -?\d+(\.\d+)?){3}$/.test(viewBox ?? '')) fail(label, `unexpected viewBox ${viewBox}`);

  const idMap = new Map(collectIds(svg).map((id, index) => [id, `${ID_TOKEN}-${index}`]));
  const defined = new Set(idMap.keys());
  let colored = false;

  function serialize(node) {
    if (!ELEMENTS.has(node.name)) fail(label, `element <${node.name}> is not allowed`);
    const attrs = [];
    for (const [key, raw] of Object.entries(node.attrs)) {
      if (!ATTRIBUTES.has(key)) fail(label, `<${node.name}> attribute ${key} is not allowed`);
      if (/&|:\/\/|javascript:|expression\(|@import/i.test(raw)) fail(label, `${key} holds a forbidden value`);
      let value = raw;
      if (key === 'id') value = idMap.get(raw);
      else {
        value = raw.replace(/url\(\s*#([^)\s]+)\s*\)/g, (_, id) => {
          if (!defined.has(id)) fail(label, `${key} references an undefined id ${id}`);
          return `url(#${idMap.get(id)})`;
        });
        if (/url\(/.test(value.replaceAll(LOCAL_URL, ''))) fail(label, `${key} holds a non-local url()`);
      }
      if (/^(fill|stroke|stop-color)$/.test(key) && !/^(none|currentColor)$/.test(value)) colored = true;
      attrs.push(` ${key}="${escapeAttribute(value)}"`);
    }
    const open = `<${node.name}${attrs.join('')}`;
    if (node.children.length === 0) return `${open}/>`;
    return `${open}>${node.children.map(serialize).join('')}</${node.name}>`;
  }

  const inner = svg.children
    .filter((child) => child.name !== 'title')
    .map(serialize)
    .join('');
  if (inner === '') fail(label, 'no drawable content');
  if (mono && colored) fail(label, 'a mono mark carries its own color, so currentColor would not recolor it');

  const rule = ['fill-rule', 'clip-rule'].filter((key) => key in svg.attrs).map((key) => ` ${key}="${svg.attrs[key]}"`);
  return { viewBox, markup: rule.length > 0 ? `<g${rule.join('')}>${inner}</g>` : inner };
}

/** Reads the package as data: its manifest for the version and licence, its SVG files for the marks. */
export function readSource() {
  const manifestPath = createRequire(import.meta.url).resolve('@lobehub/icons-static-svg/package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.license !== 'MIT') throw new Error(`@lobehub/icons-static-svg is ${manifest.license}, expected MIT`);
  return { manifest, iconsDir: join(dirname(manifestPath), 'icons') };
}

/** Builds the data for every brand; a brand with no `-color` file keeps `color: null` and renders its mono mark. */
export function buildEntries(iconsDir) {
  const read = (stem, suffix) => {
    const file = join(iconsDir, `${stem}${suffix}.svg`);
    return existsSync(file) ? { file, source: readFileSync(file, 'utf8') } : null;
  };
  return BRANDS.map(({ id, source = id }) => {
    const mono = read(source, '');
    if (mono === null) throw new Error(`${id}: icons/${source}.svg is missing from the package`);
    const color = read(source, '-color');
    return {
      id,
      source,
      color: color && buildMark(parseSvg(color.source, `${source}-color.svg`), `${source}-color.svg`, { mono: false }),
      mono: buildMark(parseSvg(mono.source, `${source}.svg`), `${source}.svg`, { mono: true }),
    };
  });
}

function art(value) {
  return `{ viewBox: ${JSON.stringify(value.viewBox)}, markup: ${JSON.stringify(value.markup)} }`;
}

/** Wraps paragraphs into `// ` comment lines of at most `width` columns, a bare `//` between paragraphs. */
function commentBlock(paragraphs, width = 118) {
  return paragraphs
    .map((paragraph) => {
      const lines = [];
      let line = '//';
      for (const word of paragraph.split(' ')) {
        if (line.length + 1 + word.length > width && line !== '//') {
          lines.push(line);
          line = '//';
        }
        line += ` ${word}`;
      }
      return [...lines, line].join('\n');
    })
    .join('\n//\n');
}

export function renderModule(manifest, entries) {
  const lines = entries.map(
    (entry) => `  ${entry.id}: { color: ${entry.color ? art(entry.color) : 'null'}, mono: ${art(entry.mono)} },`,
  );
  const withoutColor = entries.filter((entry) => entry.color === null).map((entry) => entry.id);
  const aliased = entries.filter((entry) => entry.source !== entry.id).map((e) => `${e.id} (from ${e.source})`);
  const header = commentBlock([
    'GENERATED — do not edit by hand. Regenerate with `node scripts/aiBrands/generate.mjs` from the package directory.',
    `Source: ${manifest.name} ${manifest.version}, ${manifest.license} licence — Copyright © 2023 LobeHub ` +
      `(${manifest.homepage}). The generator reads it as data from a devDependency that never ships.`,
    'Per brand: `icons/{id}.svg` (mono) and `icons/{id}-color.svg` (color). Markup is re-serialized from an ' +
      'allow-list of tags and attributes; `<title>` and the root inline style are dropped, and every gradient id ' +
      `carries the \`${ID_TOKEN}\` token that \`AiBrandMark\` replaces with an id unique to the mounted instance.`,
    `No color file in the package, so the color variant draws the mono mark: ${withoutColor.join(', ')}.`,
    `No mark of its own in the package, so it carries another brand's: ${aliased.join(', ')}.`,
    'The marks are trademarks of their owners; the licence covers the vector files, not the brands.',
  ]);
  return `${header}
import type { AiBrand, AiBrandMarkEntry } from './AiBrands';

/** The placeholder inside gradient ids that \`AiBrandMark\` replaces with an id unique to the mounted instance. */
export const aiBrandIdToken = ${JSON.stringify(ID_TOKEN)};

/** Every brand's inner markup and viewBox, keyed by brand id. */
export const aiBrandMarkData: Readonly<Record<AiBrand, AiBrandMarkEntry>> = {
${lines.join('\n')}
};
`;
}

async function main() {
  const { manifest, iconsDir } = readSource();
  const entries = buildEntries(iconsDir);
  const config = (await resolveConfig(outFile)) ?? {};
  const output = await format(renderModule(manifest, entries), { ...config, filepath: outFile });

  if (process.argv.includes('--check')) {
    const current = existsSync(outFile) ? readFileSync(outFile, 'utf8') : '';
    if (current !== output) {
      console.error(`aiBrands: ${relative(root, outFile)} differs from ${manifest.name} ${manifest.version}.`);
      process.exit(1);
    }
    console.log(`aiBrands: ${relative(root, outFile)} matches ${manifest.name} ${manifest.version}.`);
    return;
  }

  writeFileSync(outFile, output);
  for (const entry of entries) {
    const sizes = `color ${entry.color ? `${entry.color.markup.length} B` : '— (mono fallback)'} · mono ${entry.mono.markup.length} B`;
    console.log(`  ${entry.id.padEnd(11)} ${sizes}${entry.source === entry.id ? '' : ` · from ${entry.source}`}`);
  }
  console.log(`aiBrands: wrote ${relative(root, outFile)} (${manifest.name} ${manifest.version}).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
