# Button

Renders a button that runs one command, carrying tone and size variants plus loading and skeleton states.

Source: [Button.vue](Button.vue).

Public import: `import { Button } from '@wow-two-beta/fe/presentation/actions';`.

## Contract

- Unmount disposes the subscriptions, listeners or timers registered by this implementation.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.
- Disabled, loading and skeleton states block activation before child or caller handlers, including slotted links.
- Becoming inactive cancels a pending long press. Disabled targets leave the tab order; loading targets retain focus.
- Loading swaps only the leading icon for the spinner and keeps the label; without a leading icon the spinner centers over the transparent label, so the width and the accessible name hold.

## Props

Inherited contracts: `extends /* @vue-ignore */ ButtonAttributes`. These members remain part of the component surface.

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `variant` | `ButtonVariant` | no | — | The visual surface style. |
| `tone` | `ColorTone` | no | — | The semantic tone palette. |
| `shape` | `ButtonShape` | no | — | The button silhouette (default · square · circle). |
| `size` | `ButtonSize` | no | — | The size — preset name OR raw value OR explicit dim object; see `ButtonSize` for details. |
| `color` | `ColorProp` | no | — | The per-instance color override for `tone` — a string derives all slots, an object sets each. |
| `leadingSlot` | `VNodeChild` | no | `undefined` | The slot before children. Prefer the `leading` named slot. |
| `trailingSlot` | `VNodeChild` | no | `undefined` | The slot after children. Prefer the `trailing` named slot. |
| `hoverSlot` | `VNodeChild` | no | `undefined` | The content shown in place of children on hover / focus-visible (CSS-only swap — no JS hover state). Idle → children visible; hover/focus-visible → `hoverSlot` visible. Pairs with `variant="reveal"` for a reveal-on-hover icon swap. When undefined (and no `hover` slot), children render normally. |
| `loadingSlot` | `VNodeChild` | no | `undefined` | The indicator replacing the built-in `<Spinner/>` while loading. Prefer the `loading` slot. |
| `isLoading` | `boolean` | no | `undefined` | The action-loading state — the spinner takes the leading icon's place, the label stays, the button dims, sets aria-busy and blocks clicks. |
| `loadingText` | `string` | no | — | The text that replaces the label while loading. Omit it to keep the label. No default — consumer supplies (i18n). |
| `isSkeleton` | `boolean` | no | `undefined` | The content-loading state — keeps size and radius, masks content, pulses under `motion-safe`. Defaults to the nearest `DataRegion` first load. Excludes `isLoading`. |
| `isDisabled` | `boolean` | no | `undefined` | The disabled state — drops focus order and clicks. Inherited from an enclosing `Field`. |
| `isFullWidth` | `boolean` | no | `undefined` | The full-width state — stretches to fill container width. |
| `isMultiline` | `boolean` | no | `undefined` | The multi-line state — allows label wrap; default truncates to single line. |
| `asChild` | `boolean` | no | `false` | The as-child flag — renders as the single child element via `Primitive`'s `asChild` merge. |
| `padding` | `PaddingProp` | no | — | The independent padding override (preset token or `{x, y}` object). |
| `radius` | `RadiusProp` | no | — | The independent radius override (preset token or raw value). |
| `width` | `SizeValue` | no | — | The explicit width override. Number = px; string = any CSS unit. |
| `height` | `SizeValue` | no | — | The explicit height override. Number = px; string = any CSS unit. |
| `minWidth` | `SizeValue` | no | — | The min width reserved so the button doesn't reflow when its label morphs. |
| `minHeight` | `SizeValue` | no | — | The min height reserved — symmetric with `minWidth`. |
| `boxSize` | `SizeValue` | no | — | The square-size shorthand — fallback for `width` and `height`, which win when both are set. |
| `type` | `ButtonType` | no | `ButtonType.Button` | The button type. Default `ButtonType.Button` — NOT browser-default `'submit'`. |
| `longPressDelay` | `number` | no | `PressExtensions.longPressDelay.default` | The long-press duration (ms). Default 500. Out-of-range values trigger a dev warning. |
| `debounceMs` | `number` | no | — | The click-throttle window (ms) — first wins; subsequent swallowed via `preventDefault()`. |

## Listeners

| Listener | Type | Meaning |
|---|---|---|
| `onClick` (`@click`) | `(event: MouseEvent) => void` | The native click, typed on the props. It runs after the loading, skeleton, long-press and `debounceMs` gates, so a swallowed click never reaches it. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `press-start` | `'press-start': [event: PressEvent<HTMLButtonElement>];` | Fires when the press begins — pointer-down OR Space/Enter keydown (first event in a gesture). |
| `press-end` | `'press-end': [event: PressEvent<HTMLButtonElement>];` | Fires when the press ends — pointer-up/cancel OR Space/Enter keyup. |
| `long-press` | `'long-press': [event: PressEvent<HTMLButtonElement>];` | Fires when the pointer is held for `longPressDelay` ms. Suppresses the next click. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown;` | The button's own label. Under `asChild`, the single element the button merges onto. |
| `loading` | `loading?(): unknown;` | The indicator shown while loading. Falls back to `loadingSlot`, then to the built-in `Spinner`. |
| `leading` | `leading?(): unknown;` | Rendered before the label, for an icon. Falls back to `leadingSlot`. |
| `trailing` | `trailing?(): unknown;` | Rendered after the label, for an icon. Falls back to `trailingSlot`. |
| `hover` | `hover?(): unknown;` | The content swapped in on hover / focus-visible, overlaying the label. Falls back to `hoverSlot`. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [ActionsExamples.ts](../../../../apps/playground/src/gallery/fixtures/ActionsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [Actions.a11y.dom.test.ts](../../../../tests/unit/presentation/actions/Actions.a11y.dom.test.ts), [Focus.browser.test.ts](../../../../tests/unit/presentation/actions/Focus.browser.test.ts), [GoogleSignInButton.dom.test.ts](../../../../tests/unit/presentation/actions/GoogleSignInButton.dom.test.ts), [EditingBehavior.dom.test.ts](../../../../tests/unit/presentation/forms/EditingBehavior.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

A pointer leaving the action ends its owned press, because release may target another element.
Secondary pointer buttons and composing keys cannot start presses. Non-finite long-press delays use the default.
