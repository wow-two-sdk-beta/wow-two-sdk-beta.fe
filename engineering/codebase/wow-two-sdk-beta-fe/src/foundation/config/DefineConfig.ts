// The typed-env engine. `defineConfig(schema, options)` reads each declared key from an ordered source list,
// parses it through its `ConfigField`, applies defaults, and returns a frozen, fully-typed config object. Unlike
// storage (which degrades silently), config fails LOUD: every missing-required and invalid-value problem is
// collected across the whole schema and thrown together as one `ConfigError` at startup — so a misconfigured
// deploy surfaces all its problems at once, not one boot-crash at a time.

import type { AnyConfigField, ConfigField } from './ConfigField';
import { defaultSources, resolveRaw, type ConfigSource } from './ConfigSource';

/** A schema: a map from output key to its field spec. */
export type ConfigSchema = Readonly<Record<string, AnyConfigField>>;

/** Widens an optional field's output to include `undefined`; a required / defaulted field stays `T`. */
type InferField<F> =
  F extends ConfigField<infer T, infer Optional> ? (Optional extends true ? T | undefined : T) : never;

/** The resolved, typed config object inferred from a schema. */
export type InferConfig<S extends ConfigSchema> = { readonly [K in keyof S]: InferField<S[K]> };

/** Tunes where `defineConfig` reads from and how keys are namespaced. */
export interface DefineConfigOptions {
  /** The ordered source list; earlier wins. Defaults to `[window.__APP_CONFIG__, import.meta.env]`. */
  readonly sources?: ReadonlyArray<ConfigSource>;

  /** A prefix prepended to every schema key on lookup (e.g. `'VITE_'` → key `API_URL` reads `VITE_API_URL`). */
  readonly prefix?: string;
}

/** One resolution failure — a missing required key or a value that failed its field's `parse`. */
export interface ConfigIssue {
  /** The schema key (output name, without the lookup prefix). */
  readonly key: string;

  /** The full source key looked up (with prefix). */
  readonly lookupKey: string;

  /** Why it failed. */
  readonly reason: 'missing' | 'invalid';

  /** A human-readable description; a `secret` field's raw value is never included. */
  readonly message: string;
}

/** Thrown by `defineConfig` when one or more keys are missing or invalid — aggregates every issue found. */
export class ConfigError extends Error {
  /** Every resolution failure across the schema. */
  readonly issues: ReadonlyArray<ConfigIssue>;

  constructor(issues: ReadonlyArray<ConfigIssue>) {
    const lines = issues.map((issue) => `  - ${issue.lookupKey}: ${issue.message}`).join('\n');
    super(`Invalid configuration (${issues.length} ${issues.length === 1 ? 'issue' : 'issues'}):\n${lines}`);
    this.name = 'ConfigError';
    this.issues = Object.freeze(issues.map((issue) => Object.freeze({ ...issue })));
    // Restore the prototype chain across the ES5 `Error` transpilation target so `instanceof` holds.
    Object.setPrototypeOf(this, ConfigError.prototype);
  }
}

/**
 * Resolves a typed configuration object from `schema`. Each key is looked up across the source list (prefix
 * applied), parsed through its field, and defaulted when absent. Empty strings count as absent. All missing /
 * invalid problems are aggregated and thrown together as a single {@link ConfigError}; on success the returned
 * object is frozen. Pass an explicit `sources` (e.g. `[staticSource({...})]`) to make resolution deterministic
 * in tests.
 */
export function defineConfig<const S extends ConfigSchema>(schema: S, options?: DefineConfigOptions): InferConfig<S> {
  const sources = options?.sources ?? defaultSources();
  const prefix = options?.prefix ?? '';

  const resolved: Record<string, unknown> = Object.create(null);
  const issues: ConfigIssue[] = [];

  for (const [key, field] of Object.entries(schema) as [string, AnyConfigField][]) {
    const lookupKey = `${prefix}${key}`;
    const raw = resolveRaw(sources, lookupKey);

    if (raw === undefined) {
      if (field.hasDefault) {
        try {
          const value = field.createDefault ? field.createDefault() : field.defaultValue;
          if (value === undefined) throw new TypeError('Config defaults cannot be undefined.');
          resolved[key] = value;
        } catch {
          issues.push({ key, lookupKey, reason: 'invalid', message: `invalid ${field.typeName} default` });
        }
      } else if (!field.required) {
        resolved[key] = undefined;
      } else {
        issues.push({ key, lookupKey, reason: 'missing', message: `missing required ${field.typeName}` });
      }
      continue;
    }

    try {
      resolved[key] = field.parse(raw);
    } catch (error) {
      // A field's `parse` throws a `string` describing the failure; anything else is coerced defensively.
      const detail = typeof error === 'string' ? error : `invalid ${field.typeName}`;
      // Never leak a secret's raw value — the field's own message may quote it, so replace it wholesale.
      const message = field.secret ? `invalid ${field.typeName} (value redacted)` : detail;
      issues.push({ key, lookupKey, reason: 'invalid', message });
    }
  }

  if (issues.length > 0) throw new ConfigError(issues);

  return Object.freeze(resolved) as InferConfig<S>;
}
