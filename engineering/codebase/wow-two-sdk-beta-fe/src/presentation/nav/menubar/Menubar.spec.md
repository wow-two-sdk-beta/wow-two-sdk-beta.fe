# Menubar

Renders the application menu bar — one composite tab stop holding a single menu open at a time.

Source: [Menubar.vue](Menubar.vue).

Public import: `import { Menubar } from '@wow-two-beta/ui-vue/presentation/nav';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop           | Type             | Required | Default     | Meaning                                                           |
| -------------- | ---------------- | -------- | ----------- | ----------------------------------------------------------------- |
| `modelValue`   | `string \| null` | no       | `undefined` | The id of the currently-open menu, or `null` if none. Controlled. |
| `defaultValue` | `string \| null` | no       | `null`      | The initially-open menu id when uncontrolled. Default `null`.     |

## Emits

| Event               | Signature                                       | Meaning                                                                                  |
| ------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `update:modelValue` | `'update:modelValue': [value: string \| null];` | Fires when the reader opens a different menu — carries its id, or `null` once all close. |

## Slots

| Slot      | Signature            | Meaning                     |
| --------- | -------------------- | --------------------------- |
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el: HTMLElement | null }` targets the inner Card or RovingFocusGroup DOM root, not its component instance. Read after mount; the handle is null before mount and after the child unmounts. It is suitable for native focus, measurement and scrolling; it does not expose child implementation methods.

## Verification

- Public render fixture: [NavExamples.ts](../../../../apps/playground/src/gallery/fixtures/NavExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [LiveValues.dom.test.ts](../../../../tests/unit/presentation/nav/LiveValues.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

## Interaction guarantees

Open-menu arrow movement follows current DOM order, skips disabled triggers and respects RTL. Disabled triggers cannot open via hover or synthetic activation.
