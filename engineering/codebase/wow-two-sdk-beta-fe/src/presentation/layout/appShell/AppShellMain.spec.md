# AppShellMain

Renders the primary column into the `main` grid area — also the skip-link's target.

Source: [AppShellMain.vue](AppShellMain.vue).

Public import: `import { AppShellMain } from '@wow-two-beta/fe/presentation/layout';`.

## Contract

- In a `region` shell the element is the one scroll container and carries `ScrollRegionAttribute`
  (`data-scroll-region`), so `createAppRouter` restores its offset on back/forward and resets it on a new
  navigation, as it does the window's.
- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

No declared props.

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
