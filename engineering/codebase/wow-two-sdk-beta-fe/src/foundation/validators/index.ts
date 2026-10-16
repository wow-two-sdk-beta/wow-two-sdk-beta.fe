// validation — foundation seam. A small validator layer any slice can use: build a
// validator with `string()`, `object({…})`, `array(…)`, run it with `validate(value)`, and get back
// either the parsed value or every issue with its path. No Vue, optional peers or schema library.
//
// WHY IT EXISTS, GIVEN `forms-engine` ALREADY VALIDATES: `forms-engine` speaks Standard Schema, but the
// spec type lived THERE — above `foundation` in the layer graph. A config parser, a URL-param reader, or
// an API-payload check sits below that line and cannot import upward, so until now the only options were
// hand-rolling checks per call site or pulling a schema library into a package that ships zero runtime
// dependencies. This slice puts the vocabulary at the bottom of the graph, where everything can reach it.
//
// EVERY VALIDATOR IS A STANDARD SCHEMA. Each one exposes `['~standard']` per the v1 spec, so a validator
// built here is accepted unchanged by `forms-engine` (`AppFormOptions.schema`) or by any other spec
// consumer — the same object serves a boot-time config parse and a form. Nothing needs converting, and
// `runStandardSchema` in `forms-engine/SchemaValidation.ts` is NOT duplicated here; that plumbing folds
// spec issues into form-field errors and rightly stays in the forms layer.
//
// CHOOSING BETWEEN THIS AND A SCHEMA LIBRARY: zod / valibot / arktype remain optional CONSUMER peers and
// are the right call for a large, evolving domain schema. This slice covers the boundary checks the SDK
// itself performs, where adding a dependency to a zero-dependency package is not an option.
//
// Expected invalid values return Result. Caller checks, transforms and invalid API configuration may throw.

export {
  type PathSegmentKey,
  type ValidationIssue,
  type ValidatorParseResult,
  type ValidationFailure,
  valid,
  invalid,
  describeType,
  formatIssuePath,
} from './ValidationOutcome';

export { type StandardSchemaV1 } from './StandardSchema';

export {
  type ParseFn,
  type Infer,
  type InferInput,
  Validator,
  ValidationVendor,
  toStandardResult,
  toStandardSchema,
} from './Validator';

export {
  StringValidator,
  NumberValidator,
  ExactNumberValidator,
  DateValidator,
  string,
  number,
  exactNumber,
  boolean,
  date,
  literal,
  oneOf,
} from './Primitives';

export {
  type ObjectShape,
  type InferObject,
  type InferTuple,
  ArrayValidator,
  object,
  array,
  record,
  union,
  tuple,
} from './Composites';

export { email, url, uuid, isoDate } from './Formats';

export { ValidationError, assertValid } from './ValidationError';

// Shared rule-code vocabulary + the message catalogue that renders it. The one voice a rule speaks in,
// whichever side reported it — see the header of `Messages.ts` for why this is a vocabulary and not a
// shared rule set.
export {
  type FieldIssue,
  type ValidationCode,
  type ValidationMessageContext,
  type ValidationMessageEntry,
  type ValidationMessageCatalogue,
  type ResolveValidationMessage,
  ValidationCodes,
  FluentValidationCodes,
  FluentValidationParameters,
  defaultValidationMessages,
  createMessageResolver,
} from './Messages';
