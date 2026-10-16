# NavigationMenu

Renders the top-level site navigation bar, holding one expandable panel open at a time.

Source: [NavigationMenu.vue](NavigationMenu.vue).

Public import: `import { NavigationMenu } from '@wow-two-beta/ui-vue/presentation/nav';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `modelValue` | `string \| null` | no | `undefined` | The value of the item whose panel is open, or `null` if none. Controlled. |
| `defaultValue` | `string \| null` | no | `null` | The initially-open item value when uncontrolled. Default `null`. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [value: string \| null];` | Fires when the reader opens a different item — carries its value, or `null` once all close. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [NavExamples.ts](../../../../apps/playground/src/gallery/fixtures/NavExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [LiveValues.dom.test.ts](../../../../tests/unit/presentation/nav/LiveValues.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
