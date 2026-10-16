// Configuration sources — the raw key/value stores `defineConfig` reads through. Two ship by default: the
// build-time `import.meta.env` (Vite inlines it at build) and the runtime `window.__APP_CONFIG__` global an ops
// team can inject per-environment without a rebuild (12-factor runtime config). A source is a flat record of
// string values; `defineConfig` merges an ordered list where the *earlier* source wins, so runtime config is
// layered ahead of build-time env by default. Reading a source never throws — an unavailable one yields `{}`.

/** A flat, read-only key/value store of raw configuration strings. */
export type ConfigSource = Readonly<Record<string, string | undefined>>;

/** The default runtime-config global — `window.__APP_CONFIG__`, injected per-environment ahead of build-time env. */
export const DefaultRuntimeConfigKey = '__APP_CONFIG__';

/**
 * The build-time source — Vite's `import.meta.env`, inlined at build. Returns `{}` outside a bundler context
 * (e.g. a plain Node test) where `import.meta.env` is absent, so it is always safe to include.
 */
export function importMetaEnvSource(): ConfigSource {
  try {
    const meta = import.meta as unknown as { env?: Record<string, string | undefined> };
    return meta.env ?? {};
  } catch {
    return {};
  }
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

/** The default source order: runtime `window.__APP_CONFIG__` layered ahead of build-time `import.meta.env`. */
export function defaultSources(): ReadonlyArray<ConfigSource> {
  return [windowConfigSource(), importMetaEnvSource()];
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
