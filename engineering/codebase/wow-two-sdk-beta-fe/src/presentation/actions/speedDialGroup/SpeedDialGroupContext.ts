import { inject, type InjectionKey, type ShallowRef } from 'vue';
import type { OverlayPosition } from '../../../foundation/styles';

/** The overlay anchor position of a SpeedDialGroup (shared overlay vocabulary). */
export type SpeedDialGroupPosition = OverlayPosition;

/** Defines the axis a SpeedDialGroup's action items fan out along. */
export const SpeedDialGroupDirection = {
  /** Refers to items stacking upward from the trigger. */
  Up: 'up',
  /** Refers to items stacking downward from the trigger. */
  Down: 'down',
  /** Refers to items stacking to the left of the trigger. */
  Left: 'left',
  /** Refers to items stacking to the right of the trigger. */
  Right: 'right',
} as const;

export type SpeedDialGroupDirection = (typeof SpeedDialGroupDirection)[keyof typeof SpeedDialGroupDirection];

export interface SpeedDialGroupContextValue {
  /** The open state. Live getter — read it, don't destructure it. */
  readonly open: boolean;

  /** Sets the open state (and fires the root's `open-change`). */
  setOpen: (open: boolean) => void;

  /**
   * The trigger's element, published by `SpeedDialGroupTrigger` on mount. Escape and
   * action-select return focus here — the React original held a `MutableRefObject`
   * threaded through `composeRefs`; a Vue child writes its own element into this ref
   * instead.
   */
  triggerEl: ShallowRef<HTMLElement | null>;

  /** The resolved fan-out axis. Live getter. */
  readonly direction: SpeedDialGroupDirection;

  /** The viewport anchor. Live getter. */
  readonly position: SpeedDialGroupPosition;
}

export const SpeedDialGroupKey: InjectionKey<SpeedDialGroupContextValue> = Symbol('wow-two.speedDial');

/** Reads the surrounding `SpeedDialGroup`. Throws outside one — the parts are not standalone. */
export function useSpeedDialContext(): SpeedDialGroupContextValue {
  const context = inject(SpeedDialGroupKey, null);
  if (!context) throw new Error('SpeedDialGroup.* must be used inside <SpeedDialGroup>');
  return context;
}
