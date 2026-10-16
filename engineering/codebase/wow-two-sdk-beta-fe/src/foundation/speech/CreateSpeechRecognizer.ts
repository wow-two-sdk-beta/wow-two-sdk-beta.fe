import type { RecognizerStartResult } from './models/RecognizerStartResult';

import { toError } from '../errors';
import { ResultExtensions } from '../results';

import { speechRecognitionConstructor } from './SpeechSupport';
import {
  toSpeechRecognitionFailure,
  type SpeechRecognitionFailure,
  type SpeechTranscript,
} from './SpeechRecognitionResult';
import type { SpeechRecognitionEventLike, SpeechRecognitionLike } from './SpeechRecognitionTypes';
export type { RecognizerStartFailure } from './models/RecognizerStartFailure';
export type { RecognizerStartResult } from './models/RecognizerStartResult';

/** Configuration and callbacks for a recognizer. Applied once, at creation — see {@link createSpeechRecognizer}. */
export interface SpeechRecognizerOptions {
  /** BCP-47 tag to transcribe (`en-US`, `uz`). Same vocabulary as `foundation/i18n`. Defaults to the engine's. */
  readonly lang?: string;

  /** Keep listening past the first phrase. Defaults to `false`. Chrome still ends the session on long silence. */
  readonly continuous?: boolean;

  /** Emit revisable partial results while the user is still speaking. Defaults to `false`. */
  readonly interimResults?: boolean;

  /** How many alternatives each result carries. Defaults to the engine's (`1`). */
  readonly maxAlternatives?: number;

  /** Every update, interim and final — the one callback that sees the whole stream. A throw from it is swallowed. */
  readonly onResult?: (result: SpeechTranscript) => void;

  /** Committed phrases only. The callback most consumers want. A throw from it is swallowed. */
  readonly onFinal?: (transcript: string) => void;

  /** The current uncommitted text, joined across pending results. Requires `interimResults`. */
  readonly onInterim?: (transcript: string) => void;

  /** A classified failure. `no-speech` and `aborted` arrive here too — neither is worth a toast. */
  readonly onError?: (failure: SpeechRecognitionFailure) => void;

  /** The engine is now listening — later than the `start()` that asked for it, and after any permission prompt. */
  readonly onStart?: () => void;

  /** The session ended, for ANY reason: `stop`, `abort`, an error, or the engine's own silence timeout. */
  readonly onEnd?: () => void;
}

/** A wrapped recognition session. Every method is total — nothing throws, nothing needs a `try`. */
export interface SpeechRecognizer {
  /** Whether a real engine is behind this recognizer. `false` under SSR, in Firefox, and if construction failed. */
  readonly supported: boolean;

  /** Whether the engine is listening right now — `false` during the gap between `start()` and the `start` event. */
  readonly listening: boolean;

  /** Begins a session. Repeated calls succeed without restarting a session that is starting or listening. */
  readonly start: () => RecognizerStartResult;

  /** Ends the session, keeping results the engine has already recognized. A no-op when idle. */
  readonly stop: () => void;

  /** Ends the session immediately, discarding pending results. A no-op when idle. Use this on unmount. */
  readonly abort: () => void;
}

/** Hands a consumer's callback its argument, absorbing a throw so it cannot escape into the browser's dispatch. */
function report<TArgument>(callback: ((argument: TArgument) => void) | undefined, argument: TArgument): void {
  if (callback === undefined) return;

  try {
    callback(argument);
  } catch {
    // The consumer's own handler failed. Nothing useful is left to do with that, and the session must continue.
  }
}

/** The recognizer handed back where no engine exists — every call answers, none of them reach anything. */
function inertRecognizer(start: () => RecognizerStartResult): SpeechRecognizer {
  const noop = (): void => {
    // No session can exist, so there is nothing to stop or abort.
  };

  return { supported: false, listening: false, start, stop: noop, abort: noop };
}

/**
 * Creates a wrapped speech recognizer.
 *
 * ```ts
 * const recognizer = createSpeechRecognizer({
 *   lang: 'en-US',
 *   interimResults: true,
 *   onFinal: (text) => append(text),
 *   onError: (failure) => { if (failure.status === 'denied') showMicrophoneHelp(); },
 * });
 *
 * if (recognizer.supported) recognizer.start();
 * ```
 *
 * Options are applied ONCE, at creation: the platform reads `lang` / `continuous` / `interimResults` when a
 * session starts and offers no way to reconfigure a running one, so changing them means creating a new
 * recognizer. `useSpeechRecognition` does exactly that when its `lang` changes.
 *
 * Never throws. Always returns a usable object — check `supported`, or read the `start()` result.
 *
 * @param options Language, session shape, and callbacks.
 * @returns The recognizer. `supported: false` under SSR, in Firefox, and where the constructor exists but refuses.
 */
export function createSpeechRecognizer(options?: SpeechRecognizerOptions): SpeechRecognizer {
  const Recognition = speechRecognitionConstructor();
  if (Recognition === undefined) return inertRecognizer(() => ResultExtensions.fail({ status: 'unsupported' }));

  let instance: SpeechRecognitionLike;
  try {
    instance = new Recognition();
  } catch (cause) {
    // The constructor exists but refuses to instantiate (a policy-blocked iframe is the realistic case).
    // `supported` reports false because nothing can be started — but `start()` hands back the REAL error rather
    // than a soothing `unsupported`, which would send a developer hunting for a browser that already has the API.
    const error = toError(cause);
    return inertRecognizer(() => ResultExtensions.fail({ status: 'failed', error }));
  }

  try {
    if (options?.lang !== undefined) instance.lang = options.lang;
    instance.continuous = options?.continuous ?? false;
    instance.interimResults = options?.interimResults ?? false;
    if (options?.maxAlternatives !== undefined) instance.maxAlternatives = options.maxAlternatives;
  } catch {
    // A partial implementation refusing a setter keeps its own defaults, which still transcribe something.
  }

  let state: 'idle' | 'starting' | 'listening' = 'idle';

  /** Walks the results this event changed, emitting one update per result and one joined interim string. */
  const emitResults = (event: SpeechRecognitionEventLike): void => {
    try {
      const results = event.results;
      const length = typeof results?.length === 'number' ? results.length : 0;
      // `results` is CUMULATIVE across the session, so a walk from 0 would re-emit every phrase on every event.
      const first = Number.isInteger(event.resultIndex) ? Math.max(0, event.resultIndex) : 0;

      let interim = '';

      for (let index = first; index < length; index += 1) {
        const result = results[index];
        if (result === undefined) continue;

        // Alternative 0 is the engine's best guess; the rest exist only when `maxAlternatives` asked for them.
        const alternative = result[0];
        if (alternative === undefined) continue;

        const transcript = typeof alternative.transcript === 'string' ? alternative.transcript : '';
        const confidence = typeof alternative.confidence === 'number' ? alternative.confidence : 0;
        const isFinal = result.isFinal === true;

        report(options?.onResult, { transcript, isFinal, confidence });
        if (isFinal) report(options?.onFinal, transcript);
        else if (transcript !== '') interim = interim === '' ? transcript : `${interim} ${transcript}`;
      }

      if (interim !== '') report(options?.onInterim, interim);
    } catch {
      // A hostile or half-implemented event shape costs this one update, never the session.
    }
  };

  try {
    instance.onstart = (): void => {
      state = 'listening';
      report<void>(options?.onStart, undefined);
    };

    instance.onend = (): void => {
      state = 'idle';
      report<void>(options?.onEnd, undefined);
    };

    instance.onerror = (event): void => {
      // No state change here: every error is followed by `end`, which is the single place the session closes.
      report(options?.onError, toSpeechRecognitionFailure(event));
    };

    instance.onresult = emitResults;
  } catch {
    // An instance that refuses handler assignment can still be started; it just reports nothing.
  }

  return {
    supported: true,

    get listening(): boolean {
      return state === 'listening';
    },

    start: (): RecognizerStartResult => {
      // Pre-empts the native `InvalidStateError` — including during `starting`, the window a two-state flag misses.
      if (state !== 'idle') return ResultExtensions.ok(undefined);

      try {
        instance.start();
        state = 'starting';
        return ResultExtensions.ok(undefined);
      } catch (cause) {
        // The engine still considers a previous session open (an `abort` whose `end` has not arrived), or the
        // page has no microphone permission to hand over.
        state = 'idle';
        return ResultExtensions.fail({ status: 'failed', error: toError(cause) });
      }
    },

    stop: (): void => {
      if (state === 'idle') return;

      try {
        instance.stop();
      } catch {
        // Stopping something the engine already stopped is not a failure worth surfacing.
      }
    },

    abort: (): void => {
      if (state === 'idle') return;
      state = 'idle';

      try {
        instance.abort();
      } catch {
        // Same as `stop`. The local state is cleared first, so a refusing engine cannot strand this wrapper.
      }
    },
  };
}
