// The display-mode vocabulary. Split from its composable for the same reason as `PointerType` — a consumer
// comparing against `DisplayMode.Standalone` should not have to import Vue to do it.

/** How the document is being presented — the values of the CSS `display-mode` media feature. */
export const DisplayMode = {
  /** Installed and running in its own window with no browser chrome. The usual "is this a PWA" answer. */
  Standalone: 'standalone',
  /** Filling the screen with no OS chrome either — kiosk displays, the Fullscreen API. */
  Fullscreen: 'fullscreen',
  /** Own window with a minimal navigation strip (back / reload). Installed, but not chrome-free. */
  MinimalUi: 'minimal-ui',
  /** An ordinary browser tab. Also the SSR answer. */
  Browser: 'browser',
} as const;

/** One of the {@link DisplayMode} values. */
export type DisplayMode = (typeof DisplayMode)[keyof typeof DisplayMode];
