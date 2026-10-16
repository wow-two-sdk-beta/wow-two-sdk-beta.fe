# Color mode ownership

- Each provider owns independent reactive mode state and optional persisted preference.
- Browser root styling is coordinated by document root; server renders perform no DOM writes.
- Descendant providers take precedence over ancestors, including child-first Vue mounting.
- For independent app roots in one document, the latest mounted owner takes precedence.
- Removing an owner reveals the remaining active owner without overwriting its mode.
- Removing the final owner restores the original dark class and color-scheme value and priority.
- Explicit defaults produce the same mode during SSR and the initial client render.
- `followSystem()` hands the mode back to the OS preference and persists `system`; a stored `system` follows the OS on
  the next load even when `defaultMode` names a fixed mode. `followsSystem` reports which of the two is active.
- `colorModeScript({ storageKey, defaultMode })` returns the pre-paint script for `index.html`: given the provider's
  options it applies the mode the provider will choose — `dark` class and `color-scheme` on `<html>` — before the
  first paint. `ColorModeStorageKey` is the shared default key.

Regression coverage: [DOM ownership](../../../../tests/unit/foundation/primitives/Ownership.dom.test.ts),
[SSR](../../../../tests/unit/foundation/primitives/ColorMode.ssr.test.ts) and
[the pre-paint script](../../../../tests/unit/foundation/primitives/ColorModeScript.dom.test.ts).
