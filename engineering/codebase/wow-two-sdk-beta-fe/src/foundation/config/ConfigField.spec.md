# Configuration boundaries

Configuration resolves declared own keys from ordered sources into a frozen null-prototype record.
Prototype names remain ordinary own properties; inherited source values are absent.
The freeze protects the output shape, not arbitrary decoded nested values.

`json()` returns `unknown`. `json(decode, options)` infers its application type from
`decode(value: unknown): Result<T, unknown>`. JSON numeric tokens are ExactNumber values.
Validation failures join ConfigError's aggregate; secret fields redact decoder failure details.
Existing SDK validators compose directly: `json((value) => schema.validate(value))`.

Mutable defaults require `defaultFactory`; one factory runs per missing-field resolution.
A literal undefined default, conflicting defaults, or undefined factory output is invalid.
Scalar `default` remains supported. Factories own creating independent nested values.

Migration: replace unchecked `json<MyConfig>()` with a Result decoder.
Replace array/object `default` options with factories. Use Object.hasOwn for resolved dictionaries.
