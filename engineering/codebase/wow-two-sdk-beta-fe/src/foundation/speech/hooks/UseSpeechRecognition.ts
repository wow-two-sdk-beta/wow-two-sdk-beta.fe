import { onMounted, onScopeDispose, shallowRef, toValue, watch, type MaybeRefOrGetter, type ShallowRef } from 'vue';

import { useLocale } from '../../i18n';

import {
  createSpeechRecognizer,
  type RecognizerStartResult,
  type SpeechRecognizer,
  type SpeechRecognizerOptions,
} from '../CreateSpeechRecognizer';
import type { SpeechRecognitionFailure } from '../SpeechRecognitionResult';
import { canRecognizeSpeech } from '../SpeechSupport';

/** Options for {@link useSpeechRecognition} — the recognizer's own, with the composable layering state on top. */
export type UseSpeechRecognitionOptions = SpeechRecognizerOptions;

/** What {@link useSpeechRecognition} returns. */
export interface SpeechRecognitionControls {
  /** Whether this browser can transcribe at all. `false` under SSR and in Firefox — gate the button on it. */
  readonly supported: Readonly<ShallowRef<boolean>>;

  /** Whether the engine is listening. `false` in the gap between `start()` and the microphone actually opening. */
  readonly listening: Readonly<ShallowRef<boolean>>;

  /** Every committed phrase of the session, space-joined. Survives an ended session; cleared by `reset`. */
  readonly transcript: Readonly<ShallowRef<string>>;

  /** The current uncommitted text. Requires `interimResults`; cleared when the phrase commits or the session ends. */
  readonly interimTranscript: Readonly<ShallowRef<string>>;

  /** The last classified failure, or `null`. Cleared when a new session starts. `no-speech` lands here too. */
  readonly error: Readonly<ShallowRef<SpeechRecognitionFailure | null>>;

  /** Begins a session. Repeated calls succeed without restarting a session that is starting or listening. */
  readonly start: () => RecognizerStartResult;

  /** Ends the session, keeping what the engine already recognized. */
  readonly stop: () => void;

  /** Ends the session immediately, discarding pending results. */
  readonly abort: () => void;

  /** Clears `transcript`, `interimTranscript`, and `error`. Does not touch the session. */
  readonly reset: () => void;
}

/** Appends a committed phrase, space-joined, skipping the empty results an engine occasionally commits. */
function appendPhrase(previous: string, phrase: string): string {
  const next = phrase.trim();
  if (next === '') return previous;
  return previous === '' ? next : `${previous} ${next}`;
}

/**
 * Transcribes speech into accumulating reactive state, aborting the session when the scope is disposed.
 *
 * ```vue
 * const dictation = useSpeechRecognition({ interimResults: true, continuous: true });
 * <button :disabled="!dictation.supported.value" @click="dictation.start()">
 *   {{ dictation.listening.value ? 'Listening…' : 'Dictate' }}
 * </button>
 * <p>{{ dictation.transcript.value }} <em>{{ dictation.interimTranscript.value }}</em></p>
 * ```
 *
 * `lang` defaults to the active `LocaleProvider` locale, so a localized app transcribes the language its user is
 * reading. Nothing throws.
 *
 * @param options Session shape and pass-through callbacks — each is called in addition to the state updates.
 *   A ref or getter is read at call time, so a reactive options source is followed.
 * @returns The transcript state plus the four controls.
 */
export function useSpeechRecognition(
  options?: MaybeRefOrGetter<UseSpeechRecognitionOptions | undefined>,
): SpeechRecognitionControls {
  const { locale } = useLocale();

  const transcript = shallowRef('');
  const interimTranscript = shallowRef('');
  const listening = shallowRef(false);
  const error = shallowRef<SpeechRecognitionFailure | null>(null);

  // `false` until mount, exactly as the original's SSR snapshot: `canRecognizeSpeech` reads `window`, and a
  // server that claimed support would render a button the client immediately has to disable. Nothing subscribes
  // because a browser cannot gain a recognition engine mid-session.
  const supported = shallowRef(false);

  /** Guards state writes after teardown — the pass-through callbacks still fire, the reactive state does not. */
  let disposed = false;
  let generation = 0;
  let recognizer: SpeechRecognizer | null = null;

  function getRecognizer(): SpeechRecognizer {
    if (recognizer !== null) return recognizer;

    const operation = ++generation;
    const current = (): boolean => !disposed && operation === generation;
    const created = createSpeechRecognizer({
      lang: toValue(options)?.lang ?? locale.value,
      continuous: toValue(options)?.continuous,
      // Interim results default ON here, unlike the bare recognizer: a composable exposing `interimTranscript`
      // that is permanently empty is a worse default than one that costs a few extra updates.
      interimResults: toValue(options)?.interimResults ?? true,
      maxAlternatives: toValue(options)?.maxAlternatives,

      onStart: (): void => {
        if (!current()) return;
        listening.value = true;
        error.value = null;
        toValue(options)?.onStart?.();
      },

      onEnd: (): void => {
        if (!current()) return;
        listening.value = false;
        interimTranscript.value = '';
        toValue(options)?.onEnd?.();
      },

      onError: (failure): void => {
        if (!current()) return;
        error.value = failure;
        toValue(options)?.onError?.(failure);
      },

      onResult: (result): void => {
        if (!current()) return;
        if (result.isFinal) {
          transcript.value = appendPhrase(transcript.value, result.transcript);
          interimTranscript.value = '';
        } else {
          interimTranscript.value = result.transcript;
        }
        toValue(options)?.onResult?.(result);
      },

      onFinal: (text): void => {
        if (!current()) return;
        toValue(options)?.onFinal?.(text);
      },

      onInterim: (text): void => {
        if (!current()) return;
        toValue(options)?.onInterim?.(text);
      },
    });

    recognizer = created;
    return created;
  }

  const start = (): RecognizerStartResult =>
    disposed ? { ok: false, failure: { status: 'unsupported' } } : getRecognizer().start();

  // `stop` / `abort` read the field instead of the getter: nothing can be running if nothing was ever built, and
  // constructing a recognizer in order to stop it would open the very session being cancelled.
  const stop = (): void => {
    recognizer?.stop();
  };

  const abort = (): void => {
    recognizer?.abort();
  };

  const reset = (): void => {
    transcript.value = '';
    interimTranscript.value = '';
    error.value = null;
  };

  onMounted(() => {
    supported.value = canRecognizeSpeech();
  });

  // Config is applied at construction, so a change means a new instance. Aborting first is deliberate: a session
  // already running under the old language cannot be re-tagged mid-sentence. Non-immediate, so nothing is
  // aborted on the server — there is nothing to abort there anyway.
  watch(
    [
      () => toValue(options)?.lang ?? locale.value,
      () => toValue(options)?.continuous ?? false,
      () => toValue(options)?.interimResults ?? true,
    ],
    () => {
      generation++;
      listening.value = false;
      interimTranscript.value = '';
      recognizer?.abort();
      recognizer = null;
    },
  );

  onScopeDispose(() => {
    disposed = true;
    // `abort`, never `stop`: nothing is left to receive a final transcript, and the microphone must close now.
    recognizer?.abort();
    recognizer = null;
  });

  return { supported, listening, transcript, interimTranscript, error, start, stop, abort, reset };
}
