// The shared rule-code vocabulary and the message catalogue that renders it. This slice's reason to
// exist is NOT to save strings — it is to make the client and the server speak with ONE voice for one
// rule. A user who reads "Name is required" from the client and "'Name' must not be empty." from the
// server is hearing two voices for the same failure, and that is the drift that actually shows.
//
// WHY A VOCABULARY, NOT A SHARED RULE SET: each layer validates its own scope and neither delegates
// (`conventions/development/backend/foundation/validators.md` § Layer independence). Sharing rule
// DEFINITIONS would break that; sharing the machine tag a rule reports does not — a tag is presentation
// metadata, not authority. Client rules stay a latency optimisation; the server stays the authority.
//
// WHY THE SERVER MESSAGE IS THE FALLBACK, NEVER THE OVERRIDE: adoption has to be incremental. A code
// this catalogue does not know renders the message the server already sent, so wiring the catalogue can
// never make a form worse — the worst case is the behaviour that existed before it.
//
// WHY PARAMS EXIST: a catalogue entry that cannot reach the `50` in "at most 50 characters" can only
// emit parameterless strings, which is a catalogue that cannot replace the messages it is meant to
// replace. Every built-in refinement therefore reports its own limits alongside its code.
//
// TWO VOCABULARIES MEET HERE. The house validators report `min` / `max` / `pattern`; FluentValidation
// reports `MinimumLengthValidator` / `MaximumLengthValidator` / `RegularExpressionValidator`. Neither is
// wrong and neither wins by default — `FluentValidationCodes` normalizes the server's onto this one so
// a single catalogue serves both. The alias pass lives on the CLIENT deliberately: it lets a form adopt
// the catalogue before the backend normalizes anything, and it keeps working unchanged afterwards.

import { ExactNumber } from '../numbers';

/** A field-level failure widened to carry its machine tag — the channel a catalogue can key on. */
export interface FieldIssue {
  /** The authoring or server message. Always present; used verbatim when no catalogue entry matches. */
  readonly message: string;
  /** The normalized rule code (`required`, `min`, `pattern`, …). Absent when the source reported none. */
  readonly code?: string;
  /** The rule's own operands (`{ max: 50 }`), normalized to the vocabulary's names. */
  readonly params?: Readonly<Record<string, unknown>>;
}

/**
 * The rule codes this ecosystem speaks. The client's own validators report a subset (`type`, `min`,
 * `pattern`, …); the rest arrive from the server. Kept as one flat union because a catalogue keys on it
 * and a split would mean two lookups for one concept.
 */
export const ValidationCodes = [
  // shape / presence
  'required',
  'type',
  'mustBeNull',
  'mustBeEmpty',
  // size
  'min',
  'max',
  'length',
  'integer',
  'precision',
  // comparison
  'greaterThan',
  'lessThan',
  'between',
  'betweenExclusive',
  'equal',
  'notEqual',
  // shape membership
  'literal',
  'oneOf',
  'union',
  // format
  'pattern',
  'email',
  'url',
  'uuid',
  'isoDate',
  'creditCard',
  // escape hatches
  'custom',
  'transform',
  'internal',
] as const;

/** A member of the shared rule-code vocabulary. */
export type ValidationCode = (typeof ValidationCodes)[number];

/**
 * Maps FluentValidation's `ErrorCode` onto the shared vocabulary. Covers the built-in validators whose
 * failures reach a form; anything absent falls through with its raw code, which simply misses the
 * catalogue and renders the server's own message.
 */
export const FluentValidationCodes: Readonly<Record<string, ValidationCode>> = Object.freeze({
  NotEmptyValidator: 'required',
  NotNullValidator: 'required',
  NullValidator: 'mustBeNull',
  EmptyValidator: 'mustBeEmpty',
  MinimumLengthValidator: 'min',
  MaximumLengthValidator: 'max',
  ExactLengthValidator: 'length',
  LengthValidator: 'length',
  RegularExpressionValidator: 'pattern',
  EmailValidator: 'email',
  CreditCardValidator: 'creditCard',
  EnumValidator: 'oneOf',
  GreaterThanValidator: 'greaterThan',
  GreaterThanOrEqualValidator: 'min',
  LessThanValidator: 'lessThan',
  LessThanOrEqualValidator: 'max',
  InclusiveBetweenValidator: 'between',
  ExclusiveBetweenValidator: 'betweenExclusive',
  EqualValidator: 'equal',
  NotEqualValidator: 'notEqual',
  ScalePrecisionValidator: 'precision',
  PredicateValidator: 'custom',
  AsyncPredicateValidator: 'custom',
});

/**
 * Maps FluentValidation's message placeholders onto the vocabulary's param names, so one catalogue entry
 * reads the same operand whichever side reported it. Unlisted placeholders pass through unchanged —
 * `PropertyName` deliberately among them, since the label is resolved from the form, not the payload.
 */
export const FluentValidationParameters: Readonly<Record<string, string>> = Object.freeze({
  MinLength: 'min',
  MaxLength: 'max',
  TotalLength: 'length',
  ComparisonValue: 'comparison',
  ComparisonProperty: 'comparisonLabel',
  From: 'from',
  To: 'to',
  ExpectedPrecision: 'precision',
  ExpectedScale: 'scale',
});

/** What a catalogue entry renders from. */
export interface ValidationMessageContext {
  /** The normalized rule code that failed. */
  readonly code: string;
  /** The rule's operands, vocabulary-named. Empty when the source reported none. */
  readonly params: Readonly<Record<string, unknown>>;
  /** The form path the failure is filed under; `''` for a form-level failure. */
  readonly path: string;
  /** The field's display label, when the form named one. Absent means render label-free. */
  readonly label?: string;
  /** The originating message — return this to defer to the source. */
  readonly message: string;
}

/** Renders one rule code into user-facing text. */
export type ValidationMessageEntry = (context: ValidationMessageContext) => string;

/** A code → renderer table. Partial by design: an unlisted code falls back to the source's message. */
export type ValidationMessageCatalogue = Readonly<Record<string, ValidationMessageEntry>>;

/** Resolves one issue at one path into the string a field renders. */
export type ResolveValidationMessage = (issue: FieldIssue, path: string) => string;

/** Reads a numeric operand, tolerating the string form a JSON payload may carry. */
function operand(params: Readonly<Record<string, unknown>>, key: string): string | null {
  const value = Object.hasOwn(params, key) ? params[key] : undefined;
  if (ExactNumber.isExactNumber(value)) return value.toString();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string' && value.length > 0) return value;
  return null;
}

/** Pluralizes the character-count fragments the size rules share. */
function characters(count: string): string {
  return `${count} character${count === '1' ? '' : 's'}`;
}

/** Pluralizes the item-count fragments the collection size rules share. */
function items(count: string): string {
  return `${count} item${count === '1' ? '' : 's'}`;
}

/**
 * The English voice for the vocabulary. Entries are FRAGMENTS, not sentences — a field message renders
 * under its own labelled control, so "must be at least 2 characters" reads correctly and repeating the
 * label there is noise. A form that supplies `labels` gets the label prefixed by `createMessageResolver`,
 * which is the form-level and cross-field case where the fragment alone would be unaddressed.
 *
 * An entry that cannot render (its operand never arrived) returns `context.message`, so a half-populated
 * payload degrades to the source's wording instead of to "must be at most undefined".
 */
export const defaultValidationMessages: ValidationMessageCatalogue = Object.freeze({
  required: () => 'is required',
  type: (context) => context.message,
  mustBeNull: () => 'must be empty',
  mustBeEmpty: () => 'must be empty',

  min: (context) => {
    const limit = operand(context.params, 'min');
    if (limit === null) return context.message;
    switch (operand(context.params, 'unit')) {
      case 'characters':
        return `must be at least ${characters(limit)}`;
      case 'items':
        return `must have at least ${items(limit)}`;
      case 'instant':
        return `must be on or after ${limit}`;
      default:
        return `must be at least ${limit}`;
    }
  },
  max: (context) => {
    const limit = operand(context.params, 'max');
    if (limit === null) return context.message;
    switch (operand(context.params, 'unit')) {
      case 'characters':
        return `must be at most ${characters(limit)}`;
      case 'items':
        return `must have at most ${items(limit)}`;
      case 'instant':
        return `must be on or before ${limit}`;
      default:
        return `must be at most ${limit}`;
    }
  },
  length: (context) => {
    const exact = operand(context.params, 'length');
    if (exact === null) return context.message;
    if (operand(context.params, 'unit') === 'items') return `must have exactly ${items(exact)}`;
    return `must be exactly ${characters(exact)}`;
  },
  integer: () => 'must be a whole number',
  precision: (context) => {
    const scale = operand(context.params, 'scale');
    return scale === null ? context.message : `must have at most ${scale} decimal places`;
  },

  greaterThan: (context) => {
    const comparison = operand(context.params, 'comparison');
    return comparison === null ? context.message : `must be greater than ${comparison}`;
  },
  lessThan: (context) => {
    const comparison = operand(context.params, 'comparison');
    return comparison === null ? context.message : `must be less than ${comparison}`;
  },
  between: (context) => {
    const from = operand(context.params, 'from');
    const to = operand(context.params, 'to');
    return from === null || to === null ? context.message : `must be between ${from} and ${to}`;
  },
  betweenExclusive: (context) => {
    const from = operand(context.params, 'from');
    const to = operand(context.params, 'to');
    return from === null || to === null ? context.message : `must be between ${from} and ${to}, exclusive`;
  },
  equal: (context) => {
    const comparison = operand(context.params, 'comparison');
    return comparison === null ? context.message : `must equal ${comparison}`;
  },
  notEqual: (context) => {
    const comparison = operand(context.params, 'comparison');
    return comparison === null ? context.message : `must not equal ${comparison}`;
  },

  literal: (context) => context.message,
  oneOf: (context) => context.message,
  union: (context) => context.message,

  pattern: (context) => context.message,
  email: () => 'must be a valid email address',
  url: () => 'must be a valid URL',
  uuid: () => 'must be a valid UUID',
  isoDate: () => 'must be a valid ISO date (YYYY-MM-DD)',
  creditCard: () => 'must be a valid card number',

  custom: (context) => context.message,
  transform: (context) => context.message,
  internal: (context) => context.message,
});

const EmptyParameters: Readonly<Record<string, unknown>> = Object.freeze({});

/**
 * Strips array indices so one label serves every row: `rules[0].destination` → `rules[].destination`.
 * Looked up only after the exact path misses, so a per-row override stays possible.
 */
function toLabelKey(path: string): string {
  return path.replace(/\[\d+\]/g, '[]');
}

/**
 * Builds the resolver the form engines call for every message they are about to render.
 *
 * Resolution order per issue: the caller's catalogue → {@link defaultValidationMessages} → the issue's
 * own message. A known label is prefixed to the rendered fragment; an unlabelled field renders the
 * fragment alone, which is what every message in this SDK did before a catalogue existed.
 *
 * `catalogue` is MERGED over the defaults rather than replacing them, so overriding one code's wording —
 * or translating a handful — never silently drops the rest of the vocabulary.
 */
export function createMessageResolver(
  catalogue?: ValidationMessageCatalogue,
  labels?: Readonly<Record<string, string>>,
): ResolveValidationMessage {
  const table: ValidationMessageCatalogue = catalogue
    ? { ...defaultValidationMessages, ...catalogue }
    : defaultValidationMessages;

  return (issue, path) => {
    const code = issue.code;
    const entry = code !== undefined && Object.hasOwn(table, code) ? table[code] : undefined;
    const labelKey = toLabelKey(path);
    const label =
      labels === undefined
        ? undefined
        : Object.hasOwn(labels, path)
          ? labels[path]
          : Object.hasOwn(labels, labelKey)
            ? labels[labelKey]
            : undefined;
    if (entry === undefined) return issue.message;

    let rendered: string;
    try {
      rendered = entry({
        code: code as string,
        params: issue.params ?? EmptyParameters,
        path,
        label,
        message: issue.message,
      });
    } catch {
      // A caller-supplied entry threw. A message is never worth a second failure — defer to the source.
      return issue.message;
    }

    if (typeof rendered !== 'string' || rendered.length === 0) return issue.message;
    return label === undefined || rendered === issue.message ? rendered : `${label} ${rendered}`;
  };
}
