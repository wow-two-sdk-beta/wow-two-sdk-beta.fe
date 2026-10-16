// Display mode — how the document is presented, and by extension whether the app was installed.
//
// Read entirely through `display-mode` media queries on the shared `useMediaQuery`, which makes the answer
// reactive: a window entering or leaving fullscreen updates live, where the one-shot check at startup that most
// codebases write would be stale for the rest of the session.
//
// QUERY ORDER IS LOAD-BEARING, and is not alphabetical. Browsers do not reliably report exactly one match — a
// standalone window driven into fullscreen can satisfy both `(display-mode: fullscreen)` and
// `(display-mode: standalone)` — so the most specific presentation is tested first and wins.
//
// KNOWN GAP — iOS Safari only supports `display-mode` from 16.4. On older iOS an installed home-screen app reports
// `'browser'` here. Its legacy signal is the non-standard `navigator.standalone`, deliberately NOT read: this
// slice keeps a single detection mechanism, and adding a second, non-reactive sniffer for one stale OS version
// buys a narrow tail at the cost of two code paths that can disagree. A consumer that needs that tail can read
// `navigator.standalone` itself and OR it in.

import { computed, type ComputedRef } from 'vue';

import { useMediaQuery } from './UseMediaQuery';

import { DisplayMode } from '../enums/DisplayMode';

const FullscreenQuery = '(display-mode: fullscreen)';
const StandaloneQuery = '(display-mode: standalone)';
const MinimalUiQuery = '(display-mode: minimal-ui)';

/**
 * Reports how the document is being presented — its {@link DisplayMode}.
 *
 * Falls back to `'browser'` when no mode query matches, which is also what SSR and any browser without
 * `display-mode` support produce. `'browser'` therefore means "an ordinary tab, as far as can be told", not a
 * proof that the app is uninstalled.
 *
 * @returns The active {@link DisplayMode}.
 */
export function useDisplayMode(): ComputedRef<DisplayMode> {
  const fullscreen = useMediaQuery(FullscreenQuery);
  const standalone = useMediaQuery(StandaloneQuery);
  const minimalUi = useMediaQuery(MinimalUiQuery);

  return computed(() => {
    if (fullscreen.value) return DisplayMode.Fullscreen;
    if (standalone.value) return DisplayMode.Standalone;
    if (minimalUi.value) return DisplayMode.MinimalUi;
    return DisplayMode.Browser;
  });
}

/**
 * Whether the app is running as an installed app rather than in a browser tab — any display mode other than
 * `'browser'`.
 *
 * Reads `false` under SSR and on iOS < 16.4 (see this file's header). Use it to ADD an installed-only affordance
 * — suppressing an "Install app" prompt, showing a custom title bar — never to withhold functionality, because a
 * `false` here can mean "installed, but undetectable".
 *
 * @returns `true` when the app is presented outside an ordinary browser tab.
 */
export function useIsInstalled(): ComputedRef<boolean> {
  const mode = useDisplayMode();
  return computed(() => mode.value !== DisplayMode.Browser);
}
