# RadiusGlyph

Renders a concentric-circle glyph whose filled inner disc scales with `extent` (`0..1`).

Source: [RadiusGlyph.vue](RadiusGlyph.vue).

Public import: `import { RadiusGlyph } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Undeclared attributes follow Vue fallthrough to the rendered root when the component has a single element root.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `extent` | `number` | yes | `0` | The filled inner disc's radius as a fraction of the outer track (`0..1`). |
| `size` | `number` | no | `16` | The glyph's pixel size. |
| `color` | `string` | no | `'currentColor'` | The stroke and fill color. |
| `strokeWidth` | `number` | no | `1.5` | The outer track's stroke width. |
| `trackOpacity` | `number` | no | `0.4` | The outer track's opacity. |

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
