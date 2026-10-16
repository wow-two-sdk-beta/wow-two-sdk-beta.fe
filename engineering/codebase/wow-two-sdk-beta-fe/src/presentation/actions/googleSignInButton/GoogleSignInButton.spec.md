# GoogleSignInButton

Renders the Google sign-in button — the Google-owned control for the GIS ID-token flow.

Source: [GoogleSignInButton.vue](GoogleSignInButton.vue).

Public import: `import { GoogleSignInButton } from '@wow-two-beta/ui-vue/presentation/actions';`.

## Contract

- Call `provideGoogleIdentity` once in an ancestor setup. Buttons inject that owner and never initialize GIS or own credential callbacks.
- Multiple buttons share one client configuration and deliver credentials exactly once to the owner.
- Configure client ID, auto-select and credential/error callbacks on the owner. Empty client ID renders no host.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop            | Type                                    | Required | Default         | Meaning                                                                           |
| --------------- | --------------------------------------- | -------- | --------------- | --------------------------------------------------------------------------------- |
| `theme`         | `GoogleButtonOptions['theme']`          | no       | `'outline'`     | The button surface. Default `outline`.                                            |
| `size`          | `GoogleButtonOptions['size']`           | no       | `'large'`       | The button height band. Default `large`.                                          |
| `text`          | `GoogleButtonOptions['text']`           | no       | `'signin_with'` | The label wording. Default `signin_with`.                                         |
| `shape`         | `GoogleButtonOptions['shape']`          | no       | `'rectangular'` | The button outline. Default `rectangular`.                                        |
| `width`         | `number`                                | no       | —               | The rendered width in px. GIS caps this at 400; omit to size to the host element. |
| `logoAlignment` | `GoogleButtonOptions['logo_alignment']` | no       | `'left'`        | The logo placement. Default `left`.                                               |
| `locale`        | `string`                                | no       | —               | The BCP-47 locale for the button copy. Defaults to the browser's.                 |

## Emits

None. Credentials and failures are delivered to the ancestor owner callbacks.

## Slots

None declared.

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [ActionsExamples.ts](../../../../apps/playground/src/gallery/fixtures/ActionsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [GoogleSignInButton.dom.test.ts](../../../../tests/unit/presentation/actions/GoogleSignInButton.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
