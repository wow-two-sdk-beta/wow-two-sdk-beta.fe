import { AppErrorFactory, type AppError } from '../foundation/results';
import type { FieldIssue, ResolveValidationMessage } from '../foundation/validators';

import { formatPath, parsePath } from './Paths';

/*
 * Server-error → form wiring shared by every adapter (R5): map a thrown submit error
 * to `path → issues` (default: `foundation/http` `fieldIssues`, both .NET shapes),
 * rewrite each server path onto a form path, land matches on fields, and coerce the
 * remainder into the form-level `submitError`.
 *
 * WHY ENTRIES ARE `string | FieldIssue`: the default mapper now keeps each failure's rule code, so a
 * message catalogue can re-render it in the client's voice (`foundation/validators/Messages.ts`). A
 * custom `mapSubmitError` that still returns plain strings stays valid — a string is read as a
 * code-less issue, which resolves to itself. Adopting the catalogue is therefore additive at every
 * call site, and a form that ignores it behaves exactly as it did before.
 */

/** One mapped failure: a bare message, or the wide form carrying its rule code and operands. */
export type SubmitFieldEntry = string | FieldIssue;

/** What a `mapSubmitError` returns — server path → its failures. */
export type SubmitErrorMap = Record<string, ReadonlyArray<SubmitFieldEntry>>;

/** Rewrites a server error path onto a form path, camelCasing each property segment. */
export function defaultMapFieldPath(serverPath: string): string {
  const segments = parsePath(serverPath).map((segment) =>
    typeof segment === 'string' && segment.length > 0 ? segment.charAt(0).toLowerCase() + segment.slice(1) : segment,
  );
  return formatPath(segments);
}

/** Converts unexpected delegate throws into a safe failure without rendering exception text. */
export function toSubmitError(_error: unknown, fallbackMessage?: string): AppError {
  const failure = AppErrorFactory.unexpected();
  return fallbackMessage ? { ...failure, message: fallbackMessage } : failure;
}

/** The outcome of resolving a thrown submit error: per-field server errors + the form-level remainder. */
export interface SubmitFailureResolution {
  /** Mapped messages whose form path matched a field — apply as the server-error overlay. */
  readonly fieldErrors: Record<string, ReadonlyArray<string>>;
  /** The coerced failure when fields did not fully represent it; `null` when every mapped path landed. */
  readonly submitError: AppError | null;
}

/** Widens a mapped entry to the issue shape — a bare string is a failure that reported no rule code. */
function toIssue(entry: SubmitFieldEntry): FieldIssue {
  return typeof entry === 'string' ? { message: entry } : entry;
}

/**
 * Resolves a thrown submit error: `mapSubmitError` → `mapFieldPath` per entry →
 * partition by `isKnownField`. Matches become field errors; if nothing matched — or
 * some messages could not be placed — the coerced error also lands in `submitError`
 * so no server message silently disappears.
 *
 * `resolveMessage` renders each failure through the form's message catalogue
 * (`createMessageResolver`); omitted, every failure renders the message the server sent. Resolution
 * runs AFTER the path rewrite, so a catalogue entry sees the form path its label is keyed by.
 */
export function resolveSubmitFailure(
  error: AppError,
  mapSubmitError: (error: unknown) => SubmitErrorMap,
  mapFieldPath: (serverPath: string) => string,
  isKnownField: (path: string) => boolean,
  _fallbackMessage?: string,
  resolveMessage?: ResolveValidationMessage,
): SubmitFailureResolution {
  const mapped = mapSubmitError(error);
  const matched: Record<string, string[]> = Object.create(null);
  let unplaced = false;
  for (const [serverPath, entries] of Object.entries(mapped)) {
    const formPath = mapFieldPath(serverPath);
    if (isKnownField(formPath)) {
      const messages = entries.map((entry) => {
        const issue = toIssue(entry);
        return resolveMessage ? resolveMessage(issue, formPath) : issue.message;
      });
      (matched[formPath] ??= []).push(...messages);
    } else {
      unplaced = true;
    }
  }
  const hasMatches = Object.keys(matched).length > 0;
  return {
    fieldErrors: matched,
    submitError: !hasMatches || unplaced ? error : null,
  };
}
