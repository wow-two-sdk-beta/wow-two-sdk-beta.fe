import { onMounted, onScopeDispose, shallowRef, toValue, type MaybeRefOrGetter, type ShallowRef } from 'vue';

import {
  enterFullscreen,
  exitFullscreen,
  isFullscreen,
  isFullscreenSupported,
  onFullscreenChange,
  toggleFullscreen,
} from '../Fullscreen';
import type { ScreenRequestResult } from '../ScreenOutcome';

/** What {@link useFullscreen} returns. */
export interface FullscreenControls {
  /** Whether anything is currently presented fullscreen — including a transition this composable did not initiate. */
  readonly isFullscreen: Readonly<ShallowRef<boolean>>;

  /** Whether the Fullscreen API is present. `false` under SSR; render the control only once this is `true`. */
  readonly supported: Readonly<ShallowRef<boolean>>;

  /** Presents the composable's target fullscreen. Call from a user gesture. Resolves to the result; never throws. */
  readonly enter: () => Promise<ScreenRequestResult>;

  /** Leaves fullscreen. Resolves to `ok` when nothing was presented. Never throws. */
  readonly exit: () => Promise<ScreenRequestResult>;

  /** Exits when presented, enters otherwise. Call from a user gesture. Never throws. */
  readonly toggle: () => Promise<ScreenRequestResult>;
}

/**
 * Tracks fullscreen state and exposes the three actions against an optional target.
 *
 * Pass `target` to present one element (a video, a canvas, a dashboard panel); omit it to present the whole
 * document. Takes the element as a ref or getter rather than handing one back, so a `useTemplateRef` drops
 * straight in — and it is read at call time, so it may still be `null` when the handler is wired up.
 *
 * Inherits the module's never-throws contract.
 *
 * @param target The element to present. Defaults to `document.documentElement` when omitted or still `null`.
 * @returns The current state plus the `enter` / `exit` / `toggle` actions.
 */
export function useFullscreen(target?: MaybeRefOrGetter<Element | null | undefined>): FullscreenControls {
  const active = shallowRef(false);
  const supported = shallowRef(false);

  let unsubscribe: (() => void) | undefined;

  onMounted(() => {
    const sync = (): void => {
      active.value = isFullscreen();
      supported.value = isFullscreenSupported();
    };
    sync();
    unsubscribe = onFullscreenChange(sync);
  });

  onScopeDispose(() => {
    unsubscribe?.();
    unsubscribe = undefined;
  });

  const enter = (): Promise<ScreenRequestResult> => enterFullscreen(toValue(target) ?? undefined);
  const exit = (): Promise<ScreenRequestResult> => exitFullscreen();
  const toggle = (): Promise<ScreenRequestResult> => toggleFullscreen(toValue(target) ?? undefined);

  return { isFullscreen: active, supported, enter, exit, toggle };
}
