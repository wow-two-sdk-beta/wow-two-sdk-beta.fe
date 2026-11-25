# Tooltip

Renders a hover- or focus-triggered tooltip into a Portal, positioned by Floating UI.

Source: [Tooltip.vue](Tooltip.vue).

Public import: `import { Tooltip } from '@wow-two-beta/fe/presentation/overlays';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Unmount disposes the subscriptions, listeners or timers registered by this implementation.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.
- The trigger clone is built during render, so its anchor ref is owned by the rendering tooltip; a consumer ref on the trigger is kept beside it.
- The positioned floating root carries the `z-tooltip` layer (100), above sticky bars, menus, popovers and modals; the body inside sets no z-index of its own.
- Hover and focus share one pending open. The tooltip closes when both leave or Escape dismisses it.
- The SDK tracks one tooltip owner per document across Vue roots and portals. A new trigger or explicit open can take ownership. The previous tooltip cancels its timers and removes its body immediately, including a fade in progress. Focus remains on its trigger. A displaced tooltip needs a fresh interaction or open request to take ownership again. A tooltip that takes ownership from one still on screen, visible or fading out, mounts its first body fully opaque, so a switch between neighbours replays no fade; one that takes it from a tooltip that never opened fades in as usual.
- The SDK opens after 350 ms and fades over 200 ms. Closing starts immediately.
- With `fadeDuration` (ms, greater than 0) the body mounts transparent, turns opaque once the browser has laid it out, and fades in through an opacity transition of that length; closing, by leaving, blur, Escape or `isDisabled`, turns it transparent and unmounts it on a timer of the same length, so it never waits for `transitionend`. Reopening during the fade-out keeps the same body and turns it opaque again. Under `prefers-reduced-motion: reduce`, or with a `fadeDuration` of `0` or less, there is no fade and the default path runs. `aria-describedby` follows the open state, not the fade.
- The body uses the active theme's popover background, foreground and border tokens.

## Props

| Prop           | Type               | Required | Default     | Meaning                                                                                       |
| -------------- | ------------------ | -------- | ----------- | --------------------------------------------------------------------------------------------- |
| `content`      | `string \| number` | no       | `undefined` | The tooltip body. Rich content goes through the `content` slot.                               |
| `placement`    | `Placement`        | no       | `'top'`     | The Floating UI placement. Default `top`.                                                     |
| `openDelay`    | `number`           | no       | `350`       | The delay before opening on hover, in ms.                                                     |
| `closeDelay`   | `number`           | no       | `0`         | The delay before closing on leave, in ms. Default 0.                                          |
| `fadeDuration` | `number`           | no       | `200`       | The fade duration in ms. Zero and reduced motion use an immediate transition.                 |
| `open`         | `boolean`          | no       | `undefined` | Controlled axes use their canonical Vue model names; each update event requests caller state. |
| `defaultOpen`  | `boolean`          | no       | `false`     | The initial open state when uncontrolled. Default `false`.                                    |
| `isDisabled`   | `boolean`          | no       | `undefined` | The disabled mode — suppresses rendering even on hover (e.g. when content is empty).          |

## Emits

| Event         | Signature                         | Meaning                                                          |
| ------------- | --------------------------------- | ---------------------------------------------------------------- |
| `update:open` | `'update:open': [open: boolean];` | Fires when the tooltip shows or hides — the `v-model:open` half. |

## Slots

| Slot      | Signature              | Meaning                                                                                         |
| --------- | ---------------------- | ----------------------------------------------------------------------------------------------- |
| `default` | `default(): unknown;`  | The single child element — the trigger. Receives the handlers, the ref, and `aria-describedby`. |
| `content` | `content?(): unknown;` | The rich override for the `content` prop.                                                       |

## Exposed handle

No explicit exposed handle.

## Verification

- Focused tests: [TooltipInteraction.dom.test.ts](../../../../tests/unit/presentation/overlays/TooltipInteraction.dom.test.ts) — the open delay, hover and focus sharing one pending open, Escape staying dismissed; [TooltipFade.dom.test.ts](../../../../tests/unit/presentation/overlays/TooltipFade.dom.test.ts) — the default path unchanged (no `style` on the body, removed at once with its portal), the body mounting transparent then opaque with `opacity 300ms ease-out`, a body taking the page from a visible or fading tooltip mounting opaque while one taking it from a tooltip that never opened still fades in, staying mounted while it fades out and leaving on the timer, a return during the fade-out keeping the body, Escape fading out, an unmount mid-fade leaving no timer, reduced motion playing no fade.
- Real browser: [TooltipFade.browser.test.ts](../../../../tests/unit/presentation/overlays/TooltipFade.browser.test.ts) (chromium, webkit, forced colors) — the computed opacity rising from below 1 to 1 and falling again before the body leaves, the default path at opacity 1 with no style, reduced motion removing the body at once; [TooltipLayer.browser.test.ts](../../../../tests/unit/presentation/overlays/TooltipLayer.browser.test.ts) — the layer above sticky bars and a switch between neighbours with no replayed fade. Both files park the real pointer in a corner before their tests: the trigger is driven with synthetic events, and a pointer left under it by an earlier test would fire a trusted `pointerenter` after the first layout, which takes ownership as designed and makes the test read the wrong tooltip.
- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

Disabling clears pending delays and closes uncontrolled state; re-enabling cannot resurrect an old hover timer.
