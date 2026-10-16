# SegmentedPicker

Renders an iOS-style connected pill row of mutually exclusive options.

Source: [SegmentedPicker.vue](SegmentedPicker.vue).

Public import: `import { SegmentedPicker } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Undeclared attributes follow Vue fallthrough to the rendered root when the component has a single element root.

## Props

Props follow `SegmentedPickerProps<T>`; resolve the imported contract from the source imports.

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [value: T \| null \| ReadonlyArray<string>];` | Fires when the reader picks a different segment — forwarded verbatim from `ToggleGroup`. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown;` | The `ToggleInput` segments, forwarded verbatim to `ToggleGroup`. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [ActionsExamples.ts](../../../../apps/playground/src/gallery/fixtures/ActionsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
