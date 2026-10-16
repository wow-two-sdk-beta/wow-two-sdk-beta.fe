// The dev sink — the "is anything even firing?" provider.
//
// Deliberately NOT registered by default: an SDK that logs unasked is noise (GWDNBM), so an app opts in
// explicitly. `console` is read inside each call rather than captured at factory time, so a test that
// stubs `console.info` after construction still sees the stub, and importing this file stays free of any
// environment assumption.

import type { AnalyticsProvider } from './AnalyticsProvider';

/** Defines the options for {@link consoleAnalyticsProvider}. */
export interface ConsoleAnalyticsProviderOptions {
  /** The tag each line is prefixed with. Default `'[analytics]'`. */
  readonly prefix?: string;
}

/** Creates a console-logging sink for development — one line per call, nothing batched, nothing to flush. */
export function consoleAnalyticsProvider(options: ConsoleAnalyticsProviderOptions = {}): AnalyticsProvider {
  const prefix = options.prefix ?? '[analytics]';

  return {
    name: 'console',
    track: (event) => console.info(`${prefix} track`, event.name, event.properties ?? {}),
    identify: (identity) => console.info(`${prefix} identify`, identity.userId, identity.traits ?? {}),
    page: (event) => console.info(`${prefix} page`, event.name, event.properties ?? {}),
  };
}
