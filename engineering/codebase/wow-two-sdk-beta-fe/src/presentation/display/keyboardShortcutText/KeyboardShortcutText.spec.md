# KeyboardShortcutText

Renders a `keys` sequence as `KbdText` chips joined by connectors.

Source: [KeyboardShortcutText.vue](KeyboardShortcutText.vue).

Public import: `import { KeyboardShortcutText } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `keys` | `ReadonlyArray<string>` | yes | — | The keys in order — e.g. `['⌘', 'K']` or `['Ctrl', 'Shift', 'P']`. |
| `separator` | `string` | no | `'+'` | The connector between keys. Default `'+'`; pass `' '` for spaced keys. |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
