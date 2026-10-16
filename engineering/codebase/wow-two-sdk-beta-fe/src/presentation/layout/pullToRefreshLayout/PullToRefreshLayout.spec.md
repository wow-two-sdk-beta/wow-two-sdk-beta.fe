# PullToRefreshLayout

Renders a pull-to-refresh wrapper.

Source: [PullToRefreshLayout.vue](PullToRefreshLayout.vue).

Public import: `import { PullToRefreshLayout } from '@wow-two-beta/ui-vue/presentation/layout';`.

## Contract

- Unmount disposes the subscriptions, listeners or timers registered by this implementation.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `onRefresh` | `() => Promise<void> \| void` | yes | — | Declared by the source contract. |
| `threshold` | `number` | no | `60` | Declared by the source contract. |
| `maxPull` | `number` | no | `120` | Declared by the source contract. |
| `isDisabled` | `boolean` | no | `false` | Declared by the source contract. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
