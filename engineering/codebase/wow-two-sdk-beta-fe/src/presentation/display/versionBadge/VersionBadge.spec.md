# VersionBadge

Renders an app's version beside its logo, and follows the release the host serves while the tab stays open.

Source: [VersionBadge.vue](VersionBadge.vue).

Public import: `import { VersionBadge } from '@wow-two-beta/fe/presentation/display';`.

## Contract

- The badge shows `version` without its build metadata: `0.15.4+abc1234` reads `v0.15.4`. A release that starts with
  a digit gains the `v`; a named build (`dev`) shows as it is.
- Without `runningVersion`, or while it names the same release, the badge is a `span` with a `title` (`label`).
- While `runningVersion` names another release, the badge shows that release, is marked `data-stale`, and becomes a
  `button` named by `updateLabel` that emits `reload`. The caller reloads the page.
- `runningVersion` comes from `useRunningVersion` (`@wow-two-beta/fe/foundation/net`): the bundle's own version is a
  build-time constant and cannot learn of a later deployment.
- Strings resolve through the nearest `LocaleProvider` when their prop is omitted: `VersionBadge.label`
  (`Version {version}`) and `VersionBadge.updateLabel`
  (`Version {running} is live; this tab runs {version}. Reload to update.`).
- Styling uses theme tokens only. Attributes and `class` land on the root element. Automatic attribute inheritance is
  disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `version` | `string` | yes | — | The version this tab loaded. |
| `runningVersion` | `string \| null` | no | — | The version the host serves now. |
| `label` | `string` | no | locale `Version {version}` | The tooltip; `{version}` is the shown version. |
| `updateLabel` | `string` | no | locale, see Contract | The stale name; `{version}` loaded, `{running}` served. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `reload` | `reload: []` | The reader asked for the newer release. |

## Slots

None.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts).
  This covers render/SSR compatibility, not all interaction behavior.
- Focused test reference:
  [VersionBadge.dom.test.ts](../../../../tests/unit/presentation/display/VersionBadge.dom.test.ts). Consult the named
  test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the
  existence of this specification is not a passing-test claim.
