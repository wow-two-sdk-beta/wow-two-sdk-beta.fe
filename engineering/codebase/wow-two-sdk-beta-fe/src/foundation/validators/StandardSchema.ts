/* eslint-disable @typescript-eslint/no-namespace */
// Standard Schema v1 spec types — https://standardschema.dev (MIT, explicitly designed for copying).
// Types-only: zero runtime, zero dependency, zero peer.
//
// WHY A SECOND COPY EXISTS: `src/formsEngine/StandardSchema.ts` holds the same vendored types, but
// `forms-engine` sits ABOVE `foundation` in the layer graph (ESLint `boundaries`: foundation may import
// foundation only). A foundation slice therefore cannot reach the spec type there, and a non-form caller
// — a boot-time config parse, a URL param, an API payload — has no business importing the forms layer
// just to describe a validated value. Vendoring the spec here puts it at the BOTTOM of the graph, where
// every layer can reach it.
//
// DIRECTION OF TRAVEL: this copy is the one that should survive. `forms-engine` can later import the spec
// type from `foundation/validators` and delete its own copy — a downward import, allowed by the boundary
// rule. The reverse was never possible. Runtime plumbing is NOT duplicated: `runStandardSchema`,
// `resultToFieldErrors`, and `issuePathToString` stay in `forms-engine/SchemaValidation.ts`, which is the
// only place that needs to fold spec issues into form-field errors.

/** The Standard Schema interface. */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  /** The Standard Schema properties. */
  readonly '~standard': StandardSchemaV1.Props<Input, Output>;
}

export declare namespace StandardSchemaV1 {
  /** The Standard Schema properties interface. */
  export interface Props<Input = unknown, Output = Input> {
    /** The version number of the standard. */
    readonly version: 1;
    /** The vendor name of the schema library. */
    readonly vendor: string;
    /** Validates unknown input values. */
    readonly validate: (value: unknown) => Result<Output> | Promise<Result<Output>>;
    /** Inferred types associated with the schema. */
    readonly types?: Types<Input, Output> | undefined;
  }

  /** The result interface of the validate function. */
  export type Result<Output> = SuccessResult<Output> | FailureResult;

  /** The result interface if validation succeeds. */
  export interface SuccessResult<Output> {
    /** The typed output value. */
    readonly value: Output;
    /** The non-existent issues. */
    readonly issues?: undefined;
  }

  /** The result interface if validation fails. */
  export interface FailureResult {
    /** The issues of failed validation. */
    readonly issues: ReadonlyArray<Issue>;
  }

  /** The issue interface of the failure output. */
  export interface Issue {
    /** The error message of the issue. */
    readonly message: string;
    /** The path of the issue, if any. */
    readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
  }

  /** The path segment interface of the issue. */
  export interface PathSegment {
    /** The key representing a path segment. */
    readonly key: PropertyKey;
  }

  /** The Standard Schema types interface. */
  export interface Types<Input = unknown, Output = Input> {
    /** The input type of the schema. */
    readonly input: Input;
    /** The output type of the schema. */
    readonly output: Output;
  }

  /** Infers the input type of a Standard Schema. */
  export type InferInput<Schema extends StandardSchemaV1> = NonNullable<Schema['~standard']['types']>['input'];

  /** Infers the output type of a Standard Schema. */
  export type InferOutput<Schema extends StandardSchemaV1> = NonNullable<Schema['~standard']['types']>['output'];
}
