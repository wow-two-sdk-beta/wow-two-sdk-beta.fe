import type { SpeechSpeakResult } from './models/SpeechSpeakResult';
import type { SpeechFailure } from './models/SpeechFailure';

export type { SpeechFailure } from './models/SpeechFailure';
export type { SpeechSpeakResult } from './models/SpeechSpeakResult';
export type SpeakStatus = 'spoken' | SpeechFailure['status'];

/** Codes that mean the app (or the user) stopped the utterance, rather than the engine failing to speak it. */
const CancellationCodes: ReadonlySet<string> = new Set(['canceled', 'cancelled', 'interrupted']);

/**
 * Reads a caught / delivered value's `error` code as a string. Guarded: a throwing getter or a `Proxy` trap reads
 * as absent rather than escalating inside the handler that is already dealing with a failure.
 */
function errorCodeOf(event: unknown): string | undefined {
  if (event === null || (typeof event !== 'object' && typeof event !== 'function')) return undefined;

  try {
    const code: unknown = (event as Record<string, unknown>)['error'];
    return typeof code === 'string' ? code : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Classifies a `SpeechSynthesisUtterance` `error` event into its {@link SpeechSpeakResult}.
 *
 * Exported for the sibling `Speak` module and its tests; absent from the barrel, where `speak` is the surface a
 * consumer wants. Never throws — an unrecognized or unreadable code becomes `failed` with an `Error` naming what
 * arrived, so even a hostile event produces a usable result.
 *
 * @param event The `error` event the platform delivered.
 * @returns `cancelled` for a cancellation code, `failed` for everything else.
 */
export function toSpeakFailure(event: unknown): SpeechSpeakResult {
  const code = errorCodeOf(event);
  if (code !== undefined && CancellationCodes.has(code)) return { ok: false, failure: { status: 'cancelled' } };

  // The raw event rides along as `cause`, which `foundation/errors`' chain walkers already traverse safely
  // (cycle-guarded, depth-capped) — so a log keeps the platform's own object without this module trusting it.
  const error = new Error(`speech synthesis failed: ${code ?? 'unknown'}`, { cause: event });
  return { ok: false, failure: { status: 'failed', error } };
}
