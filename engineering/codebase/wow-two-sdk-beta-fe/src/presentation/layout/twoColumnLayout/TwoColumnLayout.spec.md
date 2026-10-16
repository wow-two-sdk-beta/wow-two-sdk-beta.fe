# TwoColumnLayout

Renders a two-pane layout — fixed-width aside + flexible main.

Source: [TwoColumnLayout.vue](TwoColumnLayout.vue).

Public import: `import { TwoColumnLayout } from '@wow-two-beta/ui-vue/presentation/layout';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `asideWidth` | `string` | no | `'w-64'` | The aside width — Tailwind class string (e.g. `w-64`). Default `w-64`. |
| `asideSide` | `Side` | no | `Side.Left` | The side the aside sits on — `left` or `right`. Default `left`. |
| `gap` | `'0' \| '4' \| '6' \| '8' \| '10'` | no | `'6'` | The gap between aside and main. Default `6`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `aside` | `aside(): unknown;` | The sidebar / aside content. |
| `default` | `default(): unknown;` | The main content. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
