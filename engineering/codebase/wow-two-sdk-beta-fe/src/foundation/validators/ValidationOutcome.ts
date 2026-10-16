import type { ValidatorParseResult } from './models/ValidatorParseResult';

import { AppErrorFactory, ResultExtensions } from '../results';

// Result + issue vocabulary for the validation slice. Deliberately TOTAL: a validator returns a result
// for expected failures, so a caller can check a config value, a URL param, or an API payload without a
// try/catch, and can render every problem at once instead of only the first one. `assertValid` in
// `ValidationError.ts` explicitly throws for invalid data; programmer errors remain exceptional.
//
// WHY `path` IS AN ARRAY, NOT A DOTTED STRING: the segments stay machine-readable — a form keys a field
// by `['items', 0, 'name']`, a table highlights row 0 — and `formatIssuePath` renders the display form on
// demand. It also matches Standard Schema's `Issue.path` (segments are `PropertyKey`s), so the bridge in
// `Validator.ts` hands them over unchanged instead of re-encoding.
//
// WHY MESSAGES NAME THE RECEIVED *TYPE*, NEVER THE RECEIVED VALUE: interpolating a hostile value into a
// message is a live footgun. `${aSymbol}` throws a TypeError, a `Proxy` can trap `toString` and throw or
// leak, and echoing a rejected password or token into an error string ships a secret straight to the logs.
// So `describeType` is the only thing that ever reaches a message.

/** A single segment of an issue path — an object key or an array index. */
export type PathSegmentKey = string | number;

/** One reason a value was rejected, addressed at the exact spot it failed. */
export interface ValidationIssue {
  /** Location of the failure relative to the validated root: `['items', 0, 'name']`. Empty at the root. */
  readonly path: ReadonlyArray<PathSegmentKey>;

  /** Human-readable, display-ready explanation of the failure. Never contains the rejected value. */
  readonly message: string;

  /** Stable machine tag for the rule that failed (`type`, `min`, `pattern`, `union`, `custom`, …). */
  readonly code?: string;

  /**
   * The rule's own operands — `{ min: 2, unit: 'characters' }` for `string().min(2)`.
   *
   * Present so a message CATALOGUE can re-render the failure in another voice or another language
   * (`Messages.ts`). `message` already reads correctly on its own; without the operands beside it, a
   * catalogue could only ever emit parameterless text, which is a catalogue that cannot replace the
   * message it exists to replace. Holds operands only — never the rejected value, for the same reason
   * `describeType` exists.
   */
  readonly params?: Readonly<Record<string, unknown>>;
}
export type { ValidationFailure } from './models/ValidationFailure';
export type { ValidatorParseResult } from './models/ValidatorParseResult';

/** Builds a success carrying the parsed output. */
export function valid<T>(value: T): ValidatorParseResult<T> {
  return ResultExtensions.ok(value);
}

/** Builds a display-safe failure preserving every field issue. */
export function invalid<T>(issues: ReadonlyArray<ValidationIssue>): ValidatorParseResult<T> {
  return ResultExtensions.fail({ ...AppErrorFactory.validation(), issues });
}

/**
 * Names a value's type for an error message. Total and hostile-input safe: a `Proxy` may trap
 * `getPrototypeOf` (which `instanceof` calls) and throw, so the object probes are guarded — a message
 * is never worth a second failure. `NaN` reports as `NaN` rather than `number`, since "expected number,
 * received number" reads as a bug.
 */
export function describeType(value: unknown): string {
  if (value === null) return 'null';

  const kind = typeof value;
  if (kind !== 'object') {
    return kind === 'number' && Number.isNaN(value) ? 'NaN' : kind;
  }

  try {
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'Date';
  } catch {
    // A trapped prototype read threw — fall through to the generic label.
  }
  return 'object';
}

/**
 * Renders an issue path in the familiar display form: `['items', 0, 'name']` → `items[0].name`.
 * A root-level issue (empty path) renders as the empty string — callers decide how to label the root.
 */
export function formatIssuePath(path: ReadonlyArray<PathSegmentKey>): string {
  let rendered = '';
  for (const segment of path) {
    if (typeof segment === 'number') rendered += `[${segment}]`;
    else if (rendered === '') rendered = segment;
    else rendered += `.${segment}`;
  }
  return rendered;
}
