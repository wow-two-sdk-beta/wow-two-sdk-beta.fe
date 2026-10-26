import { fieldIssues } from './FieldErrors';
import type { ProblemDetails } from './models/ProblemDetails';

/** Defines how display text is read from a problem-details body. */
export interface ProblemTextOptions {
  /** Reads the first field message before `detail` and `title`. Default `true`. */
  readonly fields?: boolean;

  /** The display label per field property; a labelled field message reads `{label}: {message}`. */
  readonly labels?: Readonly<Record<string, string>>;

  /** The longest text shown; longer text reads as diagnostics and is skipped. Default 300. */
  readonly maxLength?: number;

  /** A prefix a reader should not see (`/^Deployment rejected: /`); removed before the length check. */
  readonly strip?: RegExp;
}

/** Extends `ProblemDetails` with the reads a failure message needs. */
export const ProblemDetailsExtensions = {
  /** @internal The longest server text shown when the caller sets no `maxLength`. */
  MaxTextLength: 300,

  /** @internal Control characters and bidirectional overrides, removed from server text. */
  ControlCharacters: /[\p{Cc}‪-‮⁦-⁩]/gu,

  /**
   * Reads the problem-details body a failure carries — an `ApiFailure`, an `ApiError` or any `AppError` with a
   * `problem` member — or `null` when it carries none.
   */
  of(failure: unknown): Readonly<ProblemDetails> | null {
    if (failure === null || typeof failure !== 'object' || !('problem' in failure)) return null;
    const problem: unknown = failure.problem;
    return problem !== null && typeof problem === 'object' && !Array.isArray(problem)
      ? (problem as Readonly<ProblemDetails>)
      : null;
  },

  /**
   * Reads the text a person can read from a problem: the first field message (both the wow-two `errors` array and the
   * ASP.NET `errors` map), else `detail`, else `title`. Each candidate loses control and bidirectional-override
   * characters and the `strip` prefix,
   * is trimmed, and is skipped when empty or longer than `maxLength`; `undefined` when none remains.
   */
  text(problem: Readonly<ProblemDetails> | null | undefined, options: ProblemTextOptions = {}): string | undefined {
    if (!problem) return undefined;

    const maxLength = options.maxLength ?? ProblemDetailsExtensions.MaxTextLength;
    const clean = (value: unknown): string | undefined => {
      if (typeof value !== 'string') return undefined;
      let text = value.replace(ProblemDetailsExtensions.ControlCharacters, '');
      if (options.strip) text = text.replace(options.strip, '');
      text = text.trim();
      return text.length > 0 && text.length <= maxLength ? text : undefined;
    };

    if (options.fields !== false) {
      for (const [property, issues] of Object.entries(fieldIssues({ problem }))) {
        for (const issue of issues) {
          const message = clean(issue.message);
          if (message === undefined) continue;
          const label =
            options.labels !== undefined && Object.hasOwn(options.labels, property)
              ? options.labels[property]
              : undefined;
          return label ? `${label}: ${message}` : message;
        }
      }
    }

    return clean(problem.detail) ?? clean(problem.title);
  },
} as const;
