import type { MaybeRefOrGetter, PublicProps, Ref, VNode } from 'vue';

import type { AppError, Result } from '../foundation/results';
import type { ValidationMessageCatalogue } from '../foundation/validators';

import type { StandardSchemaV1 } from './StandardSchema';
import type { SubmitErrorMap } from './SubmitErrors';

/*
 * The facade contract every engine adapter satisfies (docs/analysis/forms-engine.md §4).
 * Contract types are engine-free; each adapter subpath (`/forms-engine/house`,
 * `/forms-engine/tanstack`) exports the same `useAppForm` over its engine.
 * Semantics are pinned by `tests/unit/formsEngine/Submission.dom.test.ts` under both Vue adapters,
 * not just by these signatures.
 *
 * THE ONE SHAPE THAT IS NOT A 1:1 PORT — THE READ PATH. React subscribed through a render prop
 * (`<form.Subscribe selector={s => s.values.style}>{style => …}</form.Subscribe>`), and reading
 * four fields meant four nested render props. In Vue, reading a reactive value inside a template
 * IS the subscription, so the facade exposes the state DIRECTLY — `form.values.style`,
 * `form.state.isSubmitting`, `form.state.submitError` — and the `Subscribe` component is gone
 * along with `AppSubscribeProps` / `AppSubscribeComponent`. Its one irreplaceable job survives as
 * {@link AppForm.useFormState}: a slice with a CUSTOM equality, which `computed` (always
 * `Object.is`) cannot express. `Field` stays a component because `provide()` needs one.
 */

/** Context for the owned submit request. Pass signal to HTTP/mutation transport. */
export interface AppFormSubmitContext {
  readonly signal: AbortSignal;
}

/** A display-only step gate. Final submission always uses the configured whole-form schema. */
export interface AppFormValidationOptions<TValues extends object> {
  /** Selected paths include descendants. Root/cross-field issues always block the gate. */
  readonly fields?: ReadonlyArray<string>;
  /** Optional current-step schema; its output is never used as final submission output. */
  readonly schema?: StandardSchemaV1<TValues, unknown>;
}

/** Defines the options every engine adapter accepts. */
export interface AppFormOptions<TValues extends object, TOutput = TValues> {
  /** Seeds detached editing containers. Async prefill uses `/query`, then `reset(data)`. */
  readonly defaultValues: TValues;
  /** The whole-form validator — any Standard Schema (zod / valibot / arktype). Sync or async. */
  readonly schema?: StandardSchemaV1<TValues, TOutput>;

  // ── validation-config cluster ───────────────────────────────────────────────
  /** When client validation runs. `'submit'` re-validates touched fields on change after the first attempt. */
  readonly validateOn?: 'change' | 'blur' | 'submit';
  /**
   * Validate once on mount — seeds `isValid` / field errors before any interaction (edit-screen
   * validity indicators, wizard step-entry gating). Fields stay untouched (`isTouched` false), so
   * the initial pass populates state without asserting the user has interacted. Default `false`.
   */
  readonly validateOnMount?: boolean;
  /** Performs the submit with valid values — usually a `useAppMutation` / `useOptimisticMutation` `mutateAsync`. */
  readonly onSubmit: (values: TOutput, context: AppFormSubmitContext) => Promise<Result<unknown>>;

  // ── submit-config cluster ───────────────────────────────────────────────────
  /**
   * What triggers a submit. `'manual'` (default) = only `handleSubmit` / the `<form @submit>` path.
   * `'change'` = any field change schedules a submit (settings / live-save); `'blur'` = submit when a
   * field blurs (save-on-blur). Auto-submits route through the SAME internal submit path as
   * `handleSubmit`, so validation, parsed output, server-error mapping, the verdict, and
   * the concurrent-submit guard all apply identically. `reset()` / `reset(data)` / prefill never
   * auto-submit — only user-origin writes do. Named `'manual'` (not `'submit'`) so it never reads as
   * a `validateOn` value.
   */
  readonly submitOn?: 'change' | 'blur' | 'manual';
  /** Trailing debounce in ms for `submitOn: 'change'`, coalescing a burst into one submit. Default `0`. */
  readonly submitDebounceMs?: number;
  /** Imperative submission focus root; native submit events supply their form automatically. */
  readonly focusRoot?: () => ParentNode | null | undefined;

  /**
   * Disables the whole form — ORs into every `form.Field`'s control-disabled flag (on top of any
   * per-field `isDisabled`) and makes `handleSubmit` / auto-submit inert. For read-only / role-locked
   * screens or a while-related-data-loads freeze. Read on every access from the latest options
   * ({@link AppFormOptionsSource}). Default `false`.
   */
  readonly isDisabled?: boolean;
  /**
   * Maps an expected submit failure to `path → failures`. Default: `fieldIssues` (ProblemDetails, both .NET
   * shapes), which keeps each failure's rule code for `messages`. A mapper returning plain strings is
   * still valid — those render as-is.
   */
  readonly mapSubmitError?: (error: unknown) => SubmitErrorMap;
  /** Rewrites a server error path onto a form path; camelCase per segment by default. */
  readonly mapFieldPath?: (serverPath: string) => string;
  /** Safe caller-authored fallback for unexpected submit/validation exceptions. Never includes exception text. */
  readonly fallbackErrorMessage?: string;

  // ── message-catalogue cluster ───────────────────────────────────────────────
  /**
   * Overrides the wording of individual rule codes, merged over `defaultValidationMessages`.
   *
   * The point is ONE voice per rule: a failure the client caught and the same failure the server caught
   * render from the same entry, instead of "Name is required" from one side and "'Name' must not be
   * empty." from the other. Server codes are normalized onto the shared vocabulary on read
   * (`foundation/http` `fieldIssues`), so both sides reach the same key.
   *
   * Applies to server failures always, and to client failures when the schema is a
   * `foundation/validators` validator — a third-party spec schema's codes are erased by the spec, so its
   * messages render as the schema authored them. An unknown code falls back to the source's own message,
   * which is why wiring this can never render a form worse than not wiring it.
   *
   * i18n: swap the whole table per locale off `foundation/i18n`'s `LocaleContext`.
   */
  readonly messages?: ValidationMessageCatalogue;
  /**
   * Display labels per field path, prefixed to a catalogue-rendered message (`rules[].destination` also
   * matches every row). Omitted, messages render as bare fragments — correct under a labelled control,
   * which is why this is opt-in rather than required.
   */
  readonly labels?: Readonly<Record<string, string>>;
}

/**
 * How `useAppForm` receives its options. React re-read `options` on every render (latest-ref);
 * Vue's `setup()` runs once, so the reactive source has to be named: pass a getter (or a ref, or a
 * `reactive()` object) when an option must stay live — a swapped `schema`, a role-driven
 * `isDisabled`, a `messages` table that follows the locale. A plain object literal is read once,
 * which is the right default for `defaultValues` + a closure `onSubmit`.
 */
export type AppFormOptionsSource<TValues extends object, TOutput = TValues> = MaybeRefOrGetter<
  AppFormOptions<TValues, TOutput>
>;

/** The per-field API a `<form.Field>` slot receives. Every member is a live getter, so bind to the object. */
export interface AppFieldApi<TValue> {
  /**
   * The field's value. Writable — assigning runs the same path as {@link setValue}, so a control
   * binds with `v-model="field.value"` and needs no `@update` handler. (React exposed a read-only
   * `value` plus `setValue`; both spellings are kept, per the port's keep-React's-name rule.)
   */
  value: TValue;
  readonly setValue: (value: TValue) => void;
  /** Marks the field touched — the Field glue also wires it onto the control's blur. */
  readonly onBlur: () => void;
  /** Client + server messages merged (client first); server messages clear on the next change to the field. */
  readonly errors: ReadonlyArray<string>;
  readonly isDirty: boolean;
  readonly isTouched: boolean;
}

/**
 * The reactive form state. Read a member and you are subscribed — `form.state.isSubmitting` in a
 * template re-renders that template alone when it flips. Every member is a LIVE getter, so
 * destructuring takes a snapshot; bind to the object (`form.state`), or reach for
 * {@link AppForm.useFormState} when a `Ref` is what's wanted.
 */
export interface AppFormState<TValues> {
  /** Read view: write through fields/setValue/array/reset; nested mutation bypasses form notifications. */
  readonly values: TValues;
  readonly isDirty: boolean;
  readonly isValid: boolean;
  readonly isSubmitting: boolean;
  readonly isValidating: boolean;
  /** The submit failure whose mapped paths matched no field — feed the form-level `Alert`. */
  readonly submitError: AppError | null;
  /**
   * The last completed submit's verdict as a reactive slice — `true` when validation passed
   * AND `onSubmit` returned success, `false` on validation/request failure, `null` before
   * the first completed attempt and after `reset()`. Cancellation resolves false with a typed cancelled failure.
   * Mirrors `handleSubmit`'s resolved value,
   * so the imperative return and this slice never disagree (success banners read here).
   */
  readonly isSubmitSuccessful: boolean | null;
}

/**
 * Resolves the field value type for a path: top-level keys infer `TValues[name]`;
 * deeper dot/index paths stay `unknown` — loose string paths are the documented
 * contract (typed values, untyped paths), deep typed paths are the tanstack
 * adapter's escape-hatch territory.
 */
export type AppFieldValue<TValues, TPath extends string> = TPath extends keyof TValues ? TValues[TPath] : unknown;

/**
 * The path a field binds — a key of `TValues`, or any other string (`rules[0].destination`).
 *
 * The `(string & {})` half is load-bearing, not decoration. Constrain the type parameter to a
 * plain `string` and `vue-tsc` widens the literal in `name="title"` to `string` when it resolves
 * the tag, so {@link AppFieldValue} falls through to `unknown` and EVERY slot payload silently
 * loses its type — a plain `.ts` call site infers it correctly, which is what makes the
 * regression invisible without a template test. A constraint that contains literal types
 * suppresses that widening. It also earns the editor's completion list for the known keys.
 */
export type AppFieldPath<TValues> = (keyof TValues & string) | (string & {});

/** The props `<form.Field>` accepts — the per-mode control flags (R12); the control renders in its default slot. */
export interface AppFieldProps<TPath extends string = string> {
  /** The field path — a top-level key or a dot/index path (`rules[0].destination`). */
  readonly name: TPath;
  /** The per-mode disabled flag, exposed to the control via `FormControlContext`. */
  readonly isDisabled?: boolean;
  /** The per-mode required flag, exposed to the control via `FormControlContext`. */
  readonly isRequired?: boolean;
  /** The per-mode read-only flag, exposed to the control via `FormControlContext`. */
  readonly isReadOnly?: boolean;
}

/**
 * Field wrapper — always provides `FormControlContext` (id / labelId / errorId / isInvalid /
 * `errors` / isDisabled / isRequired) so the control + chrome auto-wire aria. Label / helper
 * chrome stays with the presentation `Field` composed inside the slot — it ADOPTS this
 * provider (same ids, inherited flags) and renders the context `errors` without
 * `:error="f.errors[0]"` hand-wiring.
 *
 * ```vue
 * <form.Field name="url" v-slot="f">
 *   <Field label="Destination">
 *     <UrlInput v-model="f.value" @blur="f.onBlur" />
 *   </Field>
 * </form.Field>
 * ```
 *
 * Typed as a constructor so `TPath` is inferred per usage and the slot payload narrows with it —
 * the same shape `@tanstack/vue-form` types its own `Field` with, and what `vue-tsc` reads a
 * component's props/slots off.
 */
export interface AppFieldComponent<TValues extends object> {
  new <TPath extends AppFieldPath<TValues>>(
    props: AppFieldProps<TPath>,
  ): {
    $props: AppFieldProps<TPath> & PublicProps;
    $slots: { default?: (field: AppFieldApi<AppFieldValue<TValues, TPath>>) => VNode[] };
  };
}

/** Array helpers at a path. Invalid indices are ignored; identity follows structural operations. */
export interface AppArrayApi {
  /** Canonical row keys; reset and whole-row/array replacement create fresh identities. */
  readonly keys: ReadonlyArray<string>;
  readonly push: (value: unknown) => void;
  readonly insert: (index: number, value: unknown) => void;
  readonly remove: (index: number) => void;
  readonly swap: (indexA: number, indexB: number) => void;
  readonly move: (fromIndex: number, toIndex: number) => void;
}

/** What `useAppForm` returns — identical across engines; `TEngine` types the escape hatch. */
export interface AppForm<TValues extends object, TEngine = unknown> {
  /** Field wrapper — always provides `FormControlContext` (id / labelId / errorId / isInvalid / `errors` /
   *  isDisabled / isRequired); the presentation `Field` composed inside the slot adopts it, so
   *  label/helper/error chrome renders from one provider with zero hand-wiring. */
  readonly Field: AppFieldComponent<TValues>;
  /**
   * The reactive form state — the read path. `form.state.isSubmitting` inside a template or a
   * `computed` subscribes to that member alone; no selector, no render prop, no nesting to read
   * four fields. Live getters: bind to `form.state`, never destructure it.
   */
  readonly state: AppFormState<TValues>;
  /** The current values — the shorthand for `form.state.values`, and the same subscription (`form.values.style`). */
  /** Read view: write through fields/setValue/array/reset; nested mutation bypasses form notifications. */
  readonly values: TValues;
  /**
   * A state slice as a `Ref` — for a `watch` source, and for the one case reactivity alone cannot
   * express: a COMPOSITE selection with a custom `isEqual`. `computed` always compares with
   * `Object.is`, so `() => ({ a, b })` invalidates every downstream effect on any store commit;
   * pass `isEqual` (a shallow-equal) and the previous slice is kept, so nothing downstream re-runs.
   * Plain single-member reads want `form.state` instead — this is the `Subscribe` replacement, not
   * the everyday read path.
   */
  readonly useFormState: <TSlice>(
    selector: (state: AppFormState<TValues>) => TSlice,
    isEqual?: (a: TSlice, b: TSlice) => boolean,
  ) => Readonly<Ref<TSlice>>;
  /**
   * Validates, runs `onSubmit`, applies mapped server errors to fields, leaves the remainder
   * in `submitError`. Resolves the verdict — `true` iff validation passed AND `onSubmit`
   * returned success; `false` on validation/request failure or cancellation. Never rejects, so a
   * `<form @submit="form.handleSubmit">` handler ignores the return while an imperative caller
   * (a wizard-step gate) branches on it. The reactive mirror is `state.isSubmitSuccessful`.
   */
  readonly handleSubmit: (event?: Event) => Promise<boolean>;
  /** Validates all values or a step/subset without submitting; touches only selected paths. */
  readonly validate: (options?: AppFormValidationOptions<TValues>) => Promise<boolean>;
  /** Aborts the owned request and pending autosave; retains edits, records a cancelled failure. */
  readonly cancelSubmit: () => void;
  /** Invalidates old-session work and resets to the supplied new-session values or saved baseline. */
  readonly invalidateSession: (next?: TValues) => void;
  /**
   * Writes a value at a path outside a `<form.Field>` slot — cross-field / derived
   * writes (name → slug) and sibling-group writes. Top-level keys are typed to their value;
   * deeper dot/index paths accept `unknown` (the typed-values / untyped-paths contract rule,
   * mirroring {@link AppFieldValue}). Clears that field's server error like an in-field edit
   * and runs change-time validation under the active `validateOn`.
   */
  readonly setValue: <TPath extends AppFieldPath<TValues>>(path: TPath, value: AppFieldValue<TValues, TPath>) => void;
  /** Array helpers at a path — `push` / `insert` / `remove` / `swap` / `move` (R8). */
  readonly array: (path: string) => AppArrayApi;
  /** Restores the current saved baseline, or establishes `next` as the new editing baseline. */
  readonly reset: (next?: TValues) => void;
  /** Applies server field errors outside the submit pipeline, replacing the current server-error overlay. */
  readonly setFieldErrors: (errors: Record<string, ReadonlyArray<string>>) => void;
  /** Clears the form-level `submitError` (a dismissible error banner's reset) — leaves field errors untouched. */
  readonly clearSubmitError: () => void;
  /** ESCAPE HATCH — the native engine form instance. See the 90/10 rule in docs/analysis/forms-engine.md §4. */
  readonly engine: TEngine;
}

/** The module contract every adapter satisfies — enforced by the conformance suite, swapped by import path. */
export interface FormEngine {
  useAppForm<TValues extends object, TOutput = TValues>(
    options: AppFormOptionsSource<TValues, TOutput>,
  ): AppForm<TValues>;
}
