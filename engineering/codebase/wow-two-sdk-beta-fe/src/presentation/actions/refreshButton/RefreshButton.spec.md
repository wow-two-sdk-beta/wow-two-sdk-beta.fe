# RefreshButton

Renders the refresh control a region reruns its reads with — a `Button` preset over `useRefresh`.

Source: [RefreshButton.vue](RefreshButton.vue).

Public import: `import { RefreshButton } from '@wow-two-beta/fe/presentation/actions';`.

## Contract

- A neutral `Button` with a leading refresh icon and `label`; `isIconOnly` drops the text, squares the button and names
  it through `aria-label` and `title`.
- While `isRefreshing` the `Button` loading state applies: the spinner replaces the icon, the label and the width stay,
  `aria-busy` is set and clicks are swallowed until the refresh settles.
- Bind `@click` to `useRefresh`'s `refresh` and `isRefreshing` to its `refreshing`; the same flag drives the region's
  placeholders, so a refresh that answers at once still shows for `useRefresh`'s minimum duration.
- Every other `Button` prop and attribute forwards; `variant` defaults to `outline` and `size` to `sm`.
- Automatic attribute inheritance is disabled; the source explicitly forwards fallthrough attributes to the `Button`.

## Props

Inherited contracts: `extends /* @vue-ignore */ RefreshButtonAttributes` — `ButtonProps` minus `isLoading`, `shape`
and `leadingSlot`.

| Prop           | Type            | Required | Default          | Meaning                                                       |
| -------------- | --------------- | -------- | ---------------- | ------------------------------------------------------------- |
| `isRefreshing` | `boolean`       | no       | `false`          | True from the click until the refresh settles.                |
| `label`        | `string`        | no       | locale `Refresh` | The visible label, or the icon-only button's accessible name. |
| `isIconOnly`   | `boolean`       | no       | `false`          | Renders the icon alone, square, named by `label`.             |
| `variant`      | `ButtonVariant` | no       | `'outline'`      | The surface style; `ghost` inside a panel header.             |
| `size`         | `ButtonSize`    | no       | `'sm'`           | The size step.                                                |

## Emits

None declared; `@click` reaches the `Button`.

## Slots

None.

## Exposed handle

No explicit exposed handle.

```vue
<script setup lang="ts">
const { refresh, refreshing } = useRefresh(() => query.refetch());
</script>
<template>
  <RefreshButton :is-refreshing="refreshing" @click="refresh" />
</template>
```

## Verification

- Public render fixture: [ActionsExamples.ts](../../../../apps/playground/src/gallery/fixtures/ActionsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [RefreshButton.dom.test.ts](../../../../tests/unit/presentation/actions/RefreshButton.dom.test.ts).
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
