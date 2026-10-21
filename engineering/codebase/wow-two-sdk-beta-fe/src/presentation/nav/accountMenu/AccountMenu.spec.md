# AccountMenu

Renders the account menu that ends an app's top bar: an avatar trigger that opens who is signed in, the organization
switcher, account destinations, the colour mode, the interface language, each service's version and sign out.

Source: [AccountMenu.vue](AccountMenu.vue).

Public import: `import { AccountMenu } from '@wow-two-beta/fe/presentation/nav';`.

## Contract

- The trigger is one button: an `Avatar` with the name's initials (or `avatarSrc`), else a person glyph, and a chevron
  that turns while the menu is open. Both are decorative; the button's name is `triggerLabel` (`{name}` filled), else
  `anonymousTriggerLabel` when `name` is empty. It carries `aria-haspopup="menu"`, `aria-expanded` and `data-state`.
- `isDisabled` and `isBusy` disable the trigger and close an open menu. `isBusy` also sets `aria-busy`, `data-busy`
  and pulses the avatar.
- The menu is a `DropdownMenu` placed `bottom-end` by default, named by `menuLabel` and described by the identity
  header. The menu is at most `18.5rem` wide and never wider than the viewport less `1.5rem`; it caps at the viewport
  height less `5rem` and scrolls inside itself, vertically only. The scrolling panel spans the surface's inline
  padding, so every separator meets the surface edges without overflowing it. It stays a dropdown on phones.
- Sections render in this order, each only when present, with one separator between each pair:
  1. identity — `name`, then `description`; a sole organization adds its `label · description` line here;
  2. organizations — a radio group, only for two or more `organizations`. The rows scroll inside an `11rem` band, so
     a long membership list leaves the rest of the menu in reach;
  3. the `items` slot — the account-level destinations, as `MenuItem` rows; a destination is a link row
     (`MenuItem` with `href`, or `as-child` around a router link), not a `window.open` from `@select`;
  4. appearance — `System`, `Light`, `Dark` radio rows bound to the nearest `ColorModeProvider`: `System` calls
     `followSystem()`, the others `setMode()`. Hidden by `showAppearance: false`, or with no provider;
  5. language — a radio group, only for two or more `locales`; each row carries `lang` set to its `value`;
  6. versions — a read-only group listing every `versions` entry as `label` and `version`, with `commit` shortened
     to seven characters. No row is focusable;
  7. sign out — a destructive row, rendered only when an `onSignOut` handler (`@sign-out`) is bound. Always last.
- The organization and language rows are controlled: the marker follows `organization` and `locale`. Picking another
  row emits `update:organization` or `update:locale`; picking the current row emits nothing. Every pick closes the
  menu. The app applies the change — it navigates to the organization or swaps the `LocaleProvider` messages.
- Keyboard follows the SDK menu: Enter, Space and ArrowDown open at the first row, ArrowUp at the last (sign out);
  arrows, Home, End and typeahead walk the rows; Escape, Tab, an outside press and every pick close the menu and
  return focus to the trigger.
- Strings resolve through the nearest `LocaleProvider` when their prop is omitted: `AccountMenu.menuLabel`
  (`Account`), `.triggerLabel` (`Account menu for {name}`, with the `name` variable), `.anonymousTriggerLabel`
  (`Account menu`), `.appearanceLabel` (`Appearance`), `.systemModeLabel` (`System`), `.lightModeLabel` (`Light`),
  `.darkModeLabel` (`Dark`), `.languageLabel` (`Language`), `.organizationLabel` (`Organization`), `.versionsLabel`
  (`Versions`) and `.signOutLabel` (`Sign out`). Names, organizations, languages and versions arrive translated.
- Styling uses theme tokens only. `variant` picks the menu surface recipe: `glass-menu` paints the theme's menu glass
  (`--glass-menu-fill`, `--glass-blur`, `--glass-saturate`, the `--glass-edge` hairline and `--glass-menu-shadow`,
  opaque under `prefers-reduced-transparency`). `panelClass` lands on the scrolling panel inside the surface — the
  place for layout, not for the material.
- Attributes and `class` land on the trigger button. Automatic attribute inheritance is disabled; the source
  explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `name` | `string` | no | — | The signed-in person's display name. |
| `description` | `string` | no | — | The header's second line — the email or the role. |
| `avatarSrc` | `string` | no | — | The avatar image; initials show without it. |
| `open` | `boolean` | no | — | The open state, controlled. The `v-model:open` binding target. |
| `defaultOpen` | `boolean` | no | `false` | The initial open state when uncontrolled. |
| `placement` | `Placement` | no | `bottom-end` | The Floating UI placement. |
| `isDisabled` | `boolean` | no | `false` | Blocks the trigger and closes an open menu. |
| `isBusy` | `boolean` | no | `false` | Blocks the trigger like `isDisabled` and marks it busy. |
| `showAppearance` | `boolean` | no | `true` | Shows the colour-mode rows; they need a `ColorModeProvider`. |
| `locales` | `ReadonlyArray<AccountMenuLocale>` | no | `[]` | The interface languages; two or more show the rows. |
| `locale` | `string` | no | — | The current language's `value`. The `v-model:locale` target. |
| `organizations` | `ReadonlyArray<AccountMenuOrganization>` | no | `[]` | The memberships; two or more switch. |
| `organization` | `string` | no | — | The current organization's `id`. The `v-model:organization` target. |
| `versions` | `ReadonlyArray<AccountMenuVersion>` | no | `[]` | Every running service's version, in display order. |
| `onSignOut` | `() => unknown` | no | — | The `@sign-out` handler; binding it renders the sign-out row. |
| `menuLabel` | `string` | no | locale `Account` | The menu's accessible name. |
| `triggerLabel` | `string` | no | locale `Account menu for {name}` | The trigger's name; `{name}` is the name. |
| `anonymousTriggerLabel` | `string` | no | locale `Account menu` | The trigger's name without a `name`. |
| `appearanceLabel` | `string` | no | locale `Appearance` | The appearance group heading. |
| `systemModeLabel` | `string` | no | locale `System` | The row that follows the device setting. |
| `lightModeLabel` | `string` | no | locale `Light` | The light row. |
| `darkModeLabel` | `string` | no | locale `Dark` | The dark row. |
| `languageLabel` | `string` | no | locale `Language` | The language group heading. |
| `organizationLabel` | `string` | no | locale `Organization` | The organization group heading. |
| `versionsLabel` | `string` | no | locale `Versions` | The versions group heading. |
| `signOutLabel` | `string` | no | locale `Sign out` | The sign-out row. |
| `variant` | `SurfaceVariant` | no | menu default | The menu surface recipe; `glass-menu` for the frame glass. |
| `panelClass` | `HTMLAttributes['class']` | no | — | Extra classes on the scrolling panel inside the surface. |

- `AccountMenuLocale`: `value` (the locale tag, also the row's `lang`) · `label` (the language's own name).
- `AccountMenuOrganization`: `id` · `label` · `description?` (the person's role there).
- `AccountMenuVersion`: `label` (the service) · `version` · `commit?`.

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:open` | `'update:open': [open: boolean]` | The menu opened or closed — the `v-model:open` half. |
| `update:locale` | `'update:locale': [locale: string]` | The reader picked another language. |
| `update:organization` | `'update:organization': [organization: string]` | The reader picked another organization. |
| `sign-out` | `onSignOut` prop | The reader picked sign out; a prop so its presence renders the row. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `items` | `items?(): unknown` | Account-level `MenuItem` rows, placed after the organization switcher. |

## Exposed handle

`{ el }` — the trigger button. Read this through a component template ref after mount; the referenced DOM node may be
absent while unmounted.

## Verification

- Public render fixture: [NavExamples.ts](../../../../apps/playground/src/gallery/fixtures/NavExamples.ts). This covers
  render/SSR compatibility, not all interaction behavior.
- Focused test references: [AccountMenu.dom.test.ts](../../../../tests/unit/presentation/nav/AccountMenu.dom.test.ts),
  [AccountMenu.browser.test.ts](../../../../tests/unit/presentation/nav/AccountMenu.browser.test.ts). Consult the named
  test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the
  existence of this specification is not a passing-test claim.
