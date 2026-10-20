# Configuration boundaries

Configuration resolves declared own keys from ordered sources into a frozen null-prototype record.
Prototype names remain ordinary own properties; inherited source values are absent.
The freeze protects the output shape, not arbitrary decoded nested values.

Build-time env reaches the package only as an argument: a bundler inlines `import.meta.env` in the app's
own modules, never inside the prebuilt package. Apps call `defineConfig(schema, { env: import.meta.env })`,
or build sources with `importMetaEnvSource(import.meta.env)`; the argument is required.
`defaultSources(env?)` layers `window.__APP_CONFIG__` ahead of `env` and reads the runtime global alone
without it. `importMetaEnvSource` copies string, number, boolean and bigint values as strings into a frozen
snapshot and drops the rest. An explicit `sources` wins over `env`.

`json()` returns `unknown`. `json(decode, options)` infers its application type from
`decode(value: unknown): Result<T, unknown>`. JSON numeric tokens are ExactNumber values.
Validation failures join ConfigError's aggregate; secret fields redact decoder failure details.
Existing SDK validators compose directly: `json((value) => schema.validate(value))`.

Mutable defaults require `defaultFactory`; one factory runs per missing-field resolution.
A literal undefined default, conflicting defaults, or undefined factory output is invalid.
Scalar `default` remains supported. Factories own creating independent nested values.

Migration: pass `env: import.meta.env` to `defineConfig`, and `import.meta.env` to `importMetaEnvSource`.
Replace unchecked `json<MyConfig>()` with a Result decoder.
Replace array/object `default` options with factories. Use Object.hasOwn for resolved dictionaries.
