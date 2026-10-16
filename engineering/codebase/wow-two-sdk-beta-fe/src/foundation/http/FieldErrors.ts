import { FluentValidationCodes, FluentValidationParameters, type FieldIssue } from '../validators/Messages';

import { ApiError } from './ApiError';
import type { ApiFailure } from './ApiFailure';

/*
 * Reads the per-field validation failures out of a thrown error's problem body.
 *
 * TWO READERS, ONE PARSE. `fieldIssues` is the wide one — it keeps each failure's rule code and
 * operands, which is what a message catalogue keys on (`foundation/validators/Messages.ts`).
 * `fieldErrors` is the narrow one, kept for the `Record<string, string[]>` shape the forms engine has
 * always exposed; it delegates and drops everything but the message.
 *
 * WHY THE CODE WAS WORTH RESCUING: the wow-two backend already puts it on the wire —
 * `{"errors":[{"property":"Rules[0].Content.Url","message":"URL is required.","code":"NotEmptyValidator"}]}`
 * — and every client discarded it right here, which is why the client and the server could never agree
 * on the wording of a rule they both enforce.
 *
 * NORMALIZATION HAPPENS ON THIS SIDE ON PURPOSE. FluentValidation's `ErrorCode` vocabulary
 * (`NotEmptyValidator`) is not the vocabulary the client's own validators report (`required`), and one
 * catalogue cannot serve two. Translating here — rather than waiting for the server to emit the shared
 * codes — lets a form adopt the catalogue today and keeps working unchanged once the backend normalizes
 * too, since an already-shared code passes through the alias table untouched.
 */

/** Normalizes a source rule code onto the shared vocabulary, passing an unknown code through unchanged. */
function normalizeCode(code: unknown): string | undefined {
  if (typeof code !== 'string' || code.length === 0) return undefined;
  return Object.hasOwn(FluentValidationCodes, code) ? FluentValidationCodes[code] : code;
}

/** Renames a payload's operand keys onto the vocabulary's (`MaxLength` → `max`), keeping unlisted ones. */
function normalizeParams(params: unknown): Readonly<Record<string, unknown>> | undefined {
  if (params === null || typeof params !== 'object' || Array.isArray(params)) return undefined;
  const normalized: Record<string, unknown> = Object.create(null);
  let count = 0;
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    const name = Object.hasOwn(FluentValidationParameters, key) ? FluentValidationParameters[key]! : key;
    normalized[name] = value;
    count += 1;
  }
  return count > 0 ? normalized : undefined;
}

/**
 * Extracts the per-field validation failures from a thrown error — the `errors` member of an
 * {@link ApiError}'s problem body, normalized to `field → issues` with each rule code and its operands
 * preserved. Handles both the ASP.NET ValidationProblemDetails / ModelState dict (`{ field: string[] }`,
 * a bare string value counts as one message — that shape carries no code) and the wow-two backend's
 * array shape (`[{ property, message, code?, params? }]`, grouped by property). Anything else —
 * non-`ApiError`, no problem body, no `errors` member — yields `{}` so callers can map unconditionally.
 */
export function fieldIssues(error: unknown): Record<string, FieldIssue[]> {
  const failure = error instanceof ApiError ? error.failure : error;
  if (failure === null || typeof failure !== 'object' || !('problem' in failure)) return {};
  const errors = (failure as ApiFailure).problem?.errors;

  if (Array.isArray(errors)) {
    const map: Record<string, FieldIssue[]> = Object.create(null);
    for (const entry of errors as unknown[]) {
      if (entry === null || typeof entry !== 'object') continue;
      const { property, message, code, params } = entry as {
        property?: unknown;
        message?: unknown;
        code?: unknown;
        params?: unknown;
      };
      if (typeof property !== 'string' || typeof message !== 'string') continue;
      (map[property] ??= []).push({
        message,
        code: normalizeCode(code),
        params: normalizeParams(params),
      });
    }
    return map;
  }

  if (errors !== null && typeof errors === 'object') {
    const map: Record<string, FieldIssue[]> = Object.create(null);
    for (const [field, value] of Object.entries(errors)) {
      // The ModelState shape carries messages only — no code, so these never reach a catalogue entry
      // and render exactly as the server wrote them.
      const issues = (Array.isArray(value) ? value : [value])
        .filter((item): item is string => typeof item === 'string')
        .map((message) => ({ message }));
      if (issues.length > 0) map[field] = issues;
    }
    return map;
  }

  return {};
}

/**
 * Extracts the per-field validation messages from a thrown error, normalized to `field → messages` for
 * mapping onto form fields. The message-only view of {@link fieldIssues} — reach for that one when the
 * rule code matters (message catalogue, per-code UI); this stays the shape every existing caller expects.
 */
export function fieldErrors(error: unknown): Record<string, string[]> {
  const issues = fieldIssues(error);
  const map: Record<string, string[]> = Object.create(null);
  for (const [field, entries] of Object.entries(issues)) {
    map[field] = entries.map((issue) => issue.message);
  }
  return map;
}
