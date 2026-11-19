# AiBrandMark

Source: [AiBrandMark.vue](AiBrandMark.vue), [AiBrands.ts](AiBrands.ts), [AiBrandMarkData.ts](AiBrandMarkData.ts) (generated). Exported from `domain/aiBrands`, subpath `@wow-two-beta/fe/domain/aiBrands`; not part of the root barrel.

Draws the mark of the AI brand that named a model — Claude, Gemini, OpenAI and the other providers — so a console can show which model processed a record. A brand the SDK does not know draws a neutral chip, never an empty box. Lucide has no brand logos, so the marks are vendored; the module has no runtime dependency beyond `lucide-vue-next` for the chip glyph.

## Props

| Prop       | Type                       | Default | Meaning                                                                                 |
| ---------- | -------------------------- | ------- | --------------------------------------------------------------------------------------- |
| `brand`    | `AiBrand \| null`          | —       | The brand to draw. Wins over `provider` and `model`; `null` draws the chip.             |
| `provider` | `string \| null`           | —       | The operator's provider key, resolved to a brand when `brand` is absent.                |
| `model`    | `string \| null`           | —       | The model id, resolved to a brand when `brand` is absent.                               |
| `size`     | `number`                   | `20`    | Pixel size of the square mark. A caller `class` (`size-8`) overrides it.                |
| `variant`  | `'color' \| 'mono'`        | `color` | `color` draws the brand's own colors; `mono` paints with `currentColor`.                |
| `label`    | `string`                   | —       | The accessible name. Absent or empty: decorative (`aria-hidden`).                       |

Other attributes fall through to the root (`inheritAttrs: false`; `class` merges through `cn`). The root is an `<svg>` carrying `data-ai-brand` (the brand id) and `data-variant` (`color` or `mono`, whichever was drawn), or, for the chip, a `<span data-ai-brand="unknown">`.

A brand with no color mark in the source package draws its mono mark under `variant="color"`, painted with `currentColor`, so it follows the surrounding text color. Those brands are `anthropic`, `openai`, `chatgpt`, `grok`, `xai`, `groq` and `ollama`; `chatgpt` carries the OpenAI mark, which is the closest the package has.

## Accessibility

Without `label` the mark is decorative: `aria-hidden="true"`, no role. With `label` it is `role="img"` with `aria-label`; the SVG is never focusable. The chip follows the same rule, and its glyph is always hidden. Place the text name beside the mark when it carries meaning on its own; the mark repeats it for recognition.

## Gradient ids

A color mark may define `<linearGradient id>`s (`gemini`, `meta`, `azure`). Each id in the data carries the placeholder `@@ID@@`; at setup the component replaces it with an id unique to the instance (Vue's `useId`, stable across a server render and its hydration), so two marks on a page never share an id and never draw each other's gradient. `useId` counts per Vue app: two separate apps on one page, each mounting a mark, need distinct `app.config.idPrefix` values.

## Resolver

`resolveAiBrand({ provider, model })` names the brand behind a model. The model's family wins, then the provider key; anything else is `null`. The model leads because a provider key is the operator's own label, and an OpenAI-compatible key can host Groq, DeepSeek or Llama models.

| Model family (leading word of the id)                              | Brand      |
| ------------------------------------------------------------------ | ---------- |
| `claude-*`                                                         | `claude`   |
| `gemini-*`                                                         | `gemini`   |
| `gpt-*`, `chatgpt-*`, `o1`, `o3`, `o4` (and `o1-mini`, `o3-mini`…) | `openai`   |
| `llama-*`, `llama3.1:8b`                                           | `meta`     |
| `mistral-*`, `mixtral-*`, `codestral-*`                            | `mistral`  |
| `deepseek-*`                                                       | `deepseek` |
| `qwen*`                                                            | `qwen`     |
| `grok-*`                                                           | `grok`     |

The family is the id's leading word, so `gptq-int4` and `llamaindex-agent` match nothing. Before matching, the id is lowercased and loses its routing: a gateway path keeps its last segment (`anthropic/claude-3.5-sonnet`, `models/gemini-2.5-flash`), and a Bedrock id loses its region and vendor prefix (`us.anthropic.claude-sonnet-4…`).

Provider keys, case-insensitive: every brand id (`anthropic`, `openai`, `google`, `gemini`, `groq`, `ollama`, `openrouter`, `azure`, `deepseek`, `mistral`, `xai`, `cohere`, `perplexity`, `claude`, `chatgpt`, `meta`, `qwen`, `grok`), plus `vertex` → `google`. `google` draws the Google mark and `gemini` the Gemini one; a `gemini-*` model under either key draws Gemini.

## Model labels

`aiModelLabel(model)` writes a model id the way a person reads it:

| Id                              | Label               |
| ------------------------------- | ------------------- |
| `claude-haiku-5-5`              | `Claude Haiku 5.5`  |
| `claude-3-5-sonnet-20241022`    | `Claude 3.5 Sonnet` |
| `gpt-4.1-mini`                  | `GPT-4.1 mini`      |
| `gemini-2.5-flash`              | `Gemini 2.5 Flash`  |
| `deepseek-chat` (any other id)  | unchanged           |

A trailing date stamp (`-20250514`, `-2024-08-06`, `@20250514`) and a Bedrock `-v1:0` suffix are dropped. A missing model reads as `''`. `AiBrandNames` maps a brand id to its display name (`xai` → `xAI`, `openai` → `OpenAI`).

## Marks and the generator

The marks come from `@lobehub/icons-static-svg` (MIT, Copyright © 2023 LobeHub), a devDependency read only by `scripts/aiBrands/generate.mjs`, run from the package directory. It parses each SVG as data, refuses any element or attribute outside an allow-list (no script, style, image, `use`, `foreignObject`, event handler, `href` or non-local `url()`), drops `<title>` and the root's inline style, rewrites gradient ids to the placeholder, refuses a mono mark that paints a color of its own, and writes `AiBrandMarkData.ts` (committed; its header names the package, version and licence). `node scripts/aiBrands/generate.mjs --check` exits 1 when the committed file differs from the installed package. The package's marks are the brands' own artwork: the licence covers the vector files, not the trademarks.

The inner markup is rendered with `v-html` on the `<svg>`. It is generated, allow-listed data, never caller input.

## Existing verification

`tests/unit/domain/aiBrands/`: `AiBrands.test.ts` (resolver table, label table, brand tables, and the generated data: allowed elements, local references, instance-token ids, mono marks paint only `currentColor`), `AiBrandMark.dom.test.ts` (color and mono, brand-less color fallback, resolution, the chip, accessible name, unique gradient ids across marks in one app) and `AiBrandMark.ssr.test.ts` (server render with no DOM globals, two marks with distinct ids). The gallery shows every brand in both variants under `display` (`AiBrandMark`).

## Placement

`@wow-two-beta/fe-ai` is the natural home for the resolver, but it is unpublished (its first npm publish is a hand step), so a package that must depend on the core SDK cannot depend on it yet. `domain/` already holds product-level helpers (`color`, `emoji`); the resolver is to move to `fe-ai` once that package publishes.
