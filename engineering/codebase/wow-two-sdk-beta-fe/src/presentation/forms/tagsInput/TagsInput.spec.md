# TagsInput

Renders committed tags as chips beside a free-form input — Enter, comma or Tab commits the next one.

Source: [TagsInput.vue](TagsInput.vue).

Public import: `import { TagsInput } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the outer state owner. Nested controls reconcile without issuing their own default requests. Composite drafts remount from the resolved state. A cancelled reset changes nothing.

- Composing Enter/Tab and delimiters do not commit a tag.
- Tab may commit a nonempty draft while keeping native keyboard navigation.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `size` | `InputSize` | no | — | The control size. |
| `state` | `InputState` | no | — | The validity surface. |
| `modelValue` | `ReadonlyArray<string>` | no | — | The committed tags, controlled. The `v-model` binding target. |
| `defaultValue` | `ReadonlyArray<string>` | no | — | The initial tags when uncontrolled. |
| `inputValue` | `string` | no | — | The in-flight text, controlled. The `v-model:input-value` binding target. |
| `placeholder` | `string` | no | `'Add tag…'` | The empty-state placeholder. |
| `delimiters` | `ReadonlyArray<string>` | no | `() => [',']` | The characters that commit the current input. Enter and Tab always do. |
| `validate` | `(tag: string) => boolean` | no | `(t: string) => t.trim().length > 0` | The predicate gating committed tags. Default: non-empty after trim. Kept a PROP, not an emit: it RETURNS a verdict, which an emit cannot do. |
| `canAddDuplicates` | `boolean` | no | `false` | Whether the same tag may be committed twice. Default `false`. |
| `allowsDuplicates` | `boolean` | no | —       | Deprecated — use `canAddDuplicates`; removed next release. |
| `max` | `number` | no | — | The cap on committed tags. |
| `isInvalid` | `boolean` | no | `undefined` | The invalid surface override. Falls back to the surrounding form control's `isInvalid`. |
| `name` | `string` | no | — | The hidden input name; the hidden input emits the comma-joined value. |
| `tagVariant` | `TagVariant` | no | `'neutral'` | The chip variant. The NAMED type, not `TagVariants['variant']` — the SFC prop resolver cannot follow an indexed access into an imported interface, and the build fails on it while `vue-tsc` stays green. |
| `id` | `string` | no | — | The control's id. Auto-filled from `FormControl` context when omitted. |
| `isDisabled` | `boolean` | no | `undefined` | The disabled state. Falls back to the surrounding field's `isDisabled`. |
| `disabled` | `boolean` | no | `undefined` | Deprecated alias of `isDisabled`; removed next release. |
| `isReadOnly` | `boolean` | no | `undefined` | Keeps the value but blocks changes. Falls back to the surrounding field's `isReadOnly`. |
| `readOnly` | `boolean` | no | `undefined` | Deprecated alias of `isReadOnly`; removed next release. |
| `readonly` | `boolean` | no | `undefined` | Deprecated alias of `isReadOnly`; removed next release. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [tags: ReadonlyArray<string>];` | Fires when the reader commits or removes a tag — the `v-model` half. |
| `update:inputValue` | `'update:inputValue': [input: string];` | Fires when the reader edits the uncommitted draft text — the `v-model:input-value` half. |

## Slots

None declared.

## Exposed handle

`{ el: input }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Reset regressions: [CompositeReset.dom.test.ts](../../../../tests/unit/presentation/forms/CompositeReset.dom.test.ts).

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [InputInteraction.dom.test.ts](../../../../tests/unit/presentation/forms/InputInteraction.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
