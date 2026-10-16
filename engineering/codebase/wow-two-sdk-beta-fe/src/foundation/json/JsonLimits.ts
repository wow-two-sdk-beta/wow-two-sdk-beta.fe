/** Bounded in-memory codec; counts UTF-16 characters and lexical tokens, not UTF-8 bytes. */
export const JsonLimits = Object.freeze({ maxCharacters: 1_048_576, maxDepth: 128, maxTokens: 100_000 });
