# LosslessJson

JSON transport without passing numeric tokens through JavaScript Number. Public entry: `@wow-two-beta/ui-vue/foundation/json`.

## API

- `LosslessJson.parse(text): Result<LosslessJsonValue, JsonFailure>`
- `LosslessJson.stringify(value: unknown, options?: JsonStringifyOptions): Result<string, JsonFailure>`

The codec has no reviver, replacer or implicit domain decoder. Date-looking and numeric-looking JSON strings remain strings. Field/schema conversion belongs to the caller. HTTP integration can opt into this codec through its declared JSON seam.

## Parsing

Every JSON numeric token becomes an immutable SDK ExactNumber, including small integers. JSON null, booleans, strings and arrays retain their corresponding shapes. Objects become null-prototype records with own enumerable data properties. Values can be read with bracket/property access and `Object.hasOwn`; inherited Object methods are not present.

The complete JSON grammar is parsed by lossless-json. A preceding lexical pass bounds input/depth/tokens and encodes object keys. This protects prototype-named keys from the vendor's ordinary-object assignment behavior. A following pass restores the original key names. `__proto__`, `constructor`, `prototype`, `toJSON`, `isLosslessNumber` and other names are preserved as data, without modifying object prototypes or silently dropping keys.

All duplicate decoded keys in the same object fail, even if values are equal. Thus `"x"` and `"\u0078"` conflict. The same key in separate objects is valid. The lexical pass is not an alternative JSON grammar parser; malformed syntax remains a vendor-parser failure.

Numeric token spelling is retained through parse/stringify, including decimal scale, exponent spelling and negative zero. Structural whitespace, string escaping and property enumeration order are not a byte-for-byte JSON document preservation contract. Arithmetic on an ExactNumber yields canonical numeric spelling instead.

## Serialization

`options.space` chooses indentation, clamped to 0–10 spaces; default output is compact.
`options.sortKeys` sorts object keys at every level while preserving array order and exact numeric spelling.
Formatting work counts toward the output resource budget.

Accepted values are null, booleans, strings, ExactNumber, bigint, safe native integers, dense arrays and plain/null-prototype records containing accepted values. Bigint and safe native integers emit numeric tokens. ExactNumber emits its retained token, not a JSON string. A native decimal such as `0.1` must be supplied as `ExactNumber.parse('0.1')` so decimal intent is explicit; the codec cannot recover information already lost by prior native arithmetic.

NaN, infinities, unsafe native integers, native fractions, undefined, functions, symbols, sparse arrays, extra array properties, enumerable symbol keys, accessor properties and custom instances fail. The codec never invokes `toJSON`, getters or custom conversion hooks to guess a representation. Encode custom types such as Date explicitly before calling it. Non-enumerable properties follow normal JSON behavior and are omitted.

Repeated references to the same ordinary value are allowed; cycles fail. Keys are temporarily encoded during vendor serialization and restored afterward, so vendor-special property names remain ordinary data. ExactNumber's native `toJSON` guard is bypassed only by the dedicated numeric stringifier.

Proxy trap exceptions are programmer errors and propagate; this is a data codec, not a sandbox for arbitrary executable objects.

## Failure and resource policy

`JsonFailure.code` is InvalidSyntax, DuplicateKey, ResourceLimit, UnsupportedValue or CircularReference. Messages do not echo payloads or vendor diagnostics.

`JsonLimits` declares 1,048,576 UTF-16 characters, 128 container levels and 100,000 lexical tokens/traversal budget units. The encoder's conservative budget includes property names and punctuation; encoded internal keys also count toward the intermediate-text budget. A near-limit document is not guaranteed to fit every intermediate representation. Depth and giant-array guards run before vendor recursion or array-index allocation. Strings are length-checked before escape allocation. ExactNumber's separate token and arithmetic budgets apply.

Huge exponents are preserved as bounded-length tokens rather than expanded strings or native floats. These policies bound ordinary supported data processing; they are not a hard real-time guarantee, arbitrary-object sandbox, streaming API or unbounded JSON store.

## Verification

Tests cover nested arrays, plain scalar roots, malformed grammar and escapes, all duplicate-key cases, prototype/vendor-special keys, string data, negative zero, native-number rejection, cycles/accessors/proxies and resource guards. An actual .NET 10.0.300 default System.Text.Json fixture verifies both long/decimal endpoints, 28-place decimals, retained scale and arithmetic values. An independent BigInt oracle verifies exact arithmetic in the numbers suite.
