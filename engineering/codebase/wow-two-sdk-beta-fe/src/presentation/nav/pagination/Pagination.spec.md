# Pagination

Renders a compact page-number row with prev / next arrows and ellipses for skipped ranges.

Source: [Pagination.vue](Pagination.vue).

Public import: `import { Pagination } from '@wow-two-beta/ui-vue/presentation/nav';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop            | Type      | Required | Default | Meaning                                                                                   |
| --------------- | --------- | -------- | ------- | ----------------------------------------------------------------------------------------- |
| `total`         | `number`  | yes      | —       | The total page count (1-based).                                                           |
| `page`          | `number`  | yes      | —       | The current page (1-based). The `v-model:page` binding target.                            |
| `siblings`      | `number`  | no       | `1`     | The number of page buttons surrounding the current. Default `1` (so 1 + current + 1 = 3). |
| `showFirstLast` | `boolean` | no       | `true`  | Shows the first/last buttons beside prev/next and the numbers. Default `true`.            |
| `hideFirstLast` | `boolean` | no       | —       | Deprecated — use `showFirstLast` (inverted); removed next release.                        |

## Emits

| Event         | Signature                        | Meaning                                                                    |
| ------------- | -------------------------------- | -------------------------------------------------------------------------- |
| `update:page` | `'update:page': [page: number];` | Fires when the reader lands on a different page — the `v-model:page` half. |

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [NavExamples.ts](../../../../apps/playground/src/gallery/fixtures/NavExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

## Interaction guarantees

Nonfinite/invalid totals render one page. Current page normalizes to an integer within the total. Invalid siblings use the default; negative siblings use zero. At most 50 neighbors on each side are rendered, a UI allocation budget that does not truncate the dataset total. Choosing the current page emits no redundant update.
