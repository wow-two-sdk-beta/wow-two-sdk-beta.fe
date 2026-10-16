# AudioPlayer

Renders an audio player with play/pause, a scrubber, volume, and speed over a native `<audio>`.

Source: [AudioPlayer.vue](AudioPlayer.vue).

Public import: `import { AudioPlayer } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Autoplay requests do not claim playback succeeded; native play/pause/ended events determine rendered playback state.
- Source changes and emptied events clear seek/time state. Unknown or live infinite duration does not enter numeric range bounds.
- Initial volume clamps to the native 0–1 domain. Nonfinite/unsupported playback rates fall back to 1.

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop                  | Type                    | Required | Default     | Meaning                                                                                       |
| --------------------- | ----------------------- | -------- | ----------- | --------------------------------------------------------------------------------------------- |
| `src`                 | `string`                | yes      | —           | The audio source URL.                                                                         |
| `peaks`               | `ReadonlyArray<number>` | no       | `undefined` | The pre-computed per-bin amplitudes — swaps the range scrubber for an `AudioWaveformPreview`. |
| `autoPlay`            | `boolean`               | no       | `undefined` | The autoplay state, forwarded to the native `<audio>`.                                        |
| `loop`                | `boolean`               | no       | `undefined` | The loop state, forwarded to the native `<audio>`.                                            |
| `defaultVolume`       | `number`                | no       | `1`         | The initial volume in 0..1. Default `1`.                                                      |
| `defaultPlaybackRate` | `number`                | no       | `1`         | The initial playback rate. Default `1`.                                                       |
| `isCompact`           | `boolean`               | no       | `undefined` | The dense layout. Default `false`.                                                            |

## Emits

| Event         | Signature                                          | Meaning                                                                          |
| ------------- | -------------------------------------------------- | -------------------------------------------------------------------------------- |
| `play`        | `play: [];`                                        | Fires when playback starts.                                                      |
| `pause`       | `pause: [];`                                       | Fires when playback pauses.                                                      |
| `time-update` | `'time-update': [time: number, duration: number];` | Fires when playback time advances, with the current time and the total duration. |
| `ended`       | `ended: [];`                                       | Fires when playback reaches the end.                                             |

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
