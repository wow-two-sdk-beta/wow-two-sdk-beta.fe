import { shallowRef, type ShallowRef } from 'vue';

import { usePolling } from './UsePolling';

/**
 * Answers with the version the host serves now: the API's status call where the app and its API ship in one image,
 * else a `version.json` the build writes beside `index.html`, read with `cache: 'no-store'`. An empty answer or a
 * failure keeps the last version.
 */
export type RunningVersionSource = () => Promise<string | null | undefined> | string | null | undefined;

/** Tunes how often the running version is read. */
export interface RunningVersionOptions {
  /** The gap (ms) between reads while the tab is visible and online. Default five minutes. */
  readonly intervalMs?: number;
}

/** The live view a scope gets over the version its host serves. */
export interface RunningVersionHandle {
  /** The version the host served at the last successful read; `null` until one succeeds. */
  readonly version: Readonly<ShallowRef<string | null>>;

  /** Reads now, outside the schedule — after a deployment the app itself started, say. */
  readonly refresh: () => Promise<void>;
}

/** @internal Five minutes: a deployment shows in an open tab within one coffee, at twelve small reads an hour. */
const DefaultIntervalMs = 5 * 60_000;

/**
 * Follows the version the host serves while this tab stays open, so a badge can tell a reader that the tab runs an
 * older build than the one deployed. It reads once on mount, then on an interval, and at once when the tab returns
 * from hidden or offline; the loop stops with the scope. The bundle's own version is a build-time constant and
 * cannot know about a later deployment, so the two are compared where they are shown (`VersionBadge`).
 *
 * @param load - The read; see `RunningVersionSource`.
 * @param options - The interval.
 * @returns The served version and a manual `refresh`.
 */
export function useRunningVersion(
  load: RunningVersionSource,
  options: RunningVersionOptions = {},
): RunningVersionHandle {
  const version = shallowRef<string | null>(null);

  async function refresh(): Promise<void> {
    try {
      const next = await load();
      if (typeof next === 'string' && next.trim() !== '') version.value = next.trim();
    } catch {
      /* A failed read says nothing about the version; the last answer stands. */
    }
  }

  usePolling(refresh, { intervalMs: options.intervalMs ?? DefaultIntervalMs, immediate: true });

  return { version, refresh };
}
