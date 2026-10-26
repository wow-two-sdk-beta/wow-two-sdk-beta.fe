# Problem text and failure reasons

Source: [ProblemDetailsExtensions.ts](ProblemDetailsExtensions.ts), [ApiFailureExtensions.ts](ApiFailureExtensions.ts).

Public import: `import { ApiFailureExtensions, ProblemDetailsExtensions } from '@wow-two-beta/fe/foundation/http';`.

## Contract

- `ProblemDetailsExtensions.of(failure)` reads the problem-details body of an `ApiFailure`, an `ApiError` or any
  `AppError` with a `problem` member; `null` for a missing, `null`, array or scalar problem.
- `ProblemDetailsExtensions.text(problem, options?)` reads the first readable candidate, in order:
  1. the first field message — the wow-two `errors` array (`[{ property, message }]`) or the ASP.NET `errors` map
     (`{ field: string[] }`), read through `fieldIssues`; skipped with `fields: false`
  2. `detail`
  3. `title`
- each candidate loses control characters (`\p{Cc}`) and bidirectional overrides (U+202A–U+202E, U+2066–U+2069),
  then the `strip` pattern, then surrounding whitespace.
- a candidate that is not a string, is empty or is longer than `maxLength` (default 300) is skipped; `undefined` when
  none remains.
- a field message whose property has an entry in `labels` reads `{label}: {message}`; others read the message alone.
- `ApiFailureExtensions.reason(failure, options?)` returns that text, else `options.fallback`, else the failure's
  display-safe `message`; a missing failure returns `fallback` or `''`.
- Show only text the API authors for people — the be sdk's `AppError` messages and validation messages are; a third
  party's problem body may not be. Cancellation stays the caller's to suppress.

```ts
const result = await start({ target, release, confirm });
if (!result.ok) refusal.value = ApiFailureExtensions.reason(result.failure, { strip: /^Deployment rejected: / });
```

## Verification

[FailureReason.test.ts](../../../tests/unit/foundation/http/FailureReason.test.ts) reads failures that
`createApiClient` built from canned responses: both `errors` shapes, labels, `fields: false`, detail over title,
character and prefix stripping, the length budget, transport and non-JSON failures, `ApiError`, `AppError` and nothing.
