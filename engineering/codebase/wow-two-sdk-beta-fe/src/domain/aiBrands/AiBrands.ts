/**
 * The AI brands that have a mark. A literal union rather than a const-object enum: `AiBrandMark` takes it as a prop
 * type, and the SFC compiler resolves a literal union but not a `(typeof X)[keyof typeof X]` alias.
 */
export type AiBrand =
  | 'claude'
  | 'anthropic'
  | 'openai'
  | 'chatgpt'
  | 'gemini'
  | 'google'
  | 'meta'
  | 'mistral'
  | 'deepseek'
  | 'qwen'
  | 'grok'
  | 'xai'
  | 'groq'
  | 'ollama'
  | 'openrouter'
  | 'cohere'
  | 'perplexity'
  | 'azure';

/** Every brand id, in display order. */
export const AiBrandIds: ReadonlyArray<AiBrand> = Object.freeze([
  'claude',
  'anthropic',
  'openai',
  'chatgpt',
  'gemini',
  'google',
  'meta',
  'mistral',
  'deepseek',
  'qwen',
  'grok',
  'xai',
  'groq',
  'ollama',
  'openrouter',
  'cohere',
  'perplexity',
  'azure',
] as const satisfies ReadonlyArray<AiBrand>);

/** The brand's display name, as its owner writes it. */
export const AiBrandNames: Readonly<Record<AiBrand, string>> = Object.freeze({
  claude: 'Claude',
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
  google: 'Google',
  meta: 'Meta',
  mistral: 'Mistral',
  deepseek: 'DeepSeek',
  qwen: 'Qwen',
  grok: 'Grok',
  xai: 'xAI',
  groq: 'Groq',
  ollama: 'Ollama',
  openrouter: 'OpenRouter',
  cohere: 'Cohere',
  perplexity: 'Perplexity',
  azure: 'Azure',
});

/** One drawn variant of a mark: the SVG's viewBox and its inner markup. */
export interface AiBrandMarkArt {
  /** The `viewBox` of the mark. */
  readonly viewBox: string;

  /** The inner SVG markup; gradient ids carry the `aiBrandIdToken` placeholder. */
  readonly markup: string;
}

/** One brand's marks. */
export interface AiBrandMarkEntry {
  /** The full-color mark, or `null` where the source has none — the color variant then draws `mono`. */
  readonly color: AiBrandMarkArt | null;

  /** The single-color mark; it paints with `currentColor`. */
  readonly mono: AiBrandMarkArt;
}

/** What names a model: the operator's provider key and the model id, either of which may be missing. */
export interface AiBrandSource {
  /** The operator's provider key (`anthropic`, `openai`, `groq`…). */
  readonly provider?: string | null;

  /** The model id (`claude-haiku-5-5`, `gpt-4.1-mini`, `anthropic/claude-sonnet-4`…). */
  readonly model?: string | null;
}

/**
 * Lowercases a model id and strips the routing around it: a gateway path (`anthropic/claude-3.5-sonnet`,
 * `models/gemini-2.5-flash`) keeps its last segment, and a Bedrock id (`us.anthropic.claude-3-5-sonnet…`) loses its
 * region and vendor prefix.
 */
function normalizeModel(model: string): string {
  const id = model.trim().toLowerCase();
  return id
    .slice(id.lastIndexOf('/') + 1)
    .replace(/^(?:[a-z]{2,6}\.)?(?:anthropic|meta|mistral|cohere|deepseek|amazon|ai21)\./, '');
}

/** A family is the model id's leading word, so `gptq-int4` or `ollama-x` never match `gpt` or `llama`. */
const ModelFamilies: ReadonlyArray<readonly [RegExp, AiBrand]> = [
  [/^claude(?:$|[-._\d])/, 'claude'],
  [/^gemini(?:$|[-._\d])/, 'gemini'],
  [/^(?:gpt|chatgpt)(?:$|[-._\d])/, 'openai'],
  [/^o[134](?:$|-)/, 'openai'],
  [/^llama(?:$|[-._\d])/, 'meta'],
  [/^(?:mistral|mixtral|codestral)(?:$|[-._\d])/, 'mistral'],
  [/^deepseek(?:$|[-._\d])/, 'deepseek'],
  [/^qwen/, 'qwen'],
  [/^grok(?:$|[-._\d])/, 'grok'],
];

/** Provider keys by brand id, plus `vertex` (Google's hosted models). A `Map`, so `constructor` is not a key. */
const ProviderAliases: ReadonlyMap<string, AiBrand> = new Map<string, AiBrand>([
  ...AiBrandIds.map((id): [string, AiBrand] => [id, id]),
  ['vertex', 'google'],
]);

/**
 * Resolves the brand that names a model: the model's family first (`claude-*` → `claude`, `gpt-*` → `openai`…), then
 * the provider key. The model leads because a provider key is the operator's own label — an OpenAI-compatible key can
 * host Groq or DeepSeek models. Returns `null` for anything unknown, never a guess.
 */
export function resolveAiBrand(source: AiBrandSource): AiBrand | null {
  const model = source.model?.trim();
  if (model) {
    const name = normalizeModel(model);
    for (const [family, brand] of ModelFamilies) if (family.test(name)) return brand;
  }
  const provider = source.provider?.trim().toLowerCase();
  return provider ? (ProviderAliases.get(provider) ?? null) : null;
}

const capitalize = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

/** Joins the digit-only tokens that sit side by side (`5`, `5`) with `joiner`, and capitalizes every other word. */
function wordsOf(tokens: ReadonlyArray<string>, joiner: string): string[] {
  const words: string[] = [];
  let digits: string[] = [];
  const flush = (): void => {
    if (digits.length > 0) words.push(digits.join(joiner));
    digits = [];
  };
  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      digits.push(token);
      continue;
    }
    flush();
    words.push(/^\d+(?:\.\d+)+$/.test(token) ? token : capitalize(token));
  }
  flush();
  return words;
}

/**
 * Writes a model id the way a person reads it: `claude-haiku-5-5` → `Claude Haiku 5.5`, `gpt-4.1-mini` →
 * `GPT-4.1 mini`, `gemini-2.5-flash` → `Gemini 2.5 Flash`. A trailing date stamp (`-20250514`, `-2024-08-06`,
 * `@20250514`) and a Bedrock version suffix are dropped. Any other id comes back unchanged.
 */
export function aiModelLabel(model: string | null | undefined): string {
  if (!model) return '';
  const name = normalizeModel(model)
    .replace(/-v\d+:\d+$/, '')
    .replace(/(?:-\d{8}|@\d{8}|-\d{4}-\d{2}-\d{2})$/, '');

  const gpt = /^gpt-(\d[\w.]*)(?:-(.+))?$/.exec(name);
  if (gpt) return `GPT-${gpt[1]}${gpt[2] ? ` ${gpt[2].replaceAll('-', ' ')}` : ''}`;

  const tokens = name.split('-');
  if (tokens.length > 1 && tokens[0] === 'claude') return ['Claude', ...wordsOf(tokens.slice(1), '.')].join(' ');
  if (tokens.length > 1 && tokens[0] === 'gemini') return ['Gemini', ...wordsOf(tokens.slice(1), '-')].join(' ');
  return model;
}
