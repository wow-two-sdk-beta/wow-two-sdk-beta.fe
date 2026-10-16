// Shared header / title / description / body / footer / close subcomponents
// for Modal and Drawer. Co-located in `overlays/` as a domain-internal helper.
//
// Each consuming overlay (Modal, Drawer, BottomSheet) `provide()`s the
// `titleId`, `descriptionId`, and a `close()` action on the key below. The
// shared subcomponents inject it.
//
// Naming convention: `AnchorLayout*` for shared chrome pieces; consumers re-export
// them under their own name (e.g. `ModalHeader = OverlayHeader`).
//
// React's `OverlayChromeProvider` — the context Provider rendered as an element
// around `children` — has no counterpart here: `provide()` in the consuming
// overlay's `setup()` covers it, because slot content is instantiated as a
// child of the component that renders the slot, so injection resolves.
//
// This module is the context half of React's `OverlayChrome.tsx`; the component
// half is one SFC per piece alongside it (Vue allows a single component per file).

import { inject, type InjectionKey } from 'vue';

export interface OverlayChromeContextValue {
  titleId: string;
  descriptionId: string;
  /** Closes the overlay and returns focus to the trigger. */
  close: () => void;
}

export const overlayChromeContextKey: InjectionKey<OverlayChromeContextValue> = Symbol('wow-two.overlayChrome');

export function useOverlayChromeContext(): OverlayChromeContextValue {
  const context = inject(overlayChromeContextKey, null);
  if (!context)
    throw new Error('AnchorLayout chrome subcomponents must be used inside an OverlayChromeProvider (Modal / Drawer)');
  return context;
}
