# CommandPaletteModal

Renders the command palette inside a `Modal`, owning open state, search text, and the registry.

Source: [CommandPaletteModal.vue](CommandPaletteModal.vue).

Public import: `import { CommandPaletteModal } from '@wow-two-beta/ui-vue/presentation/overlays';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `open` | `boolean` | no | `undefined` | The open state, controlled. The `v-model:open` binding target. |
| `defaultOpen` | `boolean` | no | `false` | The initial open state when uncontrolled. Default `false`. |
| `inputValue` | `string` | no | `undefined` | The search text, controlled. The `v-model:input-value` binding target. |
| `defaultInputValue` | `string` | no | `undefined` | The initial search text when uncontrolled. Default `''`. |
| `triggerKey` | `string` | no | `undefined` | The key that opens the palette with ⌘/Ctrl. Omit to bind no global shortcut. |
| `filter` | `(searchText: string, search: string) => boolean` | no | `defaultFilter` | The match predicate. Default case-insensitive substring. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:open` | `'update:open': [open: boolean];` | Fires when the palette opens or closes — the `v-model:open` half. |
| `update:inputValue` | `'update:inputValue': [input: string];` | Fires when the reader edits the search text — the `v-model:input-value` half. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [NavExamples.ts](../../../../apps/playground/src/gallery/fixtures/NavExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
