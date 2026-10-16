# ExactNumber

Immutable finite decimal values and explicit arithmetic. Public entry: `@wow-two-beta/ui-vue/foundation/numbers`.

## Creation and identity

`ExactNumber.parse(text)` returns `Result<ExactNumber, NumberFailure>` and accepts exactly one JSON numeric token. Whitespace, non-decimal prefixes, separators, NaN and Infinity fail. Input is text so no native-number rounding occurs first. Every finite JSON exponent can be retained, including an exponent too large for native Number or the arithmetic engine, within the token-length resource budget.

`ExactNumber.fromBigInt(value)` retains all integer digits. `ExactNumber.fromSafeInteger(value)` accepts only native safe integers and preserves native negative zero. For decimal input, provide the intended decimal text; a prior binary64 computation cannot recover its original decimal intent.

`ExactNumber.isExactNumber(unknown)` narrows actual instances created by this SDK module. Instances are frozen, carry no public mutable vendor object, and cannot be constructed structurally. The SDK owns the public type; arithmetic vendors do not appear in its declarations.

Instances share a frozen prototype. Call methods on their receiver (`value.add(other)`); use a wrapper such as `() => value.toString()` when passing a method as a callback. Detached methods are not bound. Native structured cloning (including worker messages and IndexedDB) is deliberately rejected; transfer lossless JSON text and decode it at the destination.

## Instance API

| Method                                          | Contract                                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `toString()`                                    | Original numeric spelling, including trailing zeros, exponent case/sign and negative zero |
| `add(other)`                                    | Exact sum, without significant-digit rounding                                             |
| `subtract(other)`                               | Exact difference, including large cancellation                                            |
| `multiply(other)`                               | Exact product, without significant-digit rounding                                         |
| `divide(other, { decimalPlaces, rounding })`    | Rounded quotient; precision and rounding are mandatory                                    |
| `round({ decimalPlaces, rounding })`            | Rounds to decimal places after the decimal point                                          |
| `modulo(other)`                                 | Exact truncating remainder: dividend sign, matching the convention of JS `%`              |
| `compare(other)`                                | Result containing -1, 0 or 1 by numeric value without expanding exponents                 |
| `equals(other)`                                 | Result containing numeric equality, independent of spelling and zero sign                 |
| `negate()` / `absolute()`                       | Total sign operations preserving magnitude spelling                                       |
| `isZero()` / `isInteger()` / `isNegativeZero()` | Total exact predicates without Number conversion                                          |
| `toBigInt()`                                    | Exact integer conversion, failing for fractions or excess resource use                    |
| `toSafeInteger()`                               | Exact conversion within ±9007199254740991, retaining signed zero                          |
| `toApproximateNumber()`                         | Explicit binary64 approximation; overflow and nonzero underflow fail                      |

Arithmetic and comparison return house `Result` values. Comparison/equality use normalized digits and exponent order, so every accepted numeric magnitude can be compared without the arithmetic expansion budget. Rounding supports AwayFromZero, TowardZero, Ceiling, Floor, HalfAwayFromZero, HalfTowardZero, HalfEven, HalfCeiling and HalfFloor. Half modes differ only at exact ties. For example, HalfEven with zero decimal places maps 2.5 to 2, 3.5 to 4, and -2.5 to -2. Division by signed or unsigned zero fails.

Arithmetic results use canonical decimal/exponent spelling; they do not retain operand scale or spelling. Every arithmetic zero becomes `0`. Parsed `-0.00` retains that spelling until arithmetic; it compares equal to zero. Negating `-0.00` produces `0.00`. `toBigInt` has no negative zero.

No implicit arithmetic is supported: default/numeric primitive coercion throws TypeError. String interpolation and `String(value)` retain the numeric token. Native `===` always compares object identity and cannot be overloaded; use `equals`. Native `JSON.stringify` throws for ExactNumber, including nested values; use the lossless JSON codec to emit a numeric token. These exceptions indicate API misuse, not expected arithmetic failure.

## Failure and resource policy

`NumberFailure.code` is InvalidSyntax, ResourceLimit, DivisionByZero, InvalidRounding, NonInteger or UnsafeConversion. Messages do not echo numeric input. Invalid structural operands are programmer errors and throw TypeError.

`NumberLimits` declares implementation work budgets:

- 16,384 numeric token characters excluding the optional leading minus. This retains both sign variants of every accepted magnitude.
- 32,768 decimal places for the arithmetic working interval and combined coefficient digits. Nonzero operands outside that interval fail before reaching the arithmetic library. The operation can still fail if its output token exceeds the token budget.
- Explicit division/rounding precision from 0 through 4,096 decimal places.

These are allocation/work limits, not .NET scalar restrictions. Parsing and encoding do not require int64, decimal, binary64 or arithmetic-engine range. All .NET int64 and decimal endpoints fit exactly. Huge exponents round-trip as tokens; requesting a costly arithmetic operation or expanded integer may return ResourceLimit. No backend field range is inferred: a field codec can separately enforce the declared scalar contract.

The supported arithmetic is finite decimal addition, subtraction, multiplication, explicit rounded division, decimal-place rounding, truncating remainder and comparison. This API makes no claim about exact transcendental math, arbitrary symbolic math or unlimited resource use. It intentionally provides no ambiguous default-precision division or `toNumberExact` based on decimal text round-tripping.

## Implementation and evidence

The private bignumber.js adapter uses isolated constructors and operation-specific rounding configuration. Public arithmetic does not depend on consumer changes to the vendor's global configuration. The library implements decimal arithmetic; SDK code validates the JSON numeric form, retains the token, enforces resource budgets and translates expected failures.

Tests independently compute signed/scaled integer arithmetic with native BigInt, check exact cancellation, rounding signs/ties, conversion limits, negative zero, immutable values, coercion and resource behavior. The JSON suite also compares results with actual .NET 10 default serializer/decimal fixtures.
