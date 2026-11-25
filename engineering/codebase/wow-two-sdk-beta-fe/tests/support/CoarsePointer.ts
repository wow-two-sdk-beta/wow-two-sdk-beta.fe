import { cdp, server } from 'vitest/browser';
/* Brings the Playwright provider's typing of `cdp()` (its `send`) into the test's type graph. */
import type {} from '@vitest/browser-playwright';

/**
 * Whether this engine can make a finger the primary pointer. Only Chromium can, through the DevTools protocol; WebKit
 * and Firefox keep the machine's real pointer, so a test of the coarse-pointer look skips there.
 */
export const canEmulateCoarsePointer = server.browser === 'chromium';

/** Makes a finger the primary pointer, so `(pointer: coarse)` and `(hover: none)` match, until `useFinePointer`. */
export async function useCoarsePointer(): Promise<void> {
  await cdp().send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
}

/**
 * Switches the finger off, so `(pointer: coarse)` stops matching.
 *
 * It cannot give the page its mouse back on Linux: headless Chromium there lands on `(hover: none)` and
 * `(pointer: none)` after this call (even on a page that never used a finger) and keeps them until the page closes;
 * no other protocol call undoes it. macOS returns to `(hover: hover)` and `(pointer: fine)`. A file that imports this
 * module therefore poisons the page for any later file that relies on `hover:`, and `CoarseLastSequencer` runs these
 * files last for that reason. Do not call this from a shared setup file.
 */
export async function useFinePointer(): Promise<void> {
  await cdp().send('Emulation.setTouchEmulationEnabled', { enabled: false });
}
