/** Resource budgets, not a backend scalar range or a limit on exponent magnitude during parsing. */
export const NumberLimits = Object.freeze({
  /** Excludes the optional leading minus so negation never invalidates a parsed value. */
  maxTokenCharacters: 16_384,
  maxArithmeticPlaces: 32_768,
  maxDecimalPlaces: 4_096,
});
