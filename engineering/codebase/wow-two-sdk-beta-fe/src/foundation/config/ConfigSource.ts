// Configuration sources — the raw key/value stores `defineConfig` reads through. Two ship by default: the
// runtime `window.__APP_CONFIG__` global an ops team can inject per-environment without a rebuild (12-factor
// runtime config), and the app's build-time `import.meta.env`, which the app passes in from its own module. A
// source is a flat record of string values; `defineConfig` merges an ordered list where the *earlier* source
// wins, so runtime config is layered ahead of build-time env. Reading a source never throws — an unavailable
// one yields `{}`.
//
// The package cannot read the app's env itself: a bundler replaces `import.meta.env` only in the app's own
// modules, never inside this prebuilt package, so the app hands over its `import.meta.env` object.

/** A flat, read-only key/value store of raw configuration strings. */
export type ConfigSource = Readonly<Record<string, string | undefined>>;

/** The default runtime-config global — `window.__APP_CONFIG__`, injected per-environment ahead of build-time env. */
export const DefaultRuntimeConfigKey = '__APP_CONFIG__';

/** A build-time env record as a bundler exposes it — Vite's `import.meta.env`, with string and boolean values. */
export type ConfigEnv = Readonly<Record<string, unknown>>;

/**
 * The build-time source over the app's own env — call it as `importMetaEnvSource(import.meta.env)` from an app
 * module, where the bundler inlines `import.meta.env`. Copies every string, number, boolean and bigint value as a
 * string (`DEV: true` → `'true'`) into a frozen snapshot and drops anything else. A missing or non-object `env`
 * yields `{}`.
 */
export function importMetaEnvSource(env: ConfigEnv | undefined): ConfigSource {
  const values: Record<string, string> = Object.create(null);
  if (env === null || typeof env !== 'object') return Object.freeze(values);
  for (const key of Object.keys(env)) {
    const value = env[key];
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
    ) {
      values[key] = String(value);
    }
  }
  return Object.freeze(values);
}

/**
 * The runtime source — a global object (default `window.__APP_CONFIG__`) a deployment injects before the app
 * boots. Returns `{}` when there is no `window` (SSR / Node) or the global is absent or not an object.
 */
export function windowConfigSource(globalKey: string = DefaultRuntimeConfigKey): ConfigSource {
  if (typeof window === 'undefined') return {};
  if (!Object.hasOwn(window, globalKey)) return {};
  const raw = (window as unknown as Record<string, unknown>)[globalKey];
  return raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? (raw as ConfigSource) : {};
}

/** An explicit source over a plain record — the injection seam for tests and for values resolved elsewhere. */
export function staticSource(values: Record<string, string | undefined>): ConfigSource {
  return values;
}

/**
 * The default source order: runtime `window.__APP_CONFIG__` layered ahead of the app's build-time env. Pass the
 * app's `import.meta.env` as `env`; without it only the runtime source is read.
 */
export function defaultSources(env?: ConfigEnv): ReadonlyArray<ConfigSource> {
  return env === undefined ? [windowConfigSource()] : [windowConfigSource(), importMetaEnvSource(env)];
}

/**
 * Resolves `key` across an ordered source list, first non-empty match wins (earlier source = higher priority).
 * A non-string hit (e.g. `import.meta.env.DEV` is a boolean) is coerced to its string form; an empty string is
 * treated as absent so an unset-but-declared env var falls through to the next source or the field default.
 */
export function resolveRaw(sources: ReadonlyArray<ConfigSource>, key: string): string | undefined {
  for (const source of sources) {
    if (!Object.hasOwn(source, key)) continue;
    const hit = (source as Record<string, unknown>)[key];
    if (hit === undefined || hit === null) continue;
    const asString = typeof hit === 'string' ? hit : String(hit);
    if (asString.length === 0) continue;
    return asString;
  }
  return undefined;
}
