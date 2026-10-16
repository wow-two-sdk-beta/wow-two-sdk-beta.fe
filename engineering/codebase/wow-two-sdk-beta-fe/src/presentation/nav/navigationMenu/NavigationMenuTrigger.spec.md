# NavigationMenuTrigger

Renders the button that expands an item's panel, and anchors the panel's position.

Source: [NavigationMenuTrigger.vue](NavigationMenuTrigger.vue).

Public import: `import { NavigationMenuTrigger } from '@wow-two-beta/ui-vue/presentation/nav';`.

## Contract

- Mount within the owner supplying `useNavigationMenuContext`, `useNavigationMenuItemContext`, `useRovingFocusItem`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

No declared props.

## Emits

None declared.

## Slots

| Slot      | Signature            | Meaning                     |
| --------- | -------------------- | --------------------------- |
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [NavExamples.ts](../../../../apps/playground/src/gallery/fixtures/NavExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

## Interaction guarantees

ArrowDown opens the current panel and focuses its first interactive link after mount. Disabled triggers cannot open through hover or keyboard.
