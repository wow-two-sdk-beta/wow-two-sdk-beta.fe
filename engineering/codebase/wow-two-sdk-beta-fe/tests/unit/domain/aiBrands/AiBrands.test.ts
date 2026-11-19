import { describe, expect, it } from 'vitest';
import { AiBrandIds, AiBrandNames, aiModelLabel, resolveAiBrand, type AiBrand } from '@src/domain/aiBrands';
import { aiBrandIdToken, aiBrandMarkData } from '@src/domain/aiBrands/AiBrandMarkData';

/*
 * `unit` project (node). The resolver and the label are pure functions, so each rule is one table row; the data tests
 * assert what the generator promises about every mark, so a regenerated file that lets a script, a style or an
 * external reference through fails here.
 */

describe('resolveAiBrand — model family first', () => {
  it.each<[string, AiBrand]>([
    ['claude-haiku-5-5', 'claude'],
    ['claude-3-5-sonnet-20241022', 'claude'],
    ['claude', 'claude'],
    ['gemini-2.5-flash', 'gemini'],
    ['gemini-3-pro-preview', 'gemini'],
    ['gpt-4.1-mini', 'openai'],
    ['gpt-5', 'openai'],
    ['gpt-oss-120b', 'openai'],
    ['chatgpt-4o-latest', 'openai'],
    ['o1', 'openai'],
    ['o1-mini', 'openai'],
    ['o3-mini', 'openai'],
    ['o4-mini', 'openai'],
    ['llama-3.3-70b-versatile', 'meta'],
    ['llama3.1:8b', 'meta'],
    ['mistral-large-latest', 'mistral'],
    ['mixtral-8x7b-instruct', 'mistral'],
    ['codestral-latest', 'mistral'],
    ['deepseek-chat', 'deepseek'],
    ['deepseek-r1', 'deepseek'],
    ['qwen2.5-72b-instruct', 'qwen'],
    ['qwen3-coder', 'qwen'],
    ['grok-4', 'grok'],
    ['Claude-Haiku-5-5', 'claude'],
    ['  GPT-4.1  ', 'openai'],
  ])('model %s → %s', (model, brand) => {
    expect(resolveAiBrand({ model })).toBe(brand);
  });

  it.each<[string, AiBrand]>([
    ['anthropic/claude-3.5-sonnet', 'claude'],
    ['openai/gpt-4o', 'openai'],
    ['models/gemini-2.5-flash', 'gemini'],
    ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'meta'],
    ['mistralai/Mixtral-8x7B-Instruct-v0.1', 'mistral'],
    ['deepseek-ai/DeepSeek-V3', 'deepseek'],
    ['Qwen/Qwen2.5-72B-Instruct', 'qwen'],
    ['x-ai/grok-4', 'grok'],
    ['anthropic.claude-3-5-sonnet-20240620-v1:0', 'claude'],
    ['us.anthropic.claude-sonnet-4-20250514-v1:0', 'claude'],
    ['meta.llama3-70b-instruct-v1:0', 'meta'],
  ])('routed id %s → %s', (model, brand) => {
    expect(resolveAiBrand({ model })).toBe(brand);
  });

  it('lets the model name the brand over the provider key that hosts it', () => {
    expect(resolveAiBrand({ provider: 'openai', model: 'deepseek-chat' })).toBe('deepseek');
    expect(resolveAiBrand({ provider: 'groq', model: 'llama-3.3-70b-versatile' })).toBe('meta');
    expect(resolveAiBrand({ provider: 'openrouter', model: 'anthropic/claude-sonnet-4' })).toBe('claude');
    expect(resolveAiBrand({ provider: 'azure', model: 'gpt-4.1' })).toBe('openai');
    expect(resolveAiBrand({ provider: 'google', model: 'gemini-2.5-flash' })).toBe('gemini');
  });
});

describe('resolveAiBrand — provider alias', () => {
  it.each<[string, AiBrand]>([
    ['anthropic', 'anthropic'],
    ['openai', 'openai'],
    ['google', 'google'],
    ['gemini', 'gemini'],
    ['vertex', 'google'],
    ['groq', 'groq'],
    ['ollama', 'ollama'],
    ['openrouter', 'openrouter'],
    ['azure', 'azure'],
    ['deepseek', 'deepseek'],
    ['mistral', 'mistral'],
    ['xai', 'xai'],
    ['cohere', 'cohere'],
    ['perplexity', 'perplexity'],
    ['claude', 'claude'],
    ['chatgpt', 'chatgpt'],
    ['meta', 'meta'],
    ['qwen', 'qwen'],
    ['grok', 'grok'],
  ])('provider %s → %s', (provider, brand) => {
    expect(resolveAiBrand({ provider })).toBe(brand);
  });

  it('ignores case and surrounding whitespace', () => {
    expect(resolveAiBrand({ provider: '  Anthropic ' })).toBe('anthropic');
    expect(resolveAiBrand({ provider: 'OpenAI' })).toBe('openai');
  });

  it('falls back to the provider when the model names no family', () => {
    expect(resolveAiBrand({ provider: 'anthropic', model: 'house-model-7' })).toBe('anthropic');
  });
});

describe('resolveAiBrand — unknown', () => {
  it.each<[string, { provider?: string | null; model?: string | null }]>([
    ['nothing at all', {}],
    ['null provider and model', { provider: null, model: null }],
    ['blank strings', { provider: '  ', model: '' }],
    ['an unknown provider', { provider: 'acme' }],
    ['an unknown model', { model: 'house-model-7' }],
    ['a model that only starts like a family', { model: 'gptq-int4' }],
    ['a model that only starts like llama', { model: 'llamaindex-agent' }],
    ['a model that starts like an o-series id', { model: 'orca-2' }],
    ['a provider named like an Object member', { provider: 'constructor' }],
    ['a provider named __proto__', { provider: '__proto__' }],
  ])('%s → null', (_, source) => {
    expect(resolveAiBrand(source)).toBeNull();
  });
});

describe('aiModelLabel', () => {
  it.each([
    ['claude-haiku-5-5', 'Claude Haiku 5.5'],
    ['claude-3-5-sonnet-20241022', 'Claude 3.5 Sonnet'],
    ['claude-sonnet-4-20250514', 'Claude Sonnet 4'],
    ['claude-opus-4-1', 'Claude Opus 4.1'],
    ['claude-3-opus-20240229', 'Claude 3 Opus'],
    ['claude-3.5-sonnet', 'Claude 3.5 Sonnet'],
    ['anthropic/claude-3.5-sonnet', 'Claude 3.5 Sonnet'],
    ['anthropic.claude-3-5-sonnet-20240620-v1:0', 'Claude 3.5 Sonnet'],
    ['claude-3-5-sonnet@20240620', 'Claude 3.5 Sonnet'],
    ['gpt-4.1-mini', 'GPT-4.1 mini'],
    ['gpt-4o-mini-2024-07-18', 'GPT-4o mini'],
    ['gpt-5', 'GPT-5'],
    ['gpt-3.5-turbo', 'GPT-3.5 turbo'],
    ['gemini-2.5-flash', 'Gemini 2.5 Flash'],
    ['gemini-2.5-flash-lite', 'Gemini 2.5 Flash Lite'],
    ['gemini-2.5-flash-preview-05-20', 'Gemini 2.5 Flash Preview 05-20'],
    ['models/gemini-2.5-pro', 'Gemini 2.5 Pro'],
  ])('%s → %s', (model, label) => {
    expect(aiModelLabel(model)).toBe(label);
  });

  it.each([
    'deepseek-chat',
    'llama-3.3-70b-versatile',
    'o3-mini',
    'gpt-oss-120b',
    'chatgpt-4o-latest',
    'house-model-7',
    'claude',
  ])('returns the unknown or unformatted id %s unchanged', (model) => {
    expect(aiModelLabel(model)).toBe(model);
  });

  it('reads a missing model as an empty label', () => {
    expect(aiModelLabel(null)).toBe('');
    expect(aiModelLabel(undefined)).toBe('');
    expect(aiModelLabel('')).toBe('');
  });
});

describe('the brand tables', () => {
  it('names every brand once, in the order of the data', () => {
    expect(new Set(AiBrandIds).size).toBe(AiBrandIds.length);
    expect([...AiBrandIds]).toEqual(Object.keys(aiBrandMarkData));
    expect(Object.keys(AiBrandNames).sort()).toEqual([...AiBrandIds].sort());
    for (const id of AiBrandIds) expect(AiBrandNames[id], id).toBeTruthy();
  });

  it('covers the brands the SDK promises', () => {
    expect([...AiBrandIds].sort()).toEqual(
      [
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
      ].sort(),
    );
  });

  it('freezes the shared tables', () => {
    expect(Object.isFrozen(AiBrandIds)).toBe(true);
    expect(Object.isFrozen(AiBrandNames)).toBe(true);
  });
});

describe('the generated mark data', () => {
  const withColor: AiBrand[] = [
    'claude',
    'gemini',
    'google',
    'meta',
    'mistral',
    'deepseek',
    'qwen',
    'openrouter',
    'cohere',
    'perplexity',
    'azure',
  ];
  const monoOnly: AiBrand[] = ['anthropic', 'openai', 'chatgpt', 'grok', 'xai', 'groq', 'ollama'];

  it('has a mono mark for every brand and a color mark where the source has one', () => {
    for (const id of AiBrandIds) {
      const entry = aiBrandMarkData[id];
      expect(entry.mono.viewBox, id).toMatch(/^0 0 \d+ \d+$/);
      expect(entry.mono.markup, id).toContain('<path');
    }
    for (const id of withColor) expect(aiBrandMarkData[id].color?.markup, `${id} color`).toContain('<path');
    for (const id of monoOnly) expect(aiBrandMarkData[id].color, `${id} color`).toBeNull();
    expect([...withColor, ...monoOnly].sort()).toEqual([...AiBrandIds].sort());
  });

  it('gives chatgpt the OpenAI mark, which the source package has no ChatGPT mark for', () => {
    expect(aiBrandMarkData.chatgpt).toEqual(aiBrandMarkData.openai);
  });

  const arts = AiBrandIds.flatMap((id) => {
    const entry = aiBrandMarkData[id];
    return [
      { name: `${id} mono`, art: entry.mono, mono: true },
      ...(entry.color ? [{ name: `${id} color`, art: entry.color, mono: false }] : []),
    ];
  });

  it.each(arts)('$name carries only drawing elements and attributes', ({ art }) => {
    const elements = [...art.markup.matchAll(/<([A-Za-z][\w:-]*)/g)].map((match) => match[1]);
    expect(
      elements.filter(
        (name) =>
          !/^(g|defs|path|circle|ellipse|rect|line|polyline|polygon|linearGradient|radialGradient|stop|clipPath)$/.test(
            name!,
          ),
      ),
    ).toEqual([]);
    expect(art.markup).not.toMatch(/<(script|style|image|use|foreignObject|title|a|svg|animate|set)\b/i);
    expect(art.markup).not.toMatch(/\son\w+\s*=/i);
    expect(art.markup).not.toMatch(/javascript:|data:|https?:|:\/\/|xlink|href|@import|expression\(|&/i);
    expect(art.markup).not.toMatch(/\sstyle\s*=/);
  });

  it.each(arts)('$name keeps every reference local and every gradient id on the instance token', ({ art }) => {
    const ids = [...art.markup.matchAll(/\sid="([^"]*)"/g)].map((match) => match[1]!);
    const references = [...art.markup.matchAll(/url\(([^)]*)\)/g)].map((match) => match[1]!);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(new RegExp(`^${aiBrandIdToken}-\\d+$`));
    for (const reference of references) expect(ids, reference).toContain(reference.replace(/^#/, ''));
    expect(art.markup.replaceAll(/url\(#@@ID@@-\d+\)/g, '')).not.toContain('url(');
  });

  it.each(arts.filter((entry) => entry.mono))('$name paints nothing but currentColor', ({ art }) => {
    const paints = [...art.markup.matchAll(/\s(?:fill|stroke|stop-color)="([^"]*)"/g)].map((match) => match[1]);
    expect(paints.filter((paint) => paint !== 'none' && paint !== 'currentColor')).toEqual([]);
  });

  it('uses unique ids only on the marks that draw gradients', () => {
    const gradient = AiBrandIds.filter((id) => aiBrandMarkData[id].color?.markup.includes('linearGradient'));
    expect(gradient.sort()).toEqual(['azure', 'gemini', 'meta']);
  });
});
