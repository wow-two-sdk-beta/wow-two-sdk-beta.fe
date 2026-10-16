# PercentInput

Renders a `NumberInput` with a trailing `%` decoration; the typed value stays the bare 0–100 number.

Source: [PercentInput.vue](PercentInput.vue).

Public import: `import { PercentInput } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

Inherited contracts: `extends NumberInputProps`. These members remain part of the component surface.

No own declared props; inherited/native attributes and slots determine the surface.

## Emits

None declared.

## Slots

None declared.

## Exposed handle

`{ el: computed(() => inner.value?.el ?? null) }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [Forms.contract.dom.test.ts](../../../../tests/unit/presentation/forms/Forms.contract.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

Native input attributes and event listeners (including `name`, `form`, `autocomplete`, `onBlur`, `onInput` and keyboard/composition/clipboard events) are represented in the public props type. They remain fallthrough attrs at runtime. Canonical model value, visual size, fixed native type and declared Temporal bounds retain component ownership. Autocomplete accepts its native extensible token string.
