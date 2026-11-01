# SwapTransition

Source: [SwapTransition.ts](SwapTransition.ts). Public import:
`import { SwapTransition } from '@wow-two-beta/fe/foundation/primitives';`.

## Renders

A `div` box around a `display: flow-root` content wrapper, around Vue's `<Transition mode="out-in" :css="false">`.
Caller `class`, `style` and attributes fall through to the box. The default slot holds one child; its key or type
identifies the content, as in any `<Transition>`: a keyed `<component :is>` from a `RouterView` slot, or
`v-if` / `v-else` branches.

```vue
<RouterView v-slot="{ Component, route }">
  <Card>
    <SwapTransition>
      <component :is="Component" :key="route.path" />
    </SwapTransition>
  </Card>
</RouterView>
```

## Behavior

- A swap runs three phases: the content wrapper fades the old content out, the box animates its height from the
  height on screen to the new content's height, and the wrapper fades the new content in. Equal heights skip the
  height phase.
- The box carries `data-swapping` from the first phase to the end of the last; while it does, its `height` and
  `overflow: hidden` are inline, and both return to the content afterwards.
- Between swaps, a `ResizeObserver` on the content wrapper animates the box from the previous content height to
  the new one — an error message appearing, a section expanding. A swap that starts mid-resize, or a swap that
  replaces an entering one, continues from the height and opacity on screen.
- A change to nothing (`v-if` turned false) fades out and animates the height to the empty content; a change from
  nothing animates the height up and fades in.
- The first render, `isEnabled: false`, `prefers-reduced-motion: reduce` and a hidden document swap and resize
  instantly, with no inline residue.
- Each phase settles on its animation or on a timer past its duration, so a background tab still finishes the swap.
- The leaving content is `inert`. Focus inside it moves to the box as a programmatic focus target (`focusTarget`,
  `foundation/dom`: `tabindex="-1"`, `data-focus-target`, no ring) before the content goes; the box drops the
  marks it added when focus leaves it, and the next Tab reaches the new content. Focus elsewhere is untouched.
- The fades and the height run on the two wrappers: the child's own styles and root are never written.
- Server rendering renders the box, the wrapper and the child; the observer and every measurement start on mount.

## Props

| Prop           | Type      | Required | Default     | Meaning                                                      |
| -------------- | --------- | -------- | ----------- | ------------------------------------------------------------ |
| `isEnabled`    | `boolean` | no       | `true`      | Whether swaps and height changes animate.                    |
| `duration`     | `number`  | no       | `200`       | The height phase, in milliseconds.                           |
| `fadeDuration` | `number`  | no       | `120`       | Each fade phase, in milliseconds.                            |
| `easing`       | `string`  | no       | ease-out    | The easing curve of every phase (`AnimationDefaults.easing`). |

## Slots

| Slot      | Meaning                                                    |
| --------- | ---------------------------------------------------------- |
| `default` | The one swapped child — keyed, or a `v-if` / `v-else` branch. |

## Exports

`SwapTransitionAttribute` is `'data-swapping'`, the box's swap marker.

## Verification

- Swap sequence, reduced motion, first render, focus and cleanup: `tests/unit/foundation/primitives/SwapTransition.dom.test.ts`.
- Real layout, WAAPI motion, the height follow and the focus ring: `tests/unit/foundation/primitives/SwapTransition.browser.test.ts`.
- SSR and mount breadth: `tests/unit/foundation/primitives/PrimitivesCases.ts`.
- Demo: the `SwapTransition` card in the playground's layout group.
