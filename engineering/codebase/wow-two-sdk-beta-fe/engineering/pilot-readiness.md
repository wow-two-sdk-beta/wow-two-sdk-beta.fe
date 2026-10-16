# Pilot readiness — `smart-qr` on `@wow-two-beta/ui-vue`

*Last updated: 2026-08-13 03:58 PM*

> Pre-flight for rebuilding `smartqr.frontend-services` (React, `@wow-two-beta/ui`) on the Vue port
> (`@wow-two-beta/ui-vue`). Every claim below was produced mechanically against the **built `dist`**,
> not against `src` and not from `MIGRATION.md` prose. Reproduction commands in [§8](#8-how-this-was-proven).

---

## Verdict

**The pilot is unblocked. No symbol gap blocks it — 99 / 99 resolve from the built package, runtime and types.**

Nothing in the Vue package is missing, renamed-without-replacement, or absent-pending-a-lane for anything
smart-qr imports. The 5 unbuilt export subpaths do not intersect the consumer's 14.

What the pilot *does* need is migration work, in three tiers:

| Tier | Item | Scale | Risk |
|---|---|---|---|
| **Non-mechanical** | `form.Subscribe` removed — the form read path is rewritten | 14 usages, 2 files | Rewrite, but loud (won't compile) |
| **Silent-failure** | `onChange` → `@value-change` / `v-model` on inputs | **30 call sites** | **Typechecks and silently misbehaves** |
| Mechanical | `className`→`class`, dot-access→flat imports, node-props→slots, emit renames | ~120 edits | Loud |

The one item that genuinely threatens a quiet, hard-to-trace bug is the `onChange` timing change
([§6.1](#61-onchange-fires-on-blur-in-vue-not-per-keystroke--30-call-sites)). Everything else fails
loudly at compile time or is a missing-symbol error.

---

## 1. Import inventory

Parsed from the consumer's `src/**/*.{ts,tsx}` — every `import`/`export … from '@wow-two-beta/ui…'`,
comments stripped, aliases and type-only specifiers resolved.

**Found: 14 subpaths, 99 distinct symbols** (the 94 / 13 baseline had drifted; +5 symbols, +1 subpath).

| Subpath | Symbols | Value | Type-only | Resolved |
|---|---|---|---|---|
| `domain/color` | 5 | 2 | 3 | **5 / 5** |
| `domain/emoji` | 2 | 1 | 1 | **2 / 2** |
| `forms-engine` | 3 | 2 | 1 | **3 / 3** |
| `forms-engine/tanstack` | 1 | 1 | 0 | **1 / 1** |
| `foundation/http` | 4 | 2 | 2 | **4 / 4** |
| `foundation/primitives` | 2 | 2 | 0 | **2 / 2** |
| `foundation/storage` | 2 | 1 | 1 | **2 / 2** |
| `foundation/utils` | 5 | 5 | 0 | **5 / 5** |
| `presentation/actions` | 9 | 9 | 0 | **9 / 9** |
| `presentation/display` | 26 | 26 | 0 | **26 / 26** |
| `presentation/feedback` | 4 | 4 | 0 | **4 / 4** |
| `presentation/forms` | 17 | 16 | 3 | **17 / 17** |
| `presentation/layout` | 12 | 12 | 0 | **12 / 12** |
| `presentation/overlays` | 7 | 7 | 0 | **7 / 7** |
| **Total** | **99** | **90** | **11** | **99 / 99** |

<details>
<summary>Full symbol list per subpath</summary>

```
domain/color           Gradient, GradientStop*, GradientType, LinearGradient*, RadialGradient*
domain/emoji           EmojiCatalog, EmojiCatalogEntry*
forms-engine           AppForm*, defaultMapFieldPath, useFieldArray
forms-engine/tanstack  useAppForm
foundation/http        ApiError, ApiResponse*, parseJson, ProblemDetails*
foundation/primitives  ColorModeProvider, useColorMode
foundation/storage     localStorageStorageBroker, StorageBroker*
foundation/utils       ButtonType, ColorTone, Orientation, SizePreset, SurfaceVariant
presentation/actions   Button, ButtonVariant, CopyButton, OptionTile, OptionTileGroup,
                       ToggleButton, ToggleButtonGroup, ToggleButtonGroupVariant, ToggleMode
presentation/display   Accordion, AccordionType, Badge, BadgeVariant, Card, CellsGlyph, DotsGlyph,
                       EmptyState, FeatureCard, FrameGlyph, Heading, HeadingSize, HorizontalBarsGlyph,
                       PricingCard, RadiusGlyph, Separator, Sortable, StepCard, Table, TableBody,
                       TableCell, TableHead, TableHeaderCell, TableRow, Text, VerticalBarsGlyph
presentation/feedback  Alert, Banner, MeterBar, Spinner
presentation/forms     CategoryNavVariant*, ColorPicker, DateTimeInput, DefaultEmojiSize, EmailInput,
                       EmojiPicker, EmojiPickerSizeInput*, EmojiSizeControl, EmojiTileShape*, Field,
                       NumberInput, SearchInput, Select, TelInput, TextAreaInput, TextInput, UrlInput
presentation/layout    Center, Container, ContainerSize, ControlGroup, Divider, Grid, HStack, Navbar,
                       Section, Stack, Surface, VStack
presentation/overlays  AlertModal, AlertModalCancel, AlertModalContent, ModalDescription, ModalFooter,
                       ModalHeader, ModalTitle

* = imported type-only by the consumer
```

</details>

---

## 2. Build state

```
[entries] 57/62 entries resolved — 5 skipped, no source yet (wave W1d).
[entries] These package.json export subpaths will NOT resolve for consumers:
  - @wow-two-beta/ui-vue/foundation/commands
  - @wow-two-beta/ui-vue/foundation/share
  - @wow-two-beta/ui-vue/foundation/device
  - @wow-two-beta/ui-vue/foundation/virtualization
  - @wow-two-beta/ui-vue/foundation/clipboard
```

Build exits `0`; 1539 modules; declarations emitted; 183 themes (182 proven AA).

**The 5 unbuilt subpaths do not intersect the consumer's 14.** smart-qr imports no `foundation` module
outside `http` · `primitives` · `storage` · `utils`, all of which build. The live `src/foundation/**`
lane's remaining work does not gate this pilot.

> `MIGRATION.md` §11.1 warns the export map is aspirational — a declared subpath with no emitted `dist`
> fails at *resolve* time with no clear error. Confirmed, and confirmed irrelevant here.

---

## 3. Resolution results

Checked both halves independently, against `dist` — never `src`.

**Runtime (emitted `.js`)** — imported each of the 14 built modules through the `exports` map and read
`Object.keys`. All 14 imported cleanly (no throw, no missing file). **90 / 90 value symbols present.**

The 9 symbols absent from the `.js` are exactly the 9 the consumer imports **type-only** — types erase at
runtime, so their absence is correct, not a gap:

`GradientStop` · `LinearGradient` · `RadialGradient` · `EmojiCatalogEntry` · `AppForm` ·
`ApiResponse` · `ProblemDetails` · `StorageBroker` · `EmojiPickerSizeInput`

(`CategoryNavVariant` and `EmojiTileShape` are imported with `type` syntax but exist as runtime values too.)

**Types (emitted `.d.ts`)** — generated a scratch consumer project that imports all 99 symbols **by package
name**, so TypeScript resolves through the real `package.json` `exports` map and the emitted declarations,
exactly as smart-qr will. Each symbol is imported in the position the consumer uses it (`import type` for
type-only). Result: **zero errors — 99 / 99.**

**Negative control** — the same probe with one impossible symbol per subpath emits exactly **14 × TS2305
"has no exported member"**. The clean run is a real pass, not a vacuous one.

---

## 4. Misses and their classification

**There are none.** No symbol falls into *absent-pending-lane*, *renamed*, *deliberately dropped*, or
*unexplained*.

`MIGRATION.md` §11.3 lists four drops; verified against the built output, and **none is used by smart-qr**:

| Dropped | Verified in `dist` | Used by smart-qr? |
|---|---|---|
| `foundation/utils` → `composeRefs` | absent — confirmed | No |
| `presentation/forms` → `Textarea`, `TextareaProps` | absent; `TextAreaInput` present | No — consumer already uses `TextAreaInput` |
| `forms-engine` → `createSubscribeComponent`, `AppSubscribeProps`, `AppSubscribeComponent` | absent from runtime exports — confirmed | Not imported, but `form.Subscribe` **is used** → [§6.2](#62-formsubscribe-is-gone--14-usages) |
| `router` → `AppRoot`, `useMatches`, … | n/a | No — consumer imports nothing from `router` |

---

## 5. Compound components lost dot-access

**This is the one gap a symbol-resolution check alone would have missed.** The consumer reaches these
parts through dot-access, so they never appear in its import list — yet each becomes a required named
import in Vue.

All 9 parts **exist** in the built `dist` under the same subpath as their root. Mechanical rewrite, no SDK gap.

| Consumer writes | Vue needs (named import) | Subpath | Sites |
|---|---|---|---|
| `<Select.Trigger>` | `SelectTrigger` | `presentation/forms` | 5 |
| `<Select.Value>` | `SelectValue` | `presentation/forms` | 5 |
| `<Select.Content>` | `SelectContent` | `presentation/forms` | 5 |
| `<Select.Item>` | `SelectItem` | `presentation/forms` | 5 |
| `<Accordion.Item>` | `AccordionItem` | `presentation/display` | 4 |
| `<Accordion.Trigger>` | `AccordionTrigger` | `presentation/display` | 4 |
| `<Accordion.Content>` | `AccordionContent` | `presentation/display` | 4 |
| `<Sortable.Item>` | `SortableItem` | `presentation/display` | 1 |
| `<Sortable.Handle>` | `SortableHandle` | `presentation/display` | 1 |

The parts' own props all survive: `SelectItem` keeps `itemKey` / `label` / `text` / `value` / `isDisabled`;
`AccordionItem` keeps `value` / `isDisabled`; `SortableItem` keeps `index`.

```diff
- import { Select, Accordion } from '@wow-two-beta/ui/presentation/forms';
- <Select.Trigger><Select.Value /></Select.Trigger>
+ import { Select, SelectTrigger, SelectValue } from '@wow-two-beta/ui-vue/presentation/forms';
+ <SelectTrigger><SelectValue /></SelectTrigger>
```

> The consumer already imports the **modal** parts flat (`AlertModalContent`, `ModalHeader`, …) and the
> **table** parts flat (`TableBody`, `TableCell`, …), so those need no change.

---

## 6. Prop-shape findings

Method: for each SDK component, diff the attributes the consumer actually passes against the Vue
component's **declared runtime props/emits/slots** read off the built `dist`. Attribution is file-scoped —
only JSX names bound to an SDK import in that file count, which excludes local components that shadow an
SDK name (`kit.tsx` defines its own `Section`, `FeatureCard`, `StepCard`, `PricingCard`) and follows
aliases (`Select as SdkSelect`, `FeatureCard as UiFeatureCard`).

Every candidate mismatch was then confirmed or refuted by **rendering the built component**.

### 6.1 `onChange` fires on blur in Vue, not per keystroke — 30 call sites

**The highest-risk item in this migration.** It compiles clean in both languages and silently changes behaviour.

React's `onChange` on an input is synthetic and fires on **every keystroke**. The SDK's inputs don't declare
`onChange`, so in Vue it falls through as the **native** `change` event, which fires on **commit/blur**.

Proven by mounting the built `TextInput` in a DOM and dispatching a real `input` event:

```
=== mechanical port: onChange -> @change (native) ===
  after typing "a" : (nothing fired)
  after blur/commit: [ 'change' ]

=== correct port: @value-change / v-model ===
  after typing "a" : [ 'value-change:a' ]
  v-model after "a": [ 'update:modelValue:a' ]
```

A direct port leaves every controlled text field not updating until the user leaves it.

**Affected (30 sites):** `TextInput` 12 · `TextAreaInput` 5 · `UrlInput` 3 · `TelInput` 3 · `EmailInput` 2 ·
`NumberInput` 2 · `SearchInput` 1 · `EmojiPicker` 1 · `EmojiSizeControl` 1.

All nine emit `update:modelValue` + `value-change`, so both fixes are available:

```diff
- <TextInput ring="sm" value={value.title}
-            onChange={(e) => onChange({ ...value, title: e.target.value })} />
+ <TextInput ring="sm" :value="value.title"
+            @value-change="(v) => onChange({ ...value, title: v })" />
```

```diff
  <!-- inside <form.Field>, the idiomatic form: field.value is writable -->
- <form.Field name="title">
-   {(field) => <TextInput value={field.value} onValueChange={field.setValue} onBlur={field.onBlur} />}
- </form.Field>
+ <form.Field name="title" v-slot="field">
+   <TextInput v-model="field.value" @blur="field.onBlur" />
+ </form.Field>
```

> Note the payload also changes: `@value-change` hands you the **value**, not a DOM event — `e.target.value`
> becomes `v`.

### 6.2 `form.Subscribe` is gone — 14 usages

The only non-mechanical area, and it fails loudly. Verified against `dist`: `createSubscribeComponent` is not
in `forms-engine`'s runtime exports; `Subscribe` survives only inside a doc comment in `AppForm.d.ts`.

In Vue, reading `form.state.x` / `form.values.x` **is** the subscription.

- `CreateCodeScreen.tsx` — 6 usages (this is the nested read-prop pyramid the port was designed to remove)
- `RuleControls.tsx` — 1 usage
- plus 7 further reads across the same files

```diff
- <form.Subscribe selector={(s) => s.isSubmitting}>
-   {(isSubmitting) => <Button isLoading={isSubmitting}>Save</Button>}
- </form.Subscribe>
+ <Button :is-loading="form.state.isSubmitting">Save</Button>
```

Bind to `form.state` — **never destructure it** (live getters).

`form.useFormState` survives but narrowed: it returns `Readonly<Ref<TSlice>>` rather than the slice, and is
now only for a **composite** selection with a custom `isEqual`. The consumer's 4 usages should be re-read —
single-member reads want `form.state` instead.

Unchanged and safe: `form.Field` (17 uses, render-prop → scoped slot), `form.reset` (3), `form.setValue` (2),
`form.handleSubmit` (1), `useFieldArray` (2), `defaultMapFieldPath` (1).

`AppForm<CodeCreateUpdateApiRequest>` — the consumer passes 1 type arg; Vue's `AppForm<TValues, TEngine = unknown>`
defaults the second. **No change needed.**

### 6.3 `className` → `class` — 23 components, 86 sites

Straight rename. Precedence is preserved: every component sets `inheritAttrs: false` and merges `attrs.class`
through `cn()`, so consumer classes still win over variant classes.

### 6.4 Callback props → emits — 9 conversions

| Consumer prop | Vue | Sites |
|---|---|---|
| `ColorPicker` `onValueChange` | `@value-change` | 4 |
| `OptionTile` `onSelect` | `@select` | 4 |
| `ToggleButtonGroup` `onValueChange` | `@value-change` | 2 |
| `DateTimeInput` `onValueChange` | `@value-change` | 2 |
| `Banner` `onClose` | `@close` | 2 |
| `Select` `onValueChange` | `@value-change` | 1 |
| `SearchInput` `onClear` | `@clear` | 1 |
| `AlertModal` `onOpenChange` | `@open-change` | 1 |
| `Sortable` `onReorder` | `@reorder` | 1 |

`Button`'s `onClick` (22 sites) needs **no change** — native DOM listeners stay as fallthrough.

### 6.5 Node-valued props → named slots

Verified present as slots in the built `.d.ts`:

| Component | Prop → slot | Slots confirmed in `dist` |
|---|---|---|
| `EmptyState` | `icon`, `actions` | `icon` · `title` · `description` · `actions` |
| `Navbar` | `start`, `end` | `start` · `center` · `end` · `default` |
| `FeatureCard` | `icon` | `icon` · `title` · `description` · `default` |
| `StepCard` | `icon` | `icon` · `title` · `description` · `default` |

```diff
- <EmptyState icon={<QrCode size={32} />} title="No codes yet" description={…} />
+ <EmptyState title="No codes yet">
+   <template #icon><QrCode :size="32" /></template>
+   <template #description>…</template>
+ </EmptyState>
```

### 6.6 Refuted — checked, and **not** a problem

Each of these looked like a gap in the static prop-list diff and was disproven by rendering the built component.
Recorded so nobody re-raises them.

| Candidate | Verdict |
|---|---|
| `ToggleButton` `size` / `isDisabled` not declared | **Works.** The heritage clause is `/* @vue-ignore */`'d (trap 7) so they're absent from the runtime prop list, but the component forwards attrs to an inner `<Button>` which declares both. Render confirms `size="lg"` → `h-[calc(3rem…)]`, `isDisabled` → `disabled data-state="disabled"`, and no `size=` attribute leak. TypeScript still sees them via the heritage clause. |
| `HStack` / `VStack` declare no props at all | **Works.** Both forward to `Stack`. `gap` `align` `justify` `wrap` `as` all render correctly, no attribute leaks. |
| `CopyButton` `size` / `tone` | **Works.** Forwarded to the inner `Button`; classes change, no leaks. |
| `Section` `muted` | **Not the SDK's `Section`.** `LandingPage.tsx` uses the *local* `Section` from `kit.tsx`. The SDK `Section` is used once, in `kit.tsx`, with `id` `bleed` `py` `tone` `className` — all valid. (React's `SectionProps` has no `muted` either; it lands in `...rest` there too, so it is a pre-existing no-op in the React app, not a Vue regression.) |
| `FeatureCard` `feature` · `StepCard` `index` · `PricingCard` `tier` | **Local wrappers** in `kit.tsx`, which pass correct props on to the aliased SDK components (`UiFeatureCard`, …). |
| `placeholder` on the 5 input components | **Works** — DOM fallthrough, render confirms `placeholder="hello"` lands on the `<input>`. Only consequence: no longer type-checked, since `XProps` stopped extending the DOM attribute interfaces (§11.5). A typo becomes a stray attribute rather than a type error. |
| `gap="lg"` producing no gap class | **Test artifact.** `lg` is not in the scale. The consumer's real tokens (`0` `2` `3` `4` `5` `6` `10`) all render correctly (`gap-6`, …). |

---

## 7. Migration checklist

Ordered by risk, not by size.

1. **Rewrite the `form.Subscribe` read path** — 14 usages in `CreateCodeScreen.tsx` + `RuleControls.tsx`.
   Bind `form.state.*` / `form.values.*` directly. Re-check the 4 `form.useFormState` calls; keep it only for
   composite selections with `isEqual`.
2. **Convert all 30 `onChange` input handlers** to `@value-change` or `v-model`. Payload becomes the value,
   not a DOM event. **Do not let a mechanical `onChange`→`@change` pass run** — it compiles and silently breaks typing.
3. **Import the 9 compound parts flat** and drop dot-access (27 JSX sites).
4. **Rename `className` → `class`** — 23 components, 86 sites.
5. **Convert the 9 callback props to emits** (§6.4). Leave `onClick` alone.
6. **Move node-valued props to named slots** on `EmptyState`, `Navbar`, `FeatureCard`, `StepCard`.
7. Port `kit.tsx`'s local wrappers (`Section`, `FeatureCard`, `StepCard`, `PricingCard`, `SectionHeading`, …)
   as Vue SFCs — they are consumer-owned, not SDK.

---

## 8. How this was proven

| Step | Method |
|---|---|
| Import inventory | Comment-stripped regex parse of all `src/**/*.{ts,tsx}`; aliases + type-only specifiers resolved; per-file scoping |
| Build | `pnpm build` in the Vue package; full log captured (`[entries]` prints before the chunk list — don't `tail` it away) |
| Runtime resolution | `await import()` of each built module **through the `exports` map**, then `Object.keys` |
| Type resolution | Scratch project with the package symlinked under its published name; all 99 symbols imported **by package name**; `tsc --moduleResolution bundler` |
| Test validity | Negative control — an impossible symbol per subpath must emit TS2305. It emits exactly 14 |
| Prop shapes | Declared `props` / `emits` read off built components; slots read from emitted `.d.ts` |
| Behaviour | SSR render of built components (`vue/server-renderer`) + a DOM mount (`happy-dom`) for event timing |

### What this check does **not** cover

Be aware of these before treating the report as exhaustive:

- **Only what smart-qr imports today.** A Vue rebuild may reach for components the React app never used;
  those are unverified here.
- **Rendering correctness beyond the props tested.** Symbols resolve and the sampled components render;
  this is not a visual or interaction audit. The port ships a smoke layer (mount + a11y), not the React
  package's story-driven interaction suite (§11.5).
- **`src/foundation/**` is live.** 20 modules are landing; the `[entries]` count will move. It does not
  affect this pilot's 14 subpaths, but re-run the build before trusting the count.
- **No runtime/theme integration check** — `styles.css` / `themes.css` wiring, `ColorModeProvider`
  mounting semantics, and the router/query layers were out of scope.
- The consumer's `.tsx` tree is React throughout; every file becomes a Vue SFC. This report scopes the
  **SDK surface**, not the app rewrite.
