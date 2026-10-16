import type { Router, RouterScrollBehavior } from 'vue-router';

import { findScrollRegions } from '../../../foundation/dom';

interface ScrollOffset {
  readonly left: number;
  readonly top: number;
}

/** The router's scroll policy: the behavior `createRouter` takes, and the hooks that feed it. */
export interface ScrollRestoration {
  readonly scrollBehavior: RouterScrollBehavior;
  /** Registers the save and tracking hooks on the built router; returns the unregister function. */
  readonly install: (router: Router) => () => void;
}

const Origin: ScrollOffset = { left: 0, top: 0 };

/** History entries whose region offsets are kept; the oldest is dropped past this. */
const MaxEntries = 100;

/** Frames a restore keeps retrying while the page is still too short to reach the saved offset. */
const RetryFrames = 10;

function isAt(region: HTMLElement, offset: ScrollOffset): boolean {
  return Math.abs(region.scrollTop - offset.top) <= 1 && Math.abs(region.scrollLeft - offset.left) <= 1;
}

function scrollRegion(region: HTMLElement, offset: ScrollOffset): void {
  if (typeof region.scrollTo === 'function') region.scrollTo({ ...offset, behavior: 'instant' });
  else {
    region.scrollLeft = offset.left;
    region.scrollTop = offset.top;
  }
}

/**
 * Builds the router's scroll policy. The window restores its saved position on back/forward, honours a hash
 * target, and returns to the top otherwise. Every element marked with `ScrollRegionAttribute` (the main region
 * of a `region` AppShell) follows the same policy: its offset is saved when a history entry is left, restored
 * when back/forward revisits the entry, and reset to the top on any other navigation.
 */
export function createScrollRestoration(): ScrollRestoration {
  const offsets = new Map<string, ReadonlyArray<ScrollOffset>>();
  /** The entry being shown — web and hash histories stamp `position`; memory history falls back to a count. */
  let current = '';
  let counted = 0;
  /** The delta of a back/forward in flight, from the history listener; `null` for a push or replace. */
  let popDelta: number | null = null;
  /** Whether the navigation the next `scrollBehavior` call finishes came from back/forward. */
  let isRestoring = false;
  let generation = 0;

  /* A restored page may still be rendering its data; retry for a few frames until the offset is reachable. */
  function settle(region: HTMLElement, offset: ScrollOffset, run: number, frames: number): void {
    scrollRegion(region, offset);
    if (frames <= 0 || isAt(region, offset) || typeof requestAnimationFrame === 'undefined') return;
    requestAnimationFrame(() => {
      if (run === generation && region.isConnected) settle(region, offset, run, frames - 1);
    });
  }

  const scrollBehavior: RouterScrollBehavior = (to, _from, savedPosition) => {
    const restoring = isRestoring;
    isRestoring = false;
    const regions = findScrollRegions();
    if (regions.length > 0) {
      const run = ++generation;
      const saved = restoring ? offsets.get(`${current}|${to.fullPath}`) : undefined;
      regions.forEach((region, index) => settle(region, saved?.[index] ?? Origin, run, saved ? RetryFrames : 0));
      if (!restoring && to.hash) {
        const target = document.getElementById(decodeURIComponent(to.hash.slice(1)));
        if (target && regions.some((region) => region.contains(target))) target.scrollIntoView({ block: 'start' });
      }
    }
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash };
    return Origin;
  };

  function install(router: Router): () => void {
    const history = router.options.history;
    const position = (): string => {
      const stamped = (history.state as { position?: unknown } | undefined)?.position;
      return typeof stamped === 'number' ? String(stamped) : `#${counted}`;
    };

    const removeListen = history.listen((_to, _from, info) => {
      popDelta = info.delta;
    });
    const removeSave = router.beforeEach((_to, from) => {
      // The start location matches nothing; it has no offset worth keeping.
      if (from.matched.length === 0) return;
      const regions = findScrollRegions();
      if (regions.length === 0) return;
      const key = `${current}|${from.fullPath}`;
      offsets.delete(key);
      offsets.set(
        key,
        regions.map((region) => ({ left: region.scrollLeft, top: region.scrollTop })),
      );
      if (offsets.size > MaxEntries) offsets.delete(offsets.keys().next().value!);
    });
    // `afterEach` runs before vue-router calls `scrollBehavior` on the next tick, so the entry is current by then.
    const removeTrack = router.afterEach((_to, _from, failure) => {
      const delta = popDelta;
      popDelta = null;
      if (failure) return;
      counted += delta ?? 1;
      current = position();
      isRestoring = delta !== null;
    });

    return () => {
      removeListen();
      removeSave();
      removeTrack();
    };
  }

  return { scrollBehavior, install };
}
