# Device class

`useDeviceClass` answers two questions from media features alone: which class this device is (`phone`, `tablet` or
`desktop`), and which class the product has declared a layout for that serves it.
Source: [DeviceClass.ts](DeviceClass.ts), [UseDeviceClass.ts](hooks/UseDeviceClass.ts).

## The rule

`detectDeviceClass({ width, height, pointer }, scale)`, pure and DOM-free:

1. A **phone** when `width < scale.md`, or when the primary pointer is `coarse` and `height < 500`.
2. Else a **tablet** when `width < scale.lg`.
3. Else a **desktop**.

Width alone calls a landscape phone (844x390, finger) a tablet. The second clause is what makes it a phone: a finger
and no room above the keyboard. A fine pointer never makes a phone from height alone, so a desktop window dragged
short stays a desktop. A landscape iPad (1024x768, finger) is a desktop: its height is not short.

`resolveDeviceClass(detected, targets)` maps the detected class onto a declared one, with order
`phone` < `tablet` < `desktop`:

- The **largest declared class not wider than `detected`**.
- When every declared class is wider, the **smallest declared class**.
- An empty or missing `targets` returns `detected`.

| Targets           | phone   | tablet  | desktop |
| ----------------- | ------- | ------- | ------- |
| `desktop`         | desktop | desktop | desktop |
| `tablet, desktop` | tablet  | tablet  | desktop |
| `phone, desktop`  | phone   | phone   | desktop |
| `phone`           | phone   | phone   | phone   |
| _(none declared)_ | phone   | tablet  | desktop |

## Options

`useDeviceClass(options)` returns `{ detected, effective, isShortHeight, isCoarsePointer }`, each a `ComputedRef`.

| Option    | Meaning                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------ |
| `scale`   | **Required.** The app's breakpoints, holding `md` and `lg`. The library has no scale of its own.       |
| `targets` | The classes the product declares in its design spec. Optional: omitted, `effective` equals `detected`. |

- `scale` and `targets` take a value, a ref or a getter; a change re-evaluates the result.
- `detected` is what the device is. `effective` is the declared class that serves it: lay out by `effective`.
- `isShortHeight` is the `(max-height: 499px)` query. `isCoarsePointer` is `(pointer: coarse)`, the answer to "is this
  a touch device" — size hit targets by it, not by the class.
- Reactive: rotating a phone or docking a keyboard changes the result without a reload.

## App-level declaration

`provideDeviceTargets(targets, scale)`, called once in the app root's setup, builds the state once and provides it.
`useDeviceClass()` with **no options**, anywhere below, returns that shared state: one set of media-query
subscriptions however many components ask. It throws without a provider, because there is no default scale to guess.
A call that passes options is standalone and does not inherit the provider's targets.

`provideDeviceTargets` also keeps `data-device-class="phone|tablet|desktop"` (the effective class) on
`document.documentElement` while mounted, and restores the previous value on unmount. It is the composable's job and
there is no `DeviceClassProvider` component: the attribute is one document-level write owned by the one app root,
and a component would add a slot wrapper and an SFC for what one setup call does. Call it once per document.

## SSR

On the server and until mount the class reads **`desktop`** (`isShortHeight` and `isCoarsePointer` read `false`), and
corrects on hydration, the way `usePointerType` reads `'none'`. Every media query is `false` before mount, which would
otherwise read as a phone. The attribute is absent until mount, so write attribute selectors as overrides of an
unattributed base layout.

## Class-keyed CSS

`src/index.css`, the stylesheet an app imports, ships three Tailwind variants over that attribute:

| Variant    | Matches                                                                    |
| ---------- | -------------------------------------------------------------------------- |
| `phone:`   | an element below `<html data-device-class="phone">`, e.g. `phone:hidden`   |
| `tablet:`  | an element below `<html data-device-class="tablet">`, e.g. `tablet:flex`   |
| `desktop:` | an element below `<html data-device-class="desktop">`, e.g. `desktop:grid` |

- Each compiles to `&:where([data-device-class='…'] *)`: `html` itself never matches, and the utility keeps its own
  specificity. `not-phone:`, `not-tablet:` and `not-desktop:` work through Tailwind's `not-*`.
- The attribute is the **effective** class, so a variant follows the layout the shell serves: under
  `[phone, desktop]` targets a landscape phone (844x390, finger) matches `phone:` though `md:` reads its width as a
  tablet.
- **Unattributed base.** The attribute is absent on the server, before mount, and in an app that never calls
  `provideDeviceTargets`. There `phone:`, `tablet:` and `desktop:` are all off and every `not-*` is on. Write the
  unprefixed utility as the desktop layout, the one the server renders, and correct it with `phone:` or `tablet:` after
  mount. A phone paints that base for a frame first.
- **Width or class.** A decision about room (columns, text size, a sidebar that needs the width) keeps `sm:`..`2xl:`.
  A decision about which layout is served (a bottom bar on the phone layout, a hidden side nav) uses the class
  variants, so CSS agrees with `useDeviceClass().effective`. `max-md:hidden` or `md:hidden` on a part of the shell
  follows width while the shell may be forced to the phone layout.
- With `desktop` as the only target every device is `desktop:`; `phone:` never matches, though `detected` can still
  read a phone.

```html
<!-- the unprefixed utilities are the desktop layout; the variants override after mount -->
<nav class="flex phone:hidden">…</nav>
<footer class="hidden phone:flex">…</footer>
```

## Examples

A phone-first consumer product declares a phone layout and a desktop layout. A tablet gets the phone layout:

```ts
// App.vue
provideDeviceTargets([DeviceClass.Phone, DeviceClass.Desktop], TailwindBreakpoints);

// any component below
const { effective } = useDeviceClass();
```

```css
/* the unattributed base is the desktop layout */
[data-device-class='phone'] .page {
  padding-inline: 1rem;
}
```

A desktop-first back-office product declares `desktop` only. Every device gets the desktop layout, and `detected` is
still there for the one place that must warn that a phone is too small:

```ts
provideDeviceTargets([DeviceClass.Desktop], myScale); // myScale = { md: 720, lg: 1100 }, from the app's @theme

const { detected } = useDeviceClass();
const showSmallScreenNotice = computed(() => detected.value === DeviceClass.Phone);
```

Standalone, for one component with its own scale:

```ts
const targets = [DeviceClass.Tablet, DeviceClass.Desktop];
const { effective } = useDeviceClass({ scale: TailwindBreakpoints, targets });
```

## Why media features, not user agents

"Phone" is read from the viewport and the pointer, the facts a layout actually depends on, and not from the device's
name. A user agent is spoofed, frozen on Chromium and absent for an iPad that reports as a Mac; it cannot say that a
tablet just gained a keyboard. `(pointer: coarse)`, `min-width` and `max-height` re-evaluate on every rotation,
resize and dock. Width is read through `useMediaQuery`, never `window.innerWidth`, so it follows the same
subscription rules as every other query in this slice. See `Platform.ts` for the one place a platform string is
allowed, and why it is cosmetic only.

The breakpoints are the app's own: pass `TailwindBreakpoints` only when the app keeps Tailwind's defaults, or JS and
CSS will disagree about where a phone ends.

## Verification

[Pure rule](../../../tests/unit/foundation/device/DeviceClass.test.ts),
[composable and provider](../../../tests/unit/foundation/device/DeviceClass.dom.test.ts),
[server render](../../../tests/unit/foundation/device/DeviceClass.ssr.test.ts),
[real viewports](../../../tests/unit/foundation/device/DeviceClass.browser.test.ts) and
[class-keyed variants](../../../tests/unit/foundation/device/DeviceVariants.test.ts), compiled by the Tailwind the SDK
builds with.
