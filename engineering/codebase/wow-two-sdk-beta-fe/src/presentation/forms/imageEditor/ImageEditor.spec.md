# ImageEditor

A portable image-editing surface. It composes `ImageCropEditor`, the shared snapshot history, buttons,
checkboxes and numeric inputs. Processing and persistence belong to the caller.

Public component: `@wow-two-beta/ui-vue/presentation/forms`.
Public values: `@wow-two-beta/ui-vue/domain/imageEditing` (also exported by `presentation/forms`).

## State and intents

`modelValue` / `update:modelValue` carry `ImageEditRecipe`; `defaultValue` seeds uncontrolled state.
Ownership is fixed at setup. The component never fetches image bytes, calls a processing service,
rewrites the original `src`, saves files, or auto-applies an edit. Browser image elements load the supplied
original and optional preview URLs in the ordinary way.

`preview(recipe)` and `apply(recipe)` fire only from the named buttons. The payload is an independent
copy. Callers enforce authorization, resource limits, MIME checks, source identity, expected revision,
and approved media persistence separately. A successful preview is not publication approval.

| Prop                            | Default        | Meaning                                                                        |
| ------------------------------- | -------------- | ------------------------------------------------------------------------------ |
| `src`                           | required       | URL of the original upright image, never a thumbnail used as coordinate source |
| `naturalWidth`, `naturalHeight` | required       | Upright source dimensions in pixels                                            |
| `alt`                           | empty          | Alternative text for the original                                              |
| `modelValue`, `defaultValue`    | default recipe | Controlled or initial edit recipe                                              |
| `previewSrc`                    | absent         | Caller-processed result; a new URL acknowledges a new result                   |
| `canRemoveBackground`           | false          | Explicit configured processing capability                                      |
| `maxDimension`                  | 8192           | Maximum output width or height                                                 |
| `maxPixels`                     | 50,000,000     | Maximum source and output pixel count; callers may lower it                    |
| `isBusy`                        | false          | Blocks all user edit, preview and apply intents; announces processing          |
| `error`                         | absent         | Caller processing failure, announced through `role=alert`                      |
| `isDisabled`, `isReadOnly`      | Field context  | Blocks interaction                                                             |

## Recipe

```ts
{
  crop: null,                         // or { x, y, width, height }
  rotate: 0,                          // clockwise 0 | 90 | 180 | 270
  flipHorizontal: false,
  flipVertical: false,
  resize: null,                       // or exact positive { width, height }
  output: { format: 'png', quality: 90 }, // PNG | JPEG | WebP; quality 1–100
  removeBackground: false,
}
```

- `crop` uses original upright natural pixels, before rotation and flipping; null preserves the whole image.
- Portable order: optional background removal first, then orient → crop → rotate → flip → resize → encode.
  A removal adapter must preserve the original upright dimensions and alpha. It must not silently crop its result.
- The backend `ImageEditSpec` accepts the same crop/rotation/flip fields. Map resize to `Fit=Stretch` and
  `Upscale=true` to honor the exact requested dimensions; dimensions are already bounded by this surface.
- PNG is lossless; quality is retained but its control is disabled for PNG. JPEG cannot carry transparency;
  the caller must choose/document the flattening background or require PNG/WebP for cutouts.
- `ImageEditRecipeExtensions.create/copy/size/validate` are engine-free. They contain no URLs or tenant identity.
- `removeBackground=true` with capability false blocks processing intents. The capability is an availability hint,
  never authorization and never evidence that any model has run.

## Interaction

The original crop engine owns pointer handles and arrow-key crop adjustment. Presets provide free, square,
portrait 4:5 and landscape 16:9; full image clears cropping. Rotation changes in quarter turns. Resizing
keeps proportions by default, calculates from the cropped/rotated dimensions, and reduces excessive requests
to the configured dimension/pixel bounds. Users may unlock proportions explicitly.

History contains at most 50 immutable recipes. Undo/redo emit edit intent; a new edit drops the redo branch.
Reset edits returns the untransformed recipe. Native form reset restores the initial seed, respecting a cancelled
reset event. External controlled replacements reset local history; rejected controlled intent never replaces
what is rendered or submitted. All controls use native keyboard interactions and translated visible labels.

A source URL or source dimension change clears history/aspect mode and requests the default recipe. Callers
must replace or clear controlled state when changing sources. Any source or recipe change hides the old processed
preview. Supply a fresh `previewSrc` for the newly processed result; cancel or ignore stale processing responses
using the source identity and recipe revision at the app boundary. The original image remains available after failure.

## Verification

Focused DOM tests cover intent-only processing, original coordinate preservation, undo/redo/reset, controlled
rejection/replacement, source changes, busy/disabled/read-only states, limits, format/quality, capability gating,
error announcements and native form reset. Pure tests cover the portable geometry and limits. The shared gallery
fixture participates in SSR/mount breadth. Existing ImageCropEditor browser tests own crop pointer/pixel behavior.
Manual assistive technology and real application worker behavior require their separate consumer review.
