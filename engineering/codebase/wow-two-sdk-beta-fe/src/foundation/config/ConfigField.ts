import { LosslessJson } from '../json';
import { ResultExtensions, type Result } from '../results';

// Typed-env field specs. A `ConfigField<T>` describes how one configuration key is parsed from its raw
// string form, whether it is required, and its fallback — the atoms `defineConfig` reads a source through.
// Each builder (`str`, `num`, `bool`, `oneOf`, `url`, `port`, `json`, `list`) returns a field whose `parse`
// handles only a *present* raw string and throws a human-readable message on an invalid value; the engine
// owns the missing / default / required decision centrally, so a field never re-implements that policy.

/** Tunes one field's presence policy and fallback. A `default` (or `required: false`) makes the field optional. */
export interface ConfigFieldOptions<T> {
  /** Marks the field required. Defaults to `true` unless a `default` is supplied. */
  readonly required?: boolean;

  /** The value used when the key is absent or empty. Supplying it makes the field optional. */
  readonly default?: T;

  /** Creates an independent fallback for each resolution; use for mutable values. */
  readonly defaultFactory?: () => T;

  /** Redacts the raw value from `ConfigError` messages — set for tokens, keys, and passwords. */
  readonly secret?: boolean;
}

/**
 * Describes a single configuration key: its scalar type, presence policy, and how to parse a present raw
 * string into `T`. `Optional` is a phantom flag the schema inference reads to widen the output to `T | undefined`
 * for a field that is `required: false` with no `default`.
 */
export interface ConfigField<T, Optional extends boolean = false> {
  /** The human-facing type name used in error messages (`string`, `number`, `one of [...]`, …). */
  readonly typeName: string;

  /** Whether a missing key is an error. `false` when a `default` is present or `required: false`. */
  readonly required: boolean;

  /** Whether an explicit `default` was supplied. */
  readonly hasDefault: boolean;

  /** The configured fallback, meaningful only when `hasDefault` is `true`. */
  readonly defaultValue?: T;

  /** Builds an independent fallback when configured. */
  readonly createDefault?: () => T;

  /** Whether the raw value is redacted from error output. */
  readonly secret: boolean;

  /** Phantom marker: `true` widens the inferred output type to `T | undefined`. Never read at runtime. */
  readonly __optional?: Optional;

  /** Parses a present, non-empty raw string into `T`; throws a `string` message describing the failure. */
  parse(raw: string): T;
}

/** Computes a field's phantom optionality from its options — optional iff no `default` and `required: false`. */
type Optionality<O> = O extends { default: unknown } | { defaultFactory: unknown }
  ? false
  : O extends { required: false }
    ? true
    : false;

/** The upper bound for a field of unknown scalar type — every concrete `ConfigField<T, …>` is assignable to it. */
export type AnyConfigField = ConfigField<unknown, boolean>;

/** Shared field constructor — folds the options into the runtime presence policy around a scalar `parse`. */
function createField<T>(
  typeName: string,
  parse: (raw: string) => T,
  options: ConfigFieldOptions<T> | undefined,
): ConfigField<T, boolean> {
  const hasValue = options !== undefined && Object.hasOwn(options, 'default');
  const hasFactory = options !== undefined && Object.hasOwn(options, 'defaultFactory');
  if (hasValue && hasFactory) throw new TypeError('Choose default or defaultFactory, not both.');
  if (
    hasValue &&
    (options.default === undefined ||
      (typeof options.default === 'object' && options.default !== null) ||
      typeof options.default === 'function')
  ) {
    throw new TypeError('Use defaultFactory for mutable config defaults; undefined is not a default.');
  }
  if (hasFactory && typeof options.defaultFactory !== 'function')
    throw new TypeError('defaultFactory must be a function.');
  const hasDefault = hasValue || hasFactory;
  return Object.freeze({
    typeName,
    parse,
    hasDefault,
    defaultValue: hasValue ? options.default : undefined,
    createDefault: hasFactory ? options.defaultFactory : undefined,
    // A field is required unless it carries a default or is explicitly opted out.
    required: hasDefault ? false : (options?.required ?? true),
    secret: options?.secret ?? false,
  });
}

/** A string field — preserves the raw value; empty strings are handled as missing by resolution. */
export function str<const O extends ConfigFieldOptions<string> = ConfigFieldOptions<string>>(
  options?: O,
): ConfigField<string, Optionality<O>> {
  return createField('string', (raw) => raw, options) as ConfigField<string, Optionality<O>>;
}

/** A finite-number field — rejects any raw string that does not parse to a finite JS number. */
export function num<const O extends ConfigFieldOptions<number> = ConfigFieldOptions<number>>(
  options?: O,
): ConfigField<number, Optionality<O>> {
  return createField(
    'number',
    (raw) => {
      const value = Number(raw);
      if (!Number.isFinite(value)) throw `expected a number, got "${raw}"`;
      return value;
    },
    options,
  ) as ConfigField<number, Optionality<O>>;
}

/** The raw spellings each boolean side accepts, case-insensitively. */
const TrueTokens = new Set(['true', '1', 'yes', 'on']);
const FalseTokens = new Set(['false', '0', 'no', 'off']);

/** A boolean field — accepts `true/1/yes/on` and `false/0/no/off` (case-insensitive); rejects anything else. */
export function bool<const O extends ConfigFieldOptions<boolean> = ConfigFieldOptions<boolean>>(
  options?: O,
): ConfigField<boolean, Optionality<O>> {
  return createField(
    'boolean',
    (raw) => {
      const token = raw.trim().toLowerCase();
      if (TrueTokens.has(token)) return true;
      if (FalseTokens.has(token)) return false;
      throw `expected a boolean (true/false/1/0/yes/no/on/off), got "${raw}"`;
    },
    options,
  ) as ConfigField<boolean, Optionality<O>>;
}

/** An enum field — the value must be one of `values`; the output type narrows to that literal union. */
export function oneOf<
  const V extends readonly string[],
  const O extends ConfigFieldOptions<V[number]> = ConfigFieldOptions<V[number]>,
>(values: V, options?: O): ConfigField<V[number], Optionality<O>> {
  return createField(
    `one of [${values.join(', ')}]`,
    (raw) => {
      if ((values as readonly string[]).includes(raw)) return raw as V[number];
      throw `expected one of [${values.join(', ')}], got "${raw}"`;
    },
    options,
  ) as ConfigField<V[number], Optionality<O>>;
}

/** A URL field — validated with the `URL` constructor; the parsed string is returned unchanged. */
export function url<const O extends ConfigFieldOptions<string> = ConfigFieldOptions<string>>(
  options?: O,
): ConfigField<string, Optionality<O>> {
  return createField(
    'url',
    (raw) => {
      try {
        // Construct-and-discard: `URL` throws on a malformed value; we keep the caller's original string.
        void new URL(raw);
        return raw;
      } catch {
        throw `expected a valid URL, got "${raw}"`;
      }
    },
    options,
  ) as ConfigField<string, Optionality<O>>;
}

/** A TCP-port field — a finite integer in `1..65535`. */
export function port<const O extends ConfigFieldOptions<number> = ConfigFieldOptions<number>>(
  options?: O,
): ConfigField<number, Optionality<O>> {
  return createField(
    'port',
    (raw) => {
      const value = Number(raw);
      if (!Number.isInteger(value) || value < 1 || value > 65535) throw `expected a port in 1..65535, got "${raw}"`;
      return value;
    },
    options,
  ) as ConfigField<number, Optionality<O>>;
}

/** Validates a parsed JSON value; expected failures carry the decoder's own failure data. */
export type ConfigJsonDecoder<T> = (value: unknown) => Result<T, unknown>;

/** Reads JSON without claiming a decoded application shape. Numeric tokens remain ExactNumber values. */
export function json<const O extends ConfigFieldOptions<unknown> = ConfigFieldOptions<unknown>>(
  options?: O,
): ConfigField<unknown, Optionality<O>>;
/** Decodes a lossless JSON value into a validated application shape; decoder failures reject the field. */
export function json<T, const O extends ConfigFieldOptions<T> = ConfigFieldOptions<T>>(
  decode: ConfigJsonDecoder<T>,
  options?: O,
): ConfigField<T, Optionality<O>>;
export function json(
  decodeOrOptions?: ConfigJsonDecoder<unknown> | ConfigFieldOptions<unknown>,
  options?: ConfigFieldOptions<unknown>,
): ConfigField<unknown, boolean> {
  const decode =
    typeof decodeOrOptions === 'function' ? decodeOrOptions : (value: unknown) => ResultExtensions.ok(value);
  return createField(
    'json',
    (raw) => {
      const parsed = LosslessJson.parse(raw);
      if (!parsed.ok) throw 'expected valid JSON';
      const decoded = decode(parsed.value);
      if (!decoded.ok) throw 'JSON value failed its decoder';
      return decoded.value;
    },
    typeof decodeOrOptions === 'function' ? options : decodeOrOptions,
  );
}

/** Tunes how a `list` field splits its raw value. */
export interface ListFieldOptions extends ConfigFieldOptions<readonly string[]> {
  /** The item separator. Defaults to a comma. */
  readonly separator?: string;
}

/** A string-list field — splits on `separator` (default `,`), trims each item, and drops empty items. */
export function list<const O extends ListFieldOptions = ListFieldOptions>(
  options?: O,
): ConfigField<ReadonlyArray<string>, Optionality<O>> {
  const separator = options?.separator ?? ',';
  return createField<readonly string[]>(
    'list',
    (raw) =>
      raw
        .split(separator)
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    options,
  ) as ConfigField<readonly string[], Optionality<O>>;
}
