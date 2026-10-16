# Validator

Composable Result-returning validation with independent Standard Schema input and output types.

## Object boundaries

- Declared properties read only their own input data; inherited values never satisfy required fields.
- Missing optional properties remain absent; explicit undefined remains present.
- Unknown own properties are stripped by `object`; `record` retains validated own enumerable keys.
- Prototype-named keys are ordinary own data and cannot mutate the output prototype.

## Defaults

- `default(value)` accepts scalar values and immutable SDK ExactNumber values.
- Mutable objects, arrays, dates and functions require `defaultFactory(() => freshValue)`.
- The factory runs once for a missing value or undefined transform output, never for supplied valid input.
- The factory returns already-parsed output and owns creating fresh mutable state for each invocation.
- Null is not missing. Factory exceptions/undefined output indicate caller errors.
- Defaults widen input to include undefined and remove undefined from output.

## Exact numbers

- `exactNumber()` accepts only an SDK ExactNumber.
- `.min(exact)`, `.max(exact)`, and `.integer()` retain the exact validator chain.
- Comparisons and message operands never convert through native number.

## Messages

- Code aliases, parameter aliases, catalogues and labels use own-key lookups.
- Unknown codes remain strings and fall back to their source message.
- ExactNumber diagnostic operands retain their original numeric token in messages.
- Empty, throwing or non-string custom message renderers fall back to the source message.

## Verification

`tests/unit/foundation/validators/BoundarySafety.test.ts` verifies prototype-named data,
independent default results, callback counts, transformed input/output types and lossless HTTP diagnostics.
`tests/unit/foundation/validators/ExactNumber.test.ts` verifies exact integer boundaries and decimal rejection.
