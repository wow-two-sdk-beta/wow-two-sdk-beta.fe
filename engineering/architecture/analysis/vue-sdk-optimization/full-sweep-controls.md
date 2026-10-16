> Lane evidence. The [combined implementation report](full-sweep-implementation.md) owns final package verification.

# Vue forms, form engines, navigation and overlay implementation

Package: `engineering/codebase/wow-two-sdk-beta-fe`
Date: 2026-09-25
Status: source stable; no staging, commits, package build or full-suite run performed by this lane.

## Delivered corrections

### Form engine ownership

- Added `src/formsEngine/FormArrayIdentity.ts`, shared by the house and TanStack facades. `AppArrayApi.keys` is now the canonical row identity consumed by all `useFieldArray` bindings and direct facade array operations. Nested identities move with parent rows. Whole-row/array replacement and reset deliberately invalidate row identity. Scalar leaf edits preserve it. Invalid indices do nothing.
- TanStack async schema errors and whole-form validation results are accepted only for the still-current values. Scoped validation had snapshot guards already; whole form now follows the same rule.
- `AppForm.spec.md` documents shared identity and the native engine escape hatch: bypassing facade mutation APIs also bypasses facade row-identity bookkeeping.

### Input and picker correctness

- SelectPicker key/label caches preserve actual key identity, including distinct object keys. Disabled/loading/read-only selection cannot mutate. Registered items/content forward caller attributes. Listbox reconciles active identity after option disappearance/disable and never leaves a nonexistent active descendant.
- ToggleInput honors disabled/loading/readonly on div/custom roots and keeps reset anchors outside as-child slot merging. OptionTilePicker does not turn a deselect no-op into another select intent.
- SortableGroup commits once on accepted drop; cancellation/outside drop emits no reorder. Nested draggable ownership and invalid movement indices are guarded.
- ColorPicker accepts external alpha instead of restoring old transparency. ColorArea exposes separate saturation and brightness sliders with scalar ARIA, independent keys, Page/Home/End, disabled/read-only handling and zero-geometry guards. Color wheel/slider share inactive and primary-pointer guards.
- Date/time controls enforce full bounds for typed, native and picker paths. DateTime calendar merges clamp to the boundary day's valid time; time columns omit invalid options. `minuteStep` is normalized to integer 1..60 (fallback 5), preventing nonterminating loops; native step follows the same seconds interval. Current/boundary off-grid minutes remain available.
- `TimeInput` and `TimePicker` now expose min/max. Date/time readonly inherits Field state and closes/locks open panels. Calendar's whole-control disabled/readonly is distinct from its per-day disable predicate.
- TimeColumns has two named listboxes, active descendants, keyboard selection and meaningful disabled options.
- Checkbox, Radio, Switch, Slider, ColorInput, Knob, Pin, ColorSwatch, Combobox, MultiSelect, Editable and EmojiPickerPopover all enforce inherited read-only state at mutation boundaries, beyond native styling.
- File pickers now honor readonly and reject late/synthetic changes. KeyboardShortcutPicker cancels recording when disabled/readonly and binds its listener to the owner document. Gradient and recurrence mutations are guarded.
- Nineteen named hidden-input control families now forward the native `form` owner, omit disabled values, and retain read-only values. Div-based ToggleInput resets correctly.
- DataGridEditor owns its draft by logical row/column keys across reorder. Removed cells, external value changes, disabled/read-only transitions cancel stale drafts. Commit emits once, blur no longer steals focus, numeric blank remains blank, empty grids expose no invalid active descendant, and optional header/cell slots are correctly typed.
- CodeEditor Escape-exit latch survives modifier keydowns, including Shift-Tab and macOS Option-Tab.

### Localization and consumer fixture

- Adopted foundation `useLocaleDefaults` across 39 controls with human-readable defaults, keeping explicit overrides (including empty strings) and canonical wire grammars.
- Calendar month/weekdays and date/time picker display use LocaleProvider. `formatZonedTime` accepts optional locale for calendar consumers. Plain script option enumerations/domain formatting remain their existing explicit data/API, not mechanically translated.
- Added an ExactNumberInput playground smoke/gallery fixture using `9223372036854775807.125`. The ExactNumberInput implementation/spec/tests belong to the foundation agent, not this lane.

### Navigation and overlay behavior

- Added `FocusScope.returnFocus?: () => HTMLElement|null` and Menu pass-through. It is resolved only under existing scope-ownership and remaining-trap guards.
- Removed independent unguarded focus restoration rAF from Modal, Drawer, Popover, DropdownMenu and Menubar. ContextMenu no longer retries focus up to 30 frames; it supplies the pre-gesture return target to the shared scope.
- ContextMenu supports ContextMenu and Shift-F10 keyboard activation, focusable/disabled trigger semantics, touch movement cancellation and disabling mid-long-press.
- Menu typeahead uses live DOM order/labels and skips disabled options, editable descendants and composition.
- Menubar open-menu movement respects current DOM order, disabled controls and RTL. Disabled Menubar/NavigationMenu triggers cannot open on hover or synthetic events. NavigationMenu ArrowDown opens/focuses the first panel link; Escape restoration is synchronous and only while the closing panel owns focus.
- Pagination normalizes invalid totals/pages/siblings and imposes a documented rendering budget of 50 neighbors per side. Dataset totals are unchanged; huge inputs cannot allocate huge arrays. Current-page clicks emit no redundant update.
- Tooltip disables/cancels its pending open timer without reappearing when re-enabled.
- CommandPalette Enter uses currently visible options; arrow movement scrolls its active option into view.
- ScrollSpy observes reactive id-array mutations and ignores callbacks after observer cleanup.

## Verification

Final focused command:

```sh
pnpm exec vitest run --project dom \
  tests/unit/presentation/forms/NativeFormState.dom.test.ts \
  tests/unit/presentation/forms/PickerSafety.dom.test.ts \
  tests/unit/presentation/forms/InputInteraction.dom.test.ts \
  tests/unit/presentation/forms/Forms.regression.dom.test.ts \
  tests/unit/presentation/nav/InteractionSafety.dom.test.ts \
  tests/unit/presentation/nav/LiveValues.dom.test.ts \
  tests/unit/formsEngine/ArrayIdentity.dom.test.ts \
  tests/unit/formsEngine/Submission.dom.test.ts
```

- **8 files / 119 tests passed**. Log: `/private/tmp/vue-forms-nav-final-tests.log`.
- New depth: PickerSafety 22, NativeFormState 14, ArrayIdentity 8, InteractionSafety 13; CodeEditor adds 4 modifier regressions to existing tests.
- Earlier forms breadth/SSR/contract run: **274 tests passed** before final small family follow-through. The parent owns final integrated breadth/browser/packed gates.
- `pnpm exec vue-tsc --noEmit -p tsconfig.typecheck.json`: **exit 0**, `/private/tmp/vue-forms-typecheck-final.log` empty.
- Owned source/test ESLint: **exit 0**, one expected ignored-playground-file warning. `/private/tmp/forms-lint-final.log`.
- 144 changed/new owned source/spec/test files formatted via Prettier; path list `/private/tmp/forms-owned-final.json`.
- `git diff --check` over owned paths: **exit 0**.
- Tests here are focused DOM/state regressions; they do not certify real browser layout or assistive technology behavior. Parent crossbrowser checks include FocusScope and CodeEditor; no such result is claimed by this lane.

## Coverage boundary

The family pass covered all exported forms via contract/DOM/SSR breadth, source-pattern review for native names/form ownership, inactive state, event mutation, timers, identity and labels, then depth fixes above. Source inventory contains 214 forms Vue/TS files, 19 formsEngine files, 49 navigation files and 54 overlay files; directory counts include retired compatibility names and are not counts of public controls.

Navigation review included breadcrumbs/links/nav items, ContextMenu/DropdownMenu/Menu/Menubar/NavigationMenu, pagination, ScrollSpy/TableOfContents. Overlay review included ActionSheet/AlertModal/BottomSheet, Modal/Drawer/Popover, CommandPaletteModal, HoverCard, Tooltip and TourPopover. Static layout wrappers and preset wrappers were checked through their shared owners rather than rewritten independently.

No new source failure remains in the focused gates. This is not a claim of exhaustive possible behavior coverage. Potential future capability additions (not broken advertised behavior): NodeEditor whole-control read-only API/Field adoption; native DataGrid cells for ExactNumber; richer calendar locale week-start configuration. These were not silently invented during a correctness fix. The current native numeric NumberInput/DataGrid number type remains explicitly JavaScript-number based; ExactNumberInput provides the lossless dedicated edit surface.

## Packed consumer follow-through: native listener typing

The parent's strict Vue consumer probe exposed `TextInput @blur` as missing from the public type despite runtime forwarding. Added `NativeControlAttributes.ts` with type-only native InputHTMLAttributes/TextareaHTMLAttributes inheritance through `/* @vue-ignore */`, so native attrs remain fallthrough at runtime. Adopted TextInput, Email, Tel, Url, Password, Search, Number, TextArea, Currency/Percent through Number, Masked, Phone, Date, Time, DateTime and ColorInput. Temporal controls exclude native min/max from the base in favor of their declared Temporal bounds. Foundation agent also adopted ExactNumberInput, excluding native `onInvalid` to retain its custom failure/draft event.

Full InputHTMLAttributes inheritance initially hit TypeScript TS2590 because Vue's autocomplete type expands a huge platform token cross-product. Omitting that one field and re-declaring `autocomplete?: string` keeps the native extensible string contract without discarding other native attributes/events or disabling strict templates. Header/cell slots on DataGridEditor remain optional and strictly typed.

Compile-only probes: `tests/types/NativeControlProps.ts`. Runtime forwarding probes added to NativeFormState (now 19 tests). NativeFormState plus existing Forms.contract: **29 tests passed**, log `/private/tmp/vue-native-props-tests.log`. Native attr source/spec/test edits formatted; source ESLint passed, compile-probe unused parameter cleanup passed its focused ESLint rerun. Parent owns the rebuilt packed strict-template proof.

## Final presentation follow-through: SpeedDialGroup

Reproduced disabled action navigation and controlled-close focus restoration failures (2 of 4 focused tests failed before changes). Fixed the live enabled-item query, consumed/composing key handling, and document ownership. Trigger previously read the FAB's `$el` (a template comment) instead of its exposed `el`, so restoration had no real target; now it uses the explicit DOM contract. Removed action/Escape delayed focus callbacks; a close watcher restores only when the dial still owns focus. Closed actions retained during exit animation cannot fire consumer click or select callbacks. Four focused regressions pass in `/private/tmp/vue-speed-dial-after.log`; owned Prettier, ESLint, typecheck and diff checks complete the handoff.
