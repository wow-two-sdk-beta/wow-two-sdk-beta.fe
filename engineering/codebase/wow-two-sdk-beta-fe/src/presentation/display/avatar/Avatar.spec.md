# Avatar

Renders a user image avatar that falls back to initials, with tone, ring, and loading skeleton.

Source: [Avatar.vue](Avatar.vue).

Public import: `import { Avatar } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Behavior

- Initials take the first character (by code point) of the first and last words of `name`.
- Without an image the avatar is one `img` named `alt`, else `name`; the initials themselves are hidden from
  assistive tech. An empty `alt` marks the avatar decorative (`aria-hidden`).
- A failed image is retried when `src` changes.
- Regression: `tests/unit/presentation/display/TextAvatarsSlides.dom.test.ts`.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `shape` | `AvatarShape` | no | — | The silhouette. |
| `tone` | `AvatarTone` | no | — | The tone palette (`none` cedes color to autoColor). |
| `bgStyle` | `AvatarBackground` | no | — | The background fill style. |
| `ring` | `AvatarRing` | no | — | The focus/emphasis ring tone. |
| `isLoading` | `boolean` | no | `undefined` | The skeleton state — keeps the tile's size and shape, hides its content, pulses under `motion-safe`. Defaults to the nearest `DataRegion` first load. |
| `src` | `string` | no | — | The image source; falls back to `name` initials or `fallback` on error. |
| `name` | `string` | no | `''` | The person/entity name — used to derive initials when no image. |
| `fallback` | `string \| number` | no | — | The custom fallback (overrides initials). Rich content goes through the `fallback` slot. |
| `alt` | `string` | no | — | The alt text for the underlying `<img>` (defaults to `name`). |
| `canAutoColor` | `boolean` | no | `undefined` | The auto-color flag — derives a deterministic tint from the `name` hash. A non-neutral `tone` or a non-solid `bgStyle` overrides it. |
| `size` | `AvatarSize` | no | — | The size — preset → variant class · number/string → square inline · object → explicit dims. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `fallback` | `fallback?(): unknown;` | The custom fallback content — wins over the `fallback` prop and the derived initials. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
