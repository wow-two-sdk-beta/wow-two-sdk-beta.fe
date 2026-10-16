// Platform identification — the LAST-RESORT signal in this slice, and the only one here that asks what the
// environment IS rather than what it can DO.
//
// USE IT ONLY FOR COSMETICS: rendering `⌘K` vs `Ctrl+K` in a shortcut hint, naming a modifier in help text,
// labelling a button "Show in Finder" vs "Show in Explorer". NEVER gate a feature on it. A user agent is freely
// spoofed, `navigator.platform` is deprecated, Chromium freezes its UA, and every question worth gating on
// (pointer precision, hover, display mode, viewport) has a real capability query in this slice that answers it
// truthfully. Platform sniffing gates on a guess; a media feature gates on the fact.
//
// The Apple branch delegates to `foundation/shortcuts`' `isApplePlatform` rather than re-sniffing: that predicate
// already backs `mod` → ⌘ resolution, and two sniffers that drift apart would render a ⌘ hint on a Ctrl machine.
// This file adds the other three families around it and reuses its exact source-precedence rules.
//
// Ordering is load-bearing. Android is tested before Linux because Android's UA names the Linux kernel; the
// Windows pattern is anchored on real tokens (`Windows` / `Win32` / `Win64` / `WOW64`) rather than a bare `win`,
// which would misread `Darwin` — a substring collision that silently turns a Mac into a PC.

import { isApplePlatform } from '../shortcuts';

/** The coarse OS families this slice distinguishes. */
export const Platform = {
  /** macOS, iOS, or iPadOS. */
  Apple: 'apple',
  /** Any Windows desktop. */
  Windows: 'windows',
  /** Android phones and tablets. */
  Android: 'android',
  /** Desktop Linux, X11, and ChromeOS — all Ctrl-keyed, all Linux-idiomatic in their affordances. */
  Linux: 'linux',
  /** Nothing recognisable — SSR, a stripped user agent, or a platform outside the four above. */
  Unknown: 'unknown',
} as const;

/** One of the {@link Platform} families. */
export type Platform = (typeof Platform)[keyof typeof Platform];

/**
 * Reads the best available platform string, preferring the modern `userAgentData.platform` over the deprecated
 * `navigator.platform` and falling back to the full user agent. Mirrors `isApplePlatform`'s precedence exactly so
 * both predicates always judge the same text. Returns `''` under SSR or if any read throws.
 */
function readPlatformSource(): string {
  try {
    if (typeof navigator === 'undefined') return '';
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    return nav.userAgentData?.platform || nav.platform || nav.userAgent || '';
  } catch {
    // A throwing `navigator` getter (polyfill, hardened environment) reads as "no information", never as a crash.
    return '';
  }
}

/**
 * Identifies the OS family. Read this file's header before using it: the answer is for cosmetic, platform-idiomatic
 * decisions only, never for feature gating.
 *
 * Never throws. Returns `'unknown'` under SSR, for an unrecognised platform, and for an empty hint.
 *
 * @param hint Forces the string that is matched, instead of reading the environment — makes tests deterministic and
 * lets a server render for a client whose platform it already knows. Accepts a full user agent, a
 * `userAgentData.platform` value, or a bare token such as `'Windows'`.
 * @returns The detected {@link Platform}.
 */
export function getPlatform(hint?: string): Platform {
  const source = hint ?? readPlatformSource();

  if (isApplePlatform(source)) return Platform.Apple;
  if (/android/i.test(source)) return Platform.Android;
  if (/windows|win32|win64|wow64/i.test(source)) return Platform.Windows;
  if (/linux|x11|cros|chrome ?os/i.test(source)) return Platform.Linux;
  return Platform.Unknown;
}
