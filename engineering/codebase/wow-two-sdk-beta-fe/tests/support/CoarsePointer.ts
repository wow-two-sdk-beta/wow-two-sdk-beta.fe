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

/** Hands the primary pointer back to the machine's own. */
export async function useFinePointer(): Promise<void> {
  await cdp().send('Emulation.setTouchEmulationEnabled', { enabled: false });
}
