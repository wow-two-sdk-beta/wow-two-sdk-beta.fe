# DisclosureButton

Renders a full-width labelled button with a rotating chevron that expands or collapses a section.

Source: [DisclosureButton.vue](DisclosureButton.vue).

Public import: `import { DisclosureButton } from '@wow-two-beta/ui-vue/presentation/actions';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

Inherited contracts: `extends /* @vue-ignore */ Omit<ButtonHTMLAttributes, 'children' | 'onChange'>`. These members remain part of the component surface.

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `open` | `boolean` | no | `undefined` | The controlled open state. |
| `defaultOpen` | `boolean` | no | `false` | The uncontrolled initial state. |
| `chevronSide` | `Side` | no | `SideValue.Right` | The side the chevron sits on (`left` · `right`). Default `right`. |
| `type` | `ButtonType` | no | `ButtonType.Button` | The button type. Default `ButtonType.Button`. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:open` | `'update:open': [open: boolean];` | Fires when the reader expands or collapses the section, carrying the new open state. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown;` | The button's own label, left-aligned beside the chevron. |

## Exposed handle

`{ el: root }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [ActionsExamples.ts](../../../../apps/playground/src/gallery/fixtures/ActionsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
