# ActivityItem

Renders one `ActivityTimeline` row: avatar rail, the activity sentence, optional preview and actions.

Source: [ActivityItem.vue](ActivityItem.vue).

Public import: `import { ActivityItem } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `timestamp` | `string \| number` | no | — | The timestamp (relative or absolute). Rich content → the `timestamp` slot. |
| `isLast` | `boolean` | no | `undefined` | The connector-line suppression under the leading column. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `avatar` | `avatar(): unknown;` | The avatar / icon node rendered in the leading column. |
| `default` | `default(): unknown;` | The activity sentence (actor + verb + target) — the default slot. |
| `timestamp` | `timestamp(): unknown;` | The timestamp override, when a plain string is not enough. |
| `preview` | `preview(): unknown;` | The content preview rendered under the sentence (quoted comment, file name, image). |
| `actions` | `actions(): unknown;` | The trailing actions (e.g. Reply / Like). |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
