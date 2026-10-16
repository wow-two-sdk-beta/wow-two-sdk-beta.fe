import { onMounted, onScopeDispose, shallowRef, type ShallowRef } from 'vue';

import { useLocale } from '../../i18n';

import { listVoices, listVoicesSync, onVoicesChanged } from '../ListVoices';
import { speak as speakText, type SpeakOptions } from '../Speak';
import { cancelSpeech, pauseSpeech, resumeSpeech } from '../SpeechControls';
import type { SpeechSpeakResult } from '../SpeechResult';
import { canSpeak } from '../SpeechSupport';

/** What {@link useSpeechSynthesis} returns. */
export interface SpeechSynthesisControls {
  /** Whether this browser can speak. `false` under SSR — render the button only once this is `true`. */
  readonly supported: Readonly<ShallowRef<boolean>>;

  /** The installed voices. Starts empty and fills in asynchronously; see `ListVoices` for why that is normal. */
  readonly voices: Readonly<ShallowRef<ReadonlyArray<SpeechSynthesisVoice>>>;

  /** Whether this composable has an utterance in flight — not the engine's global flag, shared by all callers. */
  readonly speaking: Readonly<ShallowRef<boolean>>;

  /** Whether this composable paused the engine. */
  readonly paused: Readonly<ShallowRef<boolean>>;

  /** Speaks text, resolving to the outcome. Never throws. Defaults `lang` to the active locale. */
  readonly speak: (text: string, options?: SpeakOptions) => Promise<SpeechSpeakResult>;

  /** Stops all speech in the document — no narrower cancel exists. In-flight `speak` calls settle as `cancelled`. */
  readonly cancel: () => void;

  /** Pauses the engine. See `SpeechControls` for Chrome-on-Android's pause-is-cancel behaviour. */
  readonly pause: () => void;

  /** Resumes a paused engine. */
  readonly resume: () => void;
}

/**
 * The initial voice list. Empty rather than `listVoicesSync()`, for the same reason `supported` starts `false`:
 * a server renders nothing and a client would render a full picker, and the mismatch is a hydration error —
 * quite apart from `listVoicesSync` reaching for a global the server does not have. The mount hook fills it in
 * on the very next tick.
 */
const NoVoices: ReadonlyArray<SpeechSynthesisVoice> = [];

/**
 * Speaks text and owns the lifecycle — cancelling this composable's in-flight speech when the scope is disposed.
 *
 * ```vue
 * const speech = useSpeechSynthesis();
 * <button :disabled="!speech.supported.value" @click="speech.speak(article)">
 *   {{ speech.speaking.value ? 'Stop' : 'Read aloud' }}
 * </button>
 * ```
 *
 * Inherits the slice's never-throws contract — a rejected promise is not one of the outcomes.
 *
 * @returns The state plus the four controls.
 */
export function useSpeechSynthesis(): SpeechSynthesisControls {
  const { locale } = useLocale();

  const voices = shallowRef<readonly SpeechSynthesisVoice[]>(NoVoices);
  const speaking = shallowRef(false);
  const paused = shallowRef(false);
  const supported = shallowRef(false);

  /** Guards state writes after teardown. */
  let disposed = false;

  /** How many utterances THIS composable started and has not seen settle. Drives both `speaking` and the cancel. */
  let inFlight = 0;

  const speak = async (text: string, options?: SpeakOptions): Promise<SpeechSpeakResult> => {
    if (disposed) return { ok: false, failure: { status: 'cancelled' } };
    inFlight += 1;
    if (!disposed) {
      speaking.value = true;
      paused.value = false;
    }

    // `lang` falls back to the app's active locale rather than the browser UI language: a localized app should
    // read its own text in the language the user is reading, not the one the OS was installed in.
    const result = await speakText(text, { ...options, lang: options?.lang ?? locale.value });

    inFlight = Math.max(0, inFlight - 1);
    // Only the LAST utterance clears the flag — a consumer queueing three sentences is speaking until all three
    // have settled.
    if (!disposed && inFlight === 0) {
      speaking.value = false;
      paused.value = false;
    }

    return result;
  };

  const cancel = (): void => {
    cancelSpeech();
    if (!disposed) paused.value = false;
  };

  const pause = (): void => {
    if (pauseSpeech() && !disposed) paused.value = true;
  };

  const resume = (): void => {
    if (resumeSpeech() && !disposed) paused.value = false;
  };

  let unsubscribe: (() => void) | undefined;

  onMounted(() => {
    supported.value = canSpeak();

    const apply = (next: ReadonlyArray<SpeechSynthesisVoice>): void => {
      if (!disposed) voices.value = next;
    };

    // Waits out the empty-first-call problem; resolves immediately once the list is populated.
    void listVoices().then(apply);

    unsubscribe = onVoicesChanged((): void => {
      apply(listVoicesSync());
    });
  });

  onScopeDispose(() => {
    disposed = true;
    unsubscribe?.();
    unsubscribe = undefined;
    // The whole point of the composable. Only when THIS one has something in flight — the platform's cancel is
    // global, and a teardown is no reason to silence another component.
    if (inFlight > 0) cancelSpeech();
  });

  return { supported, voices, speaking, paused, speak, cancel, pause, resume };
}
