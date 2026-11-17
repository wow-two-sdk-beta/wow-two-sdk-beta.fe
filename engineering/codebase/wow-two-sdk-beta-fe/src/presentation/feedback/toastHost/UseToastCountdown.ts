import { onMounted, onScopeDispose, watch } from 'vue';

import type { Severity } from '../../../foundation/styles';

/** Defines props shared by every countdown display — it mirrors the host's expiry clock, never drives it. */
export interface ToastCountdownProps {
  /** The toast's full lifetime in ms. */
  readonly duration: number;

  /** The time already spent when the display mounts, in ms. */
  readonly elapsed?: number;

  /** The hold state — true freezes the display while the host's clock is held. */
  readonly isPaused?: boolean;

  /** The severity whose tone the countdown takes. */
  readonly severity?: Severity;
}

/** Defines the clock reading a countdown runs from. */
export interface ToastCountdownClock {
  /** The toast's full lifetime in ms. */
  readonly duration: number;

  /** The time already spent when the display mounts, in ms. */
  readonly elapsed: number;

  /** Whether the display is held. */
  readonly isPaused: boolean;
}

/**
 * Manages one Web Animations API countdown on a template ref, paused and resumed in step with the host's expiry
 * clock; environments without `animate` leave the element static at full.
 */
export function useToastCountdown(
  element: () => Element | null,
  keyframes: ReadonlyArray<Keyframe>,
  countdown: ToastCountdownClock,
): void {
  let animation: Animation | undefined;
  onMounted(() => {
    const target = element();
    if (!target || typeof target.animate !== 'function') return;
    animation = target.animate([...keyframes], { duration: countdown.duration, easing: 'linear', fill: 'forwards' });
    if (countdown.elapsed > 0) animation.currentTime = countdown.elapsed;
    if (countdown.isPaused) animation.pause();
  });
  watch(
    () => countdown.isPaused,
    (isPaused) => {
      if (isPaused) animation?.pause();
      else animation?.play();
    },
  );
  onScopeDispose(() => animation?.cancel());
}
