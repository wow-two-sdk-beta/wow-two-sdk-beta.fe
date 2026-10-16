# FrameGlyph

Renders a nested-frame glyph — an outer frame plus inner pupil, or the enlarged pupil alone.

Source: [FrameGlyph.vue](FrameGlyph.vue).

Public import: `import { FrameGlyph } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Undeclared attributes follow Vue fallthrough to the rendered root when the component has a single element root.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `frameRx` | `number` | yes | `0` | The outer frame's corner radius (`0` = square). |
| `pupilRoundness` | `number` | yes | `0` | The pupil's roundness as a fraction of its size (`0` = square, `0.5` = circle). |
| `isDot` | `boolean` | no | `undefined` | The dot-only mode — renders only the enlarged inner pupil instead of the full frame + pupil. |
| `size` | `number` | no | `20` | The glyph's pixel size. |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [DisplayRequiredProps.dom.test.ts](../../../../tests/unit/presentation/display/DisplayRequiredProps.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
