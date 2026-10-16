# AppForm contract

`AppFormOptions<TInput, TOutput = TInput>` separates editable values from successful schema output. `values`, fields, defaults and reset use `TInput`; `onSubmit` receives `TOutput` and returns the shared `Result`. A schema-free form uses the editing shape as its output. A transforming form supplies its schema; invalid input never bypasses that transform.

`handleSubmit` resolves a boolean UI verdict. Expected request failures remain typed `AppError` values in `state.submitError` when field messages do not represent them fully. The field mapper accepts HTTP failures through the default `fieldIssues` adapter. Unexpected delegate exceptions use a safe fallback instead of rendering exception text.

Both house and TanStack adapters validate one input snapshot and submit its corresponding parsed output. Newer editing values remain intact. Repeated submits for the active snapshot coalesce. A newer trigger queues one trailing latest snapshot; intermediate edits coalesce. A failed latest save remains dirty and does not automatically retry.

Successful saves advance the dirty baseline to the submitted input snapshot. `reset()` restores that current baseline; `reset(next)` establishes a new baseline. Reset invalidates pending completion display updates and clears queued autosave. Reset and scope disposal abort the owned submit signal, clear timers and suppress later submission callbacks. Abort is a client lifecycle signal, not a server rollback: a request already sent may still finish remotely.

The facade owns submission sequencing. TanStack owns values, field metadata and change/blur validation; the facade shares its snapshot parse with TanStack's schema validator. Native `form.engine` methods are vendor escape hatches and do not promise facade lifecycle semantics.

`validate()` validates the configured whole schema without submitting. `validate({ fields, schema })` gates a step without replacing that configured final schema: an optional step schema receives the full input snapshot, and selected paths include descendants. Root/cross-field issues always block the gate. A subset updates only selected client errors (plus root errors), retains other errors and touches only selected paths. Its boolean describes that gate, while `state.isValid` describes all currently known client/server errors; neither a passing subset nor unvalidated fields prove final validity. Final `handleSubmit` always runs the whole configured schema and submits its parsed output. Async gates return false after edits, reset, cancellation or session invalidation; obsolete issues never land. Standard Schema has no cancellation protocol, so schema execution itself may finish later.

`onSubmit(values, { signal })` receives an owned AbortSignal; pass it to the request transport. `cancelSubmit()` aborts that work, clears pending autosave, resolves the active verdict false, releases pending flags and records `AppErrorType.Cancelled` while retaining edits and the saved baseline. It suppresses late completion even when the delegate ignores abort. `invalidateSession(next?)` aborts and resets old-session work without a cancellation banner: supply the new identity's initial values (including an empty editing model on logout). Without `next`, it restores the current saved baseline; the form cannot invent a domain-specific empty model. Compose this explicit hook with the app's auth-session subscription. Await the active handleSubmit promise before an immediate replacement attempt; intervening edits/triggers coalesce through the same queue.

A form inside a dialog starts each session with `useFormDialogSession(form, { open, initialValues, onOpen })`. It calls `invalidateSession(initialValues())` whenever `open` turns true (and on setup when already open), in Vue's pre-flush, after every prop of the opening update has landed: values derived from the record prop are current even when the parent switches the record and opens the dialog in one update. A `flush: 'sync'` watcher on `open` resets from the previous record instead. Edits survive while the dialog stays open; `onOpen` clears view-local state.

`handleSubmit(event)` captures the form event's current target before awaiting. A current failed manual attempt waits for Vue's DOM update, focuses the first enabled invalid control and otherwise focuses `[data-form-error-summary]` within that form. Give the summary `tabindex="-1"` and render the actual errors there. Imperative calls supply `focusRoot: () => formElement`; no document-wide lookup occurs. Disabled/hidden/inert controls are skipped. Reset, cancellation, invalidation and disposal suppress obsolete focus. Autosave and `validate` never move focus. The view owns one coordinated announcement surface (field descriptions plus a single summary live region); the engine does not create a competing announcer.

Verification: `tests/unit/formsEngine/Submission.dom.test.ts` runs the same cases under both mounted Vue adapters; `FormsEngine.test.ts` covers path/mapping and basic state behavior.

Supported writes are `field.value`/`field.setValue`, `form.setValue`, array operations and `reset`. The `values` objects are read views; direct nested mutation is unsupported and does not notify the form. Plain objects, arrays and Date values detach at ingress and at each validation/submission boundary, so caller-held defaults or accidental direct writes cannot change a pending supported-value snapshot. Validation receives a separate copy from the saved-baseline snapshot. Editing trees must be acyclic.

File/Blob, Temporal and custom class instances are opaque immutable leaves retained by identity. Replace them through a setter; mutable class internals require a plain editing model instead. The form neither JSON-serializes these leaves nor strips their prototypes. Dirty comparison uses identity for opaque leaves.

Synchronous and asynchronous schema exceptions settle the form's boolean verdict as false with a safe validation fallback. Both validating/submitting state and the in-flight latch release, so retry can run. Expected schema issues and Standard Schema output retain their existing protocol.

## Discriminated array rows

Call `useFieldArray` with the array's complete element union. Do not claim a narrower branch through its generic.
Create a runtime-checked branch with `variant`; render its typed `Field` only while `matches` is true.

```ts
type Rule = { kind: 'fallback'; destination: string } | { kind: 'country'; country: string; destination: string };

const rules = useFieldArray<Rule>(form, 'rules');
const countryRules = rules.variant((rule): rule is Extract<Rule, { kind: 'country' }> => rule.kind === 'country');
```

```vue
<countryRules.Field v-if="countryRules.matches(row.index)" :index="row.index" name="country">
  <template #default="field"><TextInput v-model="field.value" /></template>
</countryRules.Field>
```

## Array identity and stale validation

`form.array(path).keys` owns row identity across all bindings and direct facade operations. Reorder remaps nested-array keys; scalar field edits preserve identity. Whole-row/array replacement and reset create fresh keys. `useFieldArray` renders that same canonical identity rather than a separate local registry. Invalid indices are ignored. Direct native `engine` mutations bypass this facade identity contract; use the shared array/setValue/reset APIs for rendered rows.

Async validation resolves false and cannot publish old errors when the validated values changed while awaiting the schema. Both house and TanStack adapters share this behavior.
