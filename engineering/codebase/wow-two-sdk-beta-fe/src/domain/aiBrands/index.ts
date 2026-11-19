// aiBrands — domain module. AI provider and model-family brand marks (Claude, Gemini, OpenAI…), the resolver that
// names the brand behind a provider key or model id, and the label that reads a model id. The marks are vendored by
// `scripts/aiBrands/generate.mjs`; nothing here reaches a network or a browser API.

export { default as AiBrandMark, type AiBrandMarkProps } from './AiBrandMark.vue';
export { AiBrandIds, AiBrandNames, aiModelLabel, resolveAiBrand } from './AiBrands';
export type { AiBrand, AiBrandSource } from './AiBrands';
