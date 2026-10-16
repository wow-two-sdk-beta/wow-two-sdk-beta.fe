# NavItem

Renders a sidebar / nav row — icon, label, trailing slot, and an active state.

Source: [NavItem.vue](NavItem.vue).

Public import: `import { NavItem } from '@wow-two-beta/ui-vue/presentation/nav';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Inside a horizontal `Navbar` the item sizes to its label and never wraps; elsewhere (a rail, a sidebar, a drawer) it fills the row.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `asChild` | `boolean` | no | `false` | The escape hatch to render the child element instead of an `<a>` (router LinkItem). |
| `isActive` | `boolean` | no | `undefined` | The active state (visual + `aria-current="page"`). |
| `size` | `Size` | no | `SizeToken.Md` | The visual size. Default `md`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown;` | The visual label. |
| `icon` | `icon?(): unknown;` | The leading icon. |
| `trailing` | `trailing?(): unknown;` | The trailing slot — typically a count badge or status dot. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [NavExamples.ts](../../../../apps/playground/src/gallery/fixtures/NavExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [Nav.a11y.dom.test.ts](../../../../tests/unit/presentation/nav/Nav.a11y.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
