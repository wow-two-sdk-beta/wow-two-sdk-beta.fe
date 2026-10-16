# FabButton

Renders a floating action button — a circular, shadowed control pinned to a corner of the viewport.

Source: [FabButton.vue](FabButton.vue).

Public import: `import { FabButton } from '@wow-two-beta/ui-vue/presentation/actions';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

Inherited contracts: `extends /* @vue-ignore */ FabButtonAttributes, /* @vue-ignore */ Omit<FabButtonVariants, 'variant' | 'size' | 'position'>`. These members remain part of the component surface.

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `variant` | `FabButtonVariant` | no | — | The visual surface style. |
| `size` | `FabButtonSize` | no | — | The button diameter. |
| `position` | `OverlayPosition` | no | — | The anchor position on the viewport. |
| `type` | `ButtonType` | no | `ButtonType.Button` | The button type. Default `ButtonType.Button`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown;` | The button's content — typically a single icon. |

## Exposed handle

`{ el: root }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [ActionsExamples.ts](../../../../apps/playground/src/gallery/fixtures/ActionsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [Actions.a11y.dom.test.ts](../../../../tests/unit/presentation/actions/Actions.a11y.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
