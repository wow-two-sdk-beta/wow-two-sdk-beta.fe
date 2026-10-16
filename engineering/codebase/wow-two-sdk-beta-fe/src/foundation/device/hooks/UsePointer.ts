// Pointer precision and hover capability, read from the CSS `pointer` / `hover` media features through the shared
// `useMediaQuery`.
//
// WHY NOT A USER-AGENT SNIFF: "is this a touch device" is not a device question, it is an INPUT question, and the
// two diverge constantly. A Windows laptop with a touchscreen has both a fine mouse and a coarse finger; an iPad
// with a Magic Keyboard reports a FINE pointer; a phone in desktop-site mode still has only a finger. A UA string
// describes none of that, is trivially spoofed, and is frozen or deprecated on every Chromium browser. The media
// features track the pointer the user is ACTUALLY holding and re-evaluate when it changes.
//
// WHY NOT `'ontouchstart' in window` AS THE PRIMARY SIGNAL: it proves the touch EVENT API is implemented, not that
// a touchscreen is attached — every desktop Chromium build ships the API, so the check reads true on a mouse-only
// machine and the UI grows finger-sized hit targets nobody needs. It is also a one-shot boolean with no change
// event, so it can never react to a tablet being docked to a keyboard mid-session. `(pointer: coarse)` answers the
// question that was actually being asked, and answers it reactively.

import { computed, type ComputedRef } from 'vue';

import { useMediaQuery } from './UseMediaQuery';

import { PointerType } from '../enums/PointerType';

// `pointer` / `hover` describe the PRIMARY pointing device. The `any-pointer` / `any-hover` variants report every
// attached device instead, which is the wrong question for layout: a touchscreen laptop matches `any-pointer:
// coarse` while the user drives it entirely by mouse, and sizing every target for the finger they are not using
// wastes the screen. Primary is what layout should follow.
const FinePointerQuery = '(pointer: fine)';
const CoarsePointerQuery = '(pointer: coarse)';
const HoverQuery = '(hover: hover)';

/**
 * Reports the precision of the primary pointing device — `'fine'` (mouse, trackpad, stylus), `'coarse'` (finger),
 * or `'none'`.
 *
 * Reactive: a tablet gaining a mouse flips `'coarse'` → `'fine'` without a reload.
 *
 * Under SSR this reads `'none'` (there are no media features to read) and corrects on hydration. Treat `'none'`
 * as "no pointer known", not as a fact — never hide an essential affordance behind it.
 *
 * @returns The active {@link PointerType}.
 */
export function usePointerType(): ComputedRef<PointerType> {
  const fine = useMediaQuery(FinePointerQuery);
  const coarse = useMediaQuery(CoarsePointerQuery);

  // `pointer` names one primary device, so at most one of these matches in practice. `fine` is tested first so
  // that a browser reporting both resolves to the more capable pointer rather than to a coincidence of ordering.
  return computed(() => {
    if (fine.value) return PointerType.Fine;
    if (coarse.value) return PointerType.Coarse;
    return PointerType.None;
  });
}

/**
 * Whether the primary pointing device can hover — the `(hover: hover)` media feature.
 *
 * Gate hover-only affordances on this: a tooltip that opens on mouseover, a table row's hover-revealed actions. On
 * a touchscreen a hover-only control is simply unreachable and needs a tap target or an always-visible equivalent.
 *
 * Reads `false` under SSR, so hover-revealed content must never be the only path to an action.
 *
 * @returns `true` when the primary pointer can hover.
 */
export function useHoverCapability(): ComputedRef<boolean> {
  const hover = useMediaQuery(HoverQuery);
  return computed(() => hover.value);
}
