import { toError } from '../errors';

import { cancelGeneration, cancelSpeech, onSpeechCancelled, pauseSpeech, resumeSpeech } from './SpeechControls';
import { speechSynthesisWith, utteranceConstructor } from './SpeechSupport';
import { toSpeakFailure, type SpeechSpeakResult } from './SpeechResult';

/** Tunes one utterance. Every field is optional; an omitted one leaves the engine's own default in place. */
export interface SpeakOptions {
  /** The voice to speak with — an entry from `listVoices()`. Omitted means the engine's default for `lang`. */
  readonly voice?: SpeechSynthesisVoice;

  /** BCP-47 tag (`en-US`, `de`). Same vocabulary as `foundation/i18n`, which `useSpeechSynthesis` defaults it to. */
  readonly lang?: string;

  /** Speed, `0.1`–`10`, default `1`. Clamped to that range; a non-finite value is ignored. */
  readonly rate?: number;

  /** Pitch, `0`–`2`, default `1`. Clamped to that range; a non-finite value is ignored. */
  readonly pitch?: number;

  /** Volume, `0`–`1`, default `1`. Clamped to that range; a non-finite value is ignored. */
  readonly volume?: number;
}

/**
 * The return of {@link speak}: awaitable for the outcome, and callable for control while it runs.
 *
 * All three controls are GLOBAL — the platform exposes no per-utterance cancel or pause, so they act on the
 * document's whole utterance queue.
 */
export interface SpeechHandle extends PromiseLike<SpeechSpeakResult> {
  /** The underlying promise, for a caller that wants to store or pass it. Never rejects. */
  readonly spoken: Promise<SpeechSpeakResult>;

  /** Stops this utterance — and every other queued one. Settles the handle as `cancelled`. */
  readonly cancel: () => void;

  /** Pauses the engine. See `SpeechControls` for Chrome-on-Android's pause-is-cancel behaviour. */
  readonly pause: () => void;

  /** Resumes a paused engine. */
  readonly resume: () => void;
}

/**
 * Holds a reference to every utterance the engine is still working on, defeating the GC bug described in the
 * module header. Cleared on settle, so a page that speaks all day does not accumulate.
 */
const inFlight = new Set<SpeechSynthesisUtterance>();

/** Clamps to a spec range, dropping non-finite values so the engine keeps its own default. */
function clamp(value: number | undefined, min: number, max: number): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return Math.min(max, Math.max(min, value));
}

/** Applies `options` to `utterance`, guarded — an engine may refuse a setter, and a refusal must not throw. */
function configure(utterance: SpeechSynthesisUtterance, options: SpeakOptions | undefined): void {
  if (options === undefined) return;

  try {
    if (options.voice !== undefined) utterance.voice = options.voice;
    if (options.lang !== undefined) utterance.lang = options.lang;

    const rate = clamp(options.rate, 0.1, 10);
    if (rate !== undefined) utterance.rate = rate;

    const pitch = clamp(options.pitch, 0, 2);
    if (pitch !== undefined) utterance.pitch = pitch;

    const volume = clamp(options.volume, 0, 1);
    if (volume !== undefined) utterance.volume = volume;
  } catch {
    // A setter that refused its value leaves the engine default in place, which is speakable. Losing the tuning
    // is strictly better than losing the utterance.
  }
}

/** Wraps a promise and a set of controls into the awaitable handle. */
function toHandle(spoken: Promise<SpeechSpeakResult>, controls: Omit<SpeechHandle, 'spoken' | 'then'>): SpeechHandle {
  return {
    spoken,
    cancel: controls.cancel,
    pause: controls.pause,
    resume: controls.resume,
    then: <TResult1 = SpeechSpeakResult, TResult2 = never>(
      onFulfilled?: ((value: SpeechSpeakResult) => TResult1 | PromiseLike<TResult1>) | null,
      onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2> => spoken.then(onFulfilled, onRejected),
  };
}

/** The controls of a handle for speech that never started — every one a no-op. */
function inertControls(): Omit<SpeechHandle, 'spoken' | 'then'> {
  const noop = (): void => {
    // Nothing is speaking, so there is nothing to cancel, pause, or resume.
  };
  return { cancel: noop, pause: noop, resume: noop };
}

/**
 * Speaks `text` aloud, settling when the utterance ends.
 *
 * ```ts
 * const result = await speak('Order confirmed', { lang: 'en-GB', rate: 1.1 });
 * if (!result.ok && result.failure.status === 'unsupported') showTextInstead();
 *
 * const handle = speak(longArticle);
 * stopButton.onclick = () => handle.cancel(); // settles as `cancelled`
 * ```
 *
 * Call it from a user gesture where possible: some engines refuse synthesis without one (arriving as `failed`
 * with a `not-allowed` code, since the API was present).
 *
 * Never throws, never rejects.
 *
 * @param text The text to speak. Empty text completes immediately without waiting for a browser event.
 * @param options Voice, language, and prosody. Out-of-range prosody is clamped; see {@link SpeakOptions}.
 * @returns The awaitable handle — `spoken` / `cancelled` / `unsupported` / `failed`, plus the live controls.
 */
export function speak(text: string, options?: SpeakOptions): SpeechHandle {
  if (text.length === 0) return toHandle(Promise.resolve({ ok: true, value: undefined }), inertControls());
  const synth = speechSynthesisWith('speak');
  const Utterance = utteranceConstructor();

  // Both globals or nothing: an engine with no `SpeechSynthesisUtterance` cannot be given anything to say.
  if (synth === undefined || Utterance === undefined) {
    return toHandle(Promise.resolve({ ok: false, failure: { status: 'unsupported' } }), inertControls());
  }

  let settle!: (result: SpeechSpeakResult) => void;
  const spoken = new Promise<SpeechSpeakResult>((resolve) => {
    settle = resolve;
  });

  let settled = false;
  let utterance: SpeechSynthesisUtterance | undefined;

  /** Settles once and drops the GC-guard reference. Engines fire both `end` and `error` in some cancel paths. */
  const finish = (result: SpeechSpeakResult): void => {
    if (settled) return;
    settled = true;
    unsubscribeCancel?.();
    if (utterance !== undefined) inFlight.delete(utterance);
    settle(result);
  };

  try {
    utterance = new Utterance(text);
  } catch (cause) {
    // A constructor that refused the text (a hostile value, a stripped polyfill) is a failure of this call, not
    // an absence of the feature — `unsupported` would send the caller looking for the wrong fix.
    return toHandle(
      Promise.resolve({ ok: false, failure: { status: 'failed', error: toError(cause) } }),
      inertControls(),
    );
  }

  configure(utterance, options);

  // Sampled BEFORE `speak`, so any cancel from this point on — ours or another component's — is observable when
  // the ending arrives. See `SpeechControls` for why an `end` event alone cannot answer this.
  const generation = cancelGeneration();
  const wasCancelled = (): boolean => cancelGeneration() !== generation;
  const unsubscribeCancel = onSpeechCancelled(() => finish({ ok: false, failure: { status: 'cancelled' } }));

  utterance.onend = (): void => {
    finish(wasCancelled() ? { ok: false, failure: { status: 'cancelled' } } : { ok: true, value: undefined });
  };

  utterance.onerror = (event): void => {
    // A cancel we already know about wins over the code: engines disagree on which code a cancelled utterance
    // carries (`canceled`, `interrupted`, and Safari has shipped others), and the counter is not a guess.
    finish(wasCancelled() ? { ok: false, failure: { status: 'cancelled' } } : toSpeakFailure(event));
  };

  inFlight.add(utterance);

  try {
    synth.speak(utterance);
  } catch (cause) {
    finish({ ok: false, failure: { status: 'failed', error: toError(cause) } });
  }

  return toHandle(spoken, {
    cancel: (): void => {
      cancelSpeech();
    },
    pause: (): void => {
      pauseSpeech();
    },
    resume: (): void => {
      resumeSpeech();
    },
  });
}
