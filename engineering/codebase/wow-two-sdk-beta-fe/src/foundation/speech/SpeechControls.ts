import { speechSynthesisWith } from './SpeechSupport';

/** Bumped by every cancel that reaches a real engine. Read by `speak` to classify its own ending. */
let cancels = 0;
const cancellationListeners = new Set<() => void>();

/** Registers an internal settlement callback for queue-wide cancellation. */
export function onSpeechCancelled(listener: () => void): () => void {
  cancellationListeners.add(listener);
  return () => cancellationListeners.delete(listener);
}

/**
 * The current cancel generation.
 *
 * Internal to the slice — `Speak` samples it before speaking and compares on settle. Absent from the barrel: the
 * number means nothing on its own, and a consumer comparing two samples is reimplementing `speak`.
 *
 * @returns A monotonically increasing count of cancels that reached the engine.
 */
export function cancelGeneration(): number {
  return cancels;
}

/**
 * Stops all speech and empties the utterance queue.
 *
 * GLOBAL: this silences every utterance in the document, not just the caller's. Any in-flight `speak` settles as
 * `cancelled` rather than `spoken` or `failed`.
 *
 * Never throws. A no-op under SSR.
 *
 * @returns `true` when a real engine was reached; `false` under SSR or when the call itself failed.
 */
export function cancelSpeech(): boolean {
  const synth = speechSynthesisWith('cancel');
  if (synth === undefined) return false;

  cancels += 1;
  for (const listener of [...cancellationListeners]) listener();
  try {
    synth.cancel();
    return true;
  } catch {
    // A `cancel()` that throws leaves speech running, and the generation already bumped — so an utterance that
    // survives will report `cancelled`. That is the safe way to be wrong: a cancelled-looking result for speech
    // the app asked to stop, rather than a `spoken` for speech it did not hear the end of.
    return false;
  }
}

/**
 * Pauses the current utterance, leaving the queue intact.
 *
 * Never throws. A no-op under SSR, and on engines that expose no `pause` (some mobile webviews). See the module
 * header for Chrome-on-Android's pause-is-cancel behaviour.
 *
 * @returns `true` when the call reached a real engine.
 */
export function pauseSpeech(): boolean {
  const synth = speechSynthesisWith('pause');
  if (synth === undefined) return false;

  try {
    synth.pause();
    return true;
  } catch {
    // A partial implementation refusing the call is reported, never thrown — the caller is a click handler.
    return false;
  }
}

/**
 * Resumes speech paused by {@link pauseSpeech}.
 *
 * Never throws. A no-op under SSR.
 *
 * @returns `true` when the call reached a real engine.
 */
export function resumeSpeech(): boolean {
  const synth = speechSynthesisWith('resume');
  if (synth === undefined) return false;

  try {
    synth.resume();
    return true;
  } catch {
    return false;
  }
}

/**
 * Whether the engine is speaking right now.
 *
 * Reads the platform's own flag rather than a locally tracked one, so it stays true for speech this module did
 * not start. Note it stays `true` while PAUSED — that is the spec's definition, not a bug; pair it with
 * {@link isSpeechPaused}.
 *
 * Never throws. `false` under SSR.
 *
 * @returns The engine's `speaking` flag.
 */
export function isSpeaking(): boolean {
  const synth = speechSynthesisWith('speak');
  if (synth === undefined) return false;

  try {
    return synth.speaking === true;
  } catch {
    return false;
  }
}

/**
 * Whether the engine is in a paused state.
 *
 * Never throws. `false` under SSR.
 *
 * @returns The engine's `paused` flag.
 */
export function isSpeechPaused(): boolean {
  const synth = speechSynthesisWith('speak');
  if (synth === undefined) return false;

  try {
    return synth.paused === true;
  } catch {
    return false;
  }
}
