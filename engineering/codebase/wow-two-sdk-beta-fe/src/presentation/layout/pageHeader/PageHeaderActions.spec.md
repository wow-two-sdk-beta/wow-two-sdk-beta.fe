# PageHeaderActions

Places a page's primary actions in the app's `PageHeader`, wherever the page renders.

Source: [PageHeaderActions.vue](PageHeaderActions.vue).

Public import: `import { PageHeaderActions } from '@wow-two-beta/fe/presentation/layout';`.

## Contract

- The default slot teleports into the outlet of the app's mounted `PageHeader`, so a routed page can contribute
  actions to a header its layout renders.
- Without a mounted header — and during server rendering — the actions render in place.
- Unmounting the page removes its actions from the header.

## Props

No declared props.

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | The actions. |

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts).
- Focused test references: [PageHeader.dom.test.ts](../../../../tests/unit/presentation/layout/PageHeader.dom.test.ts).
