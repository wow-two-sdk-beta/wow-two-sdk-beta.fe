# CategoryNav

Renders the category picker as a single-select `ToggleGroup` — segmented icon strip or labelled pill row.

Source: [CategoryNav.vue](CategoryNav.vue).

Internal implementation: compose through the family’s public exports in [index.ts](index.ts).

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Undeclared attributes follow Vue fallthrough to the rendered root when the component has a single element root.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `variant` | `CategoryNavVariant` | yes | — | The category-nav layout — segmented icon strip or labelled pills. |
| `active` | `CategoryKey` | yes | — | The active category. |
| `size` | `EmojiPickerSize` | yes | — | The nav scale. |
| `iconSize` | `number` | no | — | The strip icon size in px. Default `round(nav * 0.8)` derived from the scale. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `select` | `select: [category: CategoryKey];` | Fires when the reader picks a category from the nav, carrying its key. Replaces the legacy `onSelect`. |

## Slots

None declared.

## Exposed handle

No explicit exposed handle.

## Verification

- This internal part is exercised through its owning family; no independent public render fixture is claimed.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
