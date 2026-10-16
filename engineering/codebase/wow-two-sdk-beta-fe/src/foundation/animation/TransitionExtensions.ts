/* Transition / animation utility extensions — duration normalization, defaults. */

// =============================================================================
// Types — presence-style asymmetric durations (enter/exit). Not every animation
// has an enter/exit phase (loops, one-shots, springs); this shape applies
// specifically to mount/unmount or appear/disappear transitions.
// =============================================================================

/** Input prop — symmetric number OR asymmetric `{ enter, exit }`. */
export type PresenceAnimationDurationProp = number | { enter?: number; exit?: number };

/** Resolved (canonical) — both sides always present. */
export interface PresenceAnimationDuration {
  enter: number;
  exit: number;
}

// =============================================================================
// Defaults
// =============================================================================

const DefaultDurationMs = 200;

// =============================================================================
// Internal resolvers
// =============================================================================

function resolveDuration(d: PresenceAnimationDurationProp | undefined): PresenceAnimationDuration {
  if (typeof d === 'number') return { enter: d, exit: d };
  if (d && typeof d === 'object') {
    return {
      enter: d.enter ?? DefaultDurationMs,
      exit: d.exit ?? DefaultDurationMs,
    };
  }
  return { enter: DefaultDurationMs, exit: DefaultDurationMs };
}

// =============================================================================
// Grouped namespace export
// =============================================================================

export const TransitionExtensions = {
  resolveDuration,
  duration: { default: DefaultDurationMs },
} as const;
