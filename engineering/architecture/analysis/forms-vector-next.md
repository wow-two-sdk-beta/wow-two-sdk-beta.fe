# Forms vector — maturation plan (F-2)

*Last updated: 2026-07-11*

> **F-2a SHIPPED (2026-07-11)** with one design deviation: the chrome seam is the foundation `FormControlContext` (chrome *registration*:
> `registerChrome`/`useFormControlChrome`, provider adoption, `errors` in context) — NOT `label`/`helper` props on `AppFieldProps` (module→presentation
> is boundaries-forbidden; those props would be unrenderable by the module). Conformance grew 34→36. §4 F-2a row + §5 "Chrome" bullet read with this
> substitution.

> Iteration plan for maturing the forms/fields/validation vector after the engine shipped (W2-a). Feeds `docs/planning.md` row **F-2**. Method mirrors how the testing vector matured (`docs/testing.md`): audit → gap table → sized iterations → explicit, checkable DONE definition.
>
> Inputs: [`forms-engine.md`](./forms-engine.md) (shipped design, R1–R13, phased plan) · `src/forms-engine/**` source read · `src/presentation/forms/` 73-folder audit (grep `useFormControl` + per-component composition check) · [`frontend-modules-products.md`](./frontend-modules-products.md) §1–2 form rows · `targets.md` §2.2 i18n verdicts.

---

## 1. Current-state snapshot

**Shipped (W2-a, 2026-07-11, v0.0.92):**

- Contract types (`AppForm.ts`) · engine-free `Field`/`Subscribe` glue (`FormGlue.tsx`, mounts `FormControlProvider`) · shared pipeline utils (`Paths`, `DeepEqual`, `SchemaValidation`, `SubmitErrors`) · vendored `StandardSchemaV1` (zero runtime dep).
- Two adapters: `house` (~400 LOC, scope ceiling documented in-module) · `tanstack` (~600 LOC, optional peer `@tanstack/react-form ^1.33.1`). Exports wired: `./forms-engine{,/house,/tanstack}`.
- **34-case conformance suite** (`conformance/FormEngineContract.shared.tsx`) green on both adapters — field state, validateOn timing, submit pipeline (both .NET error shapes, partial-match, path remap), error merge, `setFieldErrors`, reset/prefill, array ops incl. row-scoped error follow, selector subscription, `FormControlContext` flags, async schema.

**Design-plan drift (forms-engine.md §8 v1 items):** 1–3 done · item 4 **half** — conformance yes, interaction stories + docs page **no** (zero `*.stories.tsx` reference `useAppForm`) · item 5 proof migrations **not started** · v1.1 (smart-qr stress, focus-first-invalid, unsaved-changes recipe, `create-repo` stamp) all open.

**Contract ≠ doc sketch:** §6 sketch shows `<form.Field name label>` — shipped `AppFieldProps` has **no `label`/`helper`**; apps must hand-compose presentation `Field` inside the render prop, mounting a **second** `FormControlProvider` that shadows the glue's (and requires manually passing `error={f.errors[0]}` or `isInvalid` never reaches the control).

---

## 2. Field-integration audit (73 folders in `src/presentation/forms/`)

Headline: **20 wired direct · 3 wired transitively · 3 composites with an id-precedence bug · 31 interactive controls unwired · 15 out of scope · 1 provider (`field`)**.

| Bucket | Count | Components |
|---|---|---|
| **Wired direct** (read `useFormControl`: id / aria-invalid / aria-describedby / disabled / required / readOnly — `TextInput` is the canonical block) | 20 | 17 controls: `checkbox` `colorField` `dateField` `emailInput` `maskedInput` `numberInput` `passwordInput` `radio` `searchInput` `select` `slider` `switch` `telInput` `textInput` `textAreaInput` `timeField` `urlInput` + 3 chrome consumers: `label` `formErrorMessage` `formHelperText` |
| **Wired transitively** (compose a wired atom, props pass through) | 3 | `currencyInput` `percentInput` (wrap `NumberInput`) · `labeledInput` (wraps `TextInput`+`Label`) |
| **Id-precedence bug** (compose wired atom but `useId()` + explicit `id` overrides `ctx.id` → `Field`-rendered `Label htmlFor` misses the control) | 3 | `checkboxField` `radioField` `switchField` — fix: `id ?? ctx?.id ?? generated` |
| **Unwired interactive** (the sweep — §below) | 31 | six fix families |
| **Out of scope** (chrome / layout / inline widgets / organisms — no per-field control semantics) | 15 | `field`(provider counted separately)… actual list: `fieldset` `legend` `inputAddon` `inputGroup` `characterCount` `passwordStrength` `colorSwatch` `calendar` `rangeCalendar` `wizard` `stepper` `emojiSizeControl` `reactionPicker` `listbox` `chatComposer` |

### Sweep families (31 components — same-fix batching, a11y-sweep style)

| Family | Fix shape (one pattern per family) | Components | n |
|---|---|---|---|
| **1 — popover-trigger pickers** | trigger `<button>` adopts the TextInput ctx block (id, disabled, aria-invalid, aria-describedby); note: `../select` imports here are **style-only** (`selectTriggerVariants`), not composition | `datePicker` `dateRangePicker` `timePicker` `multiSelect` `colorPicker` `fontPicker` `iconPicker` `emojiPicker` `keyboardShortcutPicker` `colorSwatchPicker` | 10 |
| **2 — inline text-composites** | root container + inner `<input>` read ctx; existing `isInvalid`/`state` props stay as overrides (`tagsInput` already takes `isInvalid` — prop, not ctx) | `combobox` `tagsInput` `pinInput` `phoneInput` `editable` | 5 |
| **3 — ARIA slider widgets** | `role="slider"` node: `aria-labelledby={ctx.labelId}`, aria-invalid/describedby, disabled (wired `slider` atom = exemplar) | `colorArea` `colorSlider` `colorWheel` `knob` | 4 |
| **4 — grouped choices** | group/fieldset node: `aria-labelledby`/`aria-describedby` from ctx, invalid+disabled propagation to items | `checkboxGroup` `radioGroup` `choiceCard` `gradientPicker` `recurrenceEditor` `cronInput` `addressForm` | 7 |
| **5 — editor surfaces** | inner `<textarea>`/input reads ctx | `codeEditor` `jsonEditor` `markdownEditor` | 3 |
| **6 — file controls** | dropzone `role="button"` + hidden input read ctx (disabled today is prop-only) | `fileUpload` `filePicker` | 2 |

**Glue-side defects found (fix before/with the sweep):**

- **Double-provider composition** — `form.Field` provider + presentation `Field` provider nest; inner shadows outer, so `isInvalid` requires manual `error={f.errors[0]}`. Promote `label`/`helper` onto `form.Field` (auto-compose `Field`, single provider) per the doc §6 sketch.
- **Dangling `aria-describedby`** — wired atoms always emit `"${helperId} ${errorId}"`; when no helper/error node renders, both ids are dangling (same axe class — `aria-valid-attr-value` — the a11y burn-down fought). Fix in context/chrome coordination once, sweep inherits.
- **`FormErrorMessage` is single-message**; contract exposes `errors: string[]` (client+server merged) — multi-error render path needed.

---

## 3. Gap table (per maturation area)

| # | Area | Have | Gap | → It |
|---|---|---|---|---|
| 1 | Field integration | 23/54 in-scope controls honor ctx; conformance pins the glue provider | 31 controls unwired (6 families) · 3 id-precedence bugs · no `label`/`helper` on `form.Field` · dangling describedby · single-message error chrome | **F-2a, F-2b** |
| 2 | Validation maturity | Standard Schema vendored; async schemas covered; both .NET server shapes land per-field; `defaultMapFieldPath` remap | **zod never exercised** — no zod/valibot devDep, conformance uses hand-rolled schema fixtures; no conventions doc (co-location, server↔client shape reuse, cross-field `refine`, async rules); `SubmitErrors.ts:26` hard-codes `'Unknown error'`; **43 hard-coded English strings across 16 field components** (`aria-label="Country"`, placeholders…) while LocaleProvider is P6/NEXT — forms must expose label-slot props, never bake English | **F-2c** (+ P6 tie) |
| 3 | Form-level patterns | `Wizard`/`useWizard`, router `useNavigationBlocker`, `/query` `useOptimisticMutation`, `fileUpload` all shipped — **as islands** | zero integration recipes/stories: wizard per-step schema gate · dirty-nav guard · optimistic submit · file-upload form · focus-first-invalid; autosave (draft persistence) blocked on **W2-c** storage v2 | **F-2e** |
| 4 | Interaction-test tier | 59 field-component `play()` stories (testing It5); 34-case conformance (test-only, not in SB) | **0 stories use `useAppForm`** — no end-to-end form-flow proof in the primary tier; house engine makes this peer-free in SB | **F-2d** |
| 5 | Product proofs | Requirements derived from the 4 products (R1–R13); `frontend-modules-products.md` maps ~500 LOC of glue | no migration executed; wheelhouse+secrets-vault pin 0.0.68 (pre-engine); smart-qr stress case (13-setter prefill, rules array, content union) untested against the engine | **F-2f, F-2g** |
| 6 | Registry & DX | planning.md row F-2; forms-engine.md design doc | no consumer doc (`docs/forms.md`); `src/form.ts` convention not stamped in `product-template`; `targets.md` has **no forms-engine rows** (pair-sync rule broken); no `.engine` escape-hatch audit ritual | **F-2h** |

---

## 4. Iteration breakdown

Sizes: **S** ≤ half session · **M** ≈ 1 session · **L** = multi-session or parallel lanes. Order top-down; ∥ = parallelizable.

| It | Focus | Tasks (one-liners) | Size | Deps | ∥ |
|---|---|---|---|---|---|
| **F-2a** | `form.Field` chrome + glue hardening | add `label`/`helper` to `AppFieldProps` → glue auto-composes presentation `Field` (single provider, doc-§6 parity) · `FormErrorMessage` renders `errors[]` · fix dangling `aria-describedby` (reference only rendered ids) · `id ?? ctx?.id` precedence in `checkboxField`/`radioField`/`switchField` · extend conformance for chrome semantics | **M** | — | no — everything composes on it |
| **F-2b** | FormControlContext sweep | wire the 31 controls in 6 families (§2 table): per-family shared pattern + one regression story per family asserting id/aria-invalid/aria-describedby/disabled/required/readOnly + axe pass · opportunistic: `InputStyles` `read-only:bg-muted` button-trigger bug (testing.md finding) intersects Family 1 | **L** | F-2a | **yes — 6 family lanes** |
| **F-2c** | Validation conventions + seam proof | add `zod@4` + `valibot` devDeps · re-run conformance schema fixtures through both real libs (Standard Schema seam pinned by test, not doc) · write `docs/forms.md`: schema co-location (`*.schema.ts` beside screen) · client schema ⊂ backend contract rule (no codegen yet) · cross-field via `refine` · async validators = whole-schema only (house ceiling) · message-slot rule: no literal English on the SDK path, schema owns messages, `'Unknown error'` → overridable · `src/form.ts` pin convention | **M** | — | yes ∥ F-2a/b |
| **F-2d** | Forms interaction tier | `play()` stories on the **house** engine (zero peer in SB): login (validate → submit → server error, both .NET shapes) · register-product (transform-on-change + per-mode flags) · array rows (add/remove/reorder + row-scoped server errors) · async schema (`isValidating` gate) · `reset(data)` prefill · register tier in `testing.md` | **M** | F-2a | yes ∥ F-2b/c |
| **F-2e** | Form-level pattern recipes | each = story + `docs/forms.md` section: wizard per-step schema gate (`useWizard` × per-step validate before advance) · dirty-nav guard (`isDirty` × `useNavigationBlocker`) · optimistic submit (`onSubmit` → `useOptimisticMutation`) · file-upload form (Family-6 controls + progress + server errors) · focus-first-invalid helper · **autosave recipe deferred → lands with W2-c storage v2** (flag dependency in planning) | **M** | F-2a, F-2d | partial |
| **F-2f** | Proof migrations — simple tier | wheelhouse `RegisterProductForm`(177 LOC)+`RegisterServerForm`(91) · secrets-vault `LoginForm`+`SetSecretForm` → `tanstack` adapter via `src/form.ts` · bump pins 0.0.68→current · delete hand-rolled glue · contract nits → promotion backlog | **M** | F-2a, F-2c | no |
| **F-2g** | Stress migration — smart-qr builder | `CreateCodeScreen` (338 LOC, ~20 `useState`): `reset(data)` kills the 13-setter prefill effect · rules array via `form.array` · content discriminated union · live preview via `Subscribe` selector · optional 4th: transcript-forge `BatchForm` URL validators → schema | **L** | F-2f | no |
| **F-2h** | Registry & template closure | `product-template` stamps `src/form.ts` + one example form · `targets.md` gains forms-engine rows (pair-sync) · `.engine` escape-hatch grep audit ritual documented (2+ same escapes → contract promotion) · flip planning.md F-2 | **S** | all | last |

Suggested wave shape: **F-2a → (F-2b ∥ F-2c ∥ F-2d) → F-2e → F-2f → F-2g → F-2h.**

---

## 5. Maturity checklist — "forms vector DONE"

Mirrors testing.md's coverage philosophy: no percentage gates — explicit, checkable statements.

- [ ] **Field integration:** every in-scope form control (54 pinned in §2) honors `FormControlContext` — id, aria-invalid, aria-describedby, disabled, required, readOnly — proven by one regression story per family + axe green on form compositions; zero dangling describedby.
- [ ] **Chrome:** `form.Field` renders label/helper/error via a single provider; multi-error capable; conformance covers it on both adapters.
- [ ] **Conformance:** shared suite (≥34 cases) green on `house` + `tanstack`, including fixtures through **real zod 4 and valibot** (Standard Schema seam test-pinned).
- [ ] **i18n-ready:** no literal English on the engine path (`toApiError` fallback overridable); the 43 embedded field-component strings inventoried with label-slot props queued into the P6 LocaleProvider sweep — forms add **zero** new hard-coded strings.
- [ ] **Interaction tier:** `play()` stories prove end-to-end flows — sync validation → submit → server-error application (both .NET shapes) · array rows · async schema · reset/prefill · wizard multi-step · file upload — all on the house engine (SB stays peer-free).
- [ ] **Patterns:** dirty-nav guard, optimistic submit, wizard per-step schema, focus-first-invalid documented + story-proven; autosave recipe shipped once W2-c lands.
- [ ] **Product proofs:** wheelhouse + secrets-vault (simple) and smart-qr builder (stress) migrated; their hand-rolled form glue (~500 LOC across products) deleted; discovered contract gaps promoted or explicitly backlogged.
- [ ] **DX:** `docs/forms.md` consumer guide exists; `product-template` stamps `src/form.ts`; `targets.md` rows synced; `.engine` escape-hatch audit shows only documented reach-ins.

---

## F-2h contract backlog (seeded by F-2d/e/f — 2026-07-11)

**SHIPPED 2026-07-11** (additive, both engines, conformance 72→86): `handleSubmit(): Promise<boolean>` verdict + `isSubmitSuccessful` slice · `form.setValue(path, value)` cross-field write · `form.clearSubmitError()` · selector `isEqual` on `Subscribe`/`useFormState` · File-aware `deepEqual` · `fallbackErrorMessage` option (last English literal now overridable). **Deferred — architectural** (documented, not blocking maturity): per-field content-union errors (needs union explosion) · recursive deep-path value typing (`f.value` unknown on array rows — cast at row) · `fieldErrors` configurable recognizer · autosave recipe (waits on W2-c storage). `reset()`-after-`reset(data)` → documented behavior in `forms.md`.

Original backlog (all above resolved or explicitly deferred):

- **`handleSubmit` has no verdict** — resolves `void`; wizard gate + any "did it pass?" caller needs a `passed` ref. Want `Promise<boolean>` or a last-submit-outcome slice. (F-2d, F-2e)
- **`reset()` after `reset(data)` returns to ORIGINAL `defaultValues`**, not the re-seeded baseline — edit-screen Discard must call `reset(loadedEntity)`. Document, or make `reset()` return to current baseline. (F-2d)
- **No cross-field `setValue`** outside a `form.Field` render prop — change-time derived fields (name→slug) need `.engine`. Promotion candidate. (F-2d, wheelhouse)
- **Array-row `f.value` is `unknown`** — typed values, untyped deep paths; every array form casts. Convention example must show the cast, or improve path typing. (F-2d)
- **`submitError` has no imperative clear** — a dismissible error banner can't reset it. Facade nit. (secrets-vault)
- **`fieldErrors` is `instanceof ApiError`-gated** — silently no-ops for non-SDK errors; now documented in `forms.md`, but making the recognizer configurable would remove the footgun. (wheelhouse, secrets-vault)
- **`'Unknown error'` fallback** (`SubmitErrors.ts`) — last SDK-authored English literal on the submit path; make overridable for i18n. (F-2c)
- **`deepEqual` blind to `File`** (no enumerable keys → any two Files equal) — file-swap won't re-flip dirty. Cosmetic today. (F-2e)
- **`InputStyles` `read-only:bg-muted` matches `<button>` triggers** — pickers sat on muted unintentionally; fixed in the Vue package by the attribute-based `readonly:` variant, so triggers now rest on the field surface. (F-2b)

### F-2g strains (smart-qr `CreateCodeScreen` stress migration — 2026-07-10)

The stress case (10-member content union · rules array · live preview · 13-setter edit prefill) ran on `0.0.95` +
`tanstack`. It migrated with **`tsc` + `vite build` + tests green** and **no schema→`useAppForm` cast** — the confirmations and new gaps:

**Confirmed (already backlogged):**

- **Array-row `f.value` is `unknown`** — hit exactly as predicted: each rule cell casts (`f.value as string` / `as RuleConditionType`), 3 casts/row. The docs example must show it.
- **`handleSubmit` void verdict** — not blocking here (success is observed via a `saved` state set in `onSubmit`, no wizard gate), but the screen has no "did it pass?" branch to lean on.
- **`reset()`-after-`reset(data)` footgun** — dodged only because "Create another" clears a side panel, not the form; a future "Discard changes" button on this edit screen WILL hit it.
- **Submit seam** — the app's hand-rolled client already `throw`s the SDK `ApiError`, so `mapSubmitError`'s `instanceof` gate + ProblemDetails field mapping worked with **zero seam changes** (the pre-guard `if (!links) setError(...)` deleted; the backend's 400 "at least one" now lands in `submitError`). Cleanest possible adaptation — but it only worked because a prior iteration had already routed errors through `ApiError`.

**New (extend the backlog):**

- **Discriminated union binds cleanly as ONE field but forecloses per-property field errors.** `content` as a single top-level `form.Field` is the win — `f.value` is the fully-typed `CodeContent`, `f.setValue` takes it, sub-controls bind with no cast, and `z.discriminatedUnion` satisfied `StandardSchemaV1<Values>` with no annotation. **But** the per-type sub-controls edit the whole object (`onChange({...value, url})`), so no input is wired to a `content.url` form path — a schema issue at `content.url` has no subscriber and renders nowhere. Per-field content validation must therefore be whole-object (a `content`-level slot) or server-side (chosen). Exploding the union into `content.<field>` deep paths would restore per-field errors but forces N `unknown` casts + rewrites every typed sub-control. **The single-field union is values-clean and errors-blind; document the trade, or offer a "field errors under an object field" chrome.**
- **Composite `Subscribe` selectors defeat the slice memo → preview perf footgun.** The natural preview selector `(s) => ({ style, content, symbology })` returns a fresh object every call, so the adapter's `Object.is` slice-cache never hits and the preview re-renders on *every* keystroke (incl. name/rules). Perf-sane required **nested single-slice Subscribes** (`s.values.style` → `s.values.content` → `s.values.symbology`), each a stable ref via TanStack's structural sharing. Convention/`useFormState` docs should warn against object-returning selectors (or the facade could shallow-compare selector output).
- **Grouped sibling-field controls have no clean binding.** A control that writes 2–3 sibling values (a fill picker → `foreground`+`gradient`; a shape row → 3 shapes) can't bind to one field, and there's **no top-level `setValue`** (the backlogged cross-field gap) to write siblings from outside a render prop. Workaround: model the group as ONE sub-object field (`style`) and spread-merge (`f.setValue({...f.value, foreground})`) — clean, mirrors the union idiom, but it's a modeling constraint the contract silently imposes. Without it: nested `form.Field` (2–3 deep) or `.engine`.
- **A reorderable-array presentational component must become form-aware.** Driving rows through `form.array` + per-row `form.Field` (needed for row-scoped errors) means the row list can't stay a generic `rules + onChange` component — it must take `form` and reach `form.array(path)` + `form.Field name={\`rules[${i}].x\`}`. Row errors are unreachable via a whole-array single field. Expect this coupling in any array form; a documented `useFieldArray(form, path)` row-render helper would soften it.
