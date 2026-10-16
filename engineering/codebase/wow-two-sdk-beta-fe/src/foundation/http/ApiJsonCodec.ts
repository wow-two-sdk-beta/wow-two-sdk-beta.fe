import type { Result } from '../results';

/** Opt-in JSON wire codec; runs before numeric tokens can be converted by native JSON. */
export interface ApiJsonCodec {
  /** Expected malformed-input outcomes become protocol failures; programmer exceptions propagate. */
  readonly parse: (text: string) => Result<unknown, unknown>;
  /** Expected encoding outcomes become validation failures without sending or retrying the request. */
  readonly stringify: (value: unknown) => Result<string, unknown>;
}
