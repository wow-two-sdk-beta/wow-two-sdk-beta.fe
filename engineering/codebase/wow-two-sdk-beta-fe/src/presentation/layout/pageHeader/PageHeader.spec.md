# PageHeader

Renders a page's identity — title, description and actions — with an outlet that `PageHeaderActions` fills.

Source: [PageHeader.vue](PageHeader.vue).

Public import: `import { PageHeader } from '@wow-two-beta/ui-vue/presentation/layout';`.

## Contract

- The title renders as a level-1 heading by default, the description under it; slots override either.
- Actions from the `actions` slot come first, then any a page contributes through `PageHeaderActions`, which
  teleport into this header client-side.
- The most recently mounted `PageHeader` of an app owns the outlet; unmounting releases it.
- Automatic attribute inheritance is disabled; attributes and `class` reach the root `<header>`.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `title` | `string \| number` | no | — | The page title. |
| `description` | `string \| number` | no | — | The supporting line under the title. |
| `level` | `1–6` | no | `1` | The heading level. |
| `size` | `SectionHeadingSize` | no | `xl` | The title size. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `title` | `title?(): unknown` | Rich title. |
| `description` | `description?(): unknown` | Rich description. |
| `actions` | `actions?(): unknown` | The header's own actions. |

## Exposed handle

`{ el }` — the root `<header>`, resolved after mount.

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts).
- Focused test references: [PageHeader.dom.test.ts](../../../../tests/unit/presentation/layout/PageHeader.dom.test.ts).
