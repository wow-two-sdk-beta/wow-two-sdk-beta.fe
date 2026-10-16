import type { SpeechRecognitionConstructor } from './SpeechRecognitionTypes';

/** What this environment can do. Two independent answers — no browser guarantees both, and Firefox gives one. */
export interface SpeechSupport {
  /** Whether `speak` can reach a real `speechSynthesis` AND a real `SpeechSynthesisUtterance`. */
  readonly synthesis: boolean;

  /** Whether `createSpeechRecognizer` can reach a real (possibly `webkit`-prefixed) `SpeechRecognition`. */
  readonly recognition: boolean;
}

/** A `SpeechSynthesisUtterance`-shaped constructor, as read off the global scope. */
export type UtteranceConstructor = new (text?: string) => SpeechSynthesisUtterance;

/**
 * Reads `speechSynthesis` when it exists and carries `member` as a callable.
 *
 * Members are asked for one at a time because they fail one at a time: a polyfill can implement `speak` and
 * `cancel` while omitting `pause` / `resume` (which several mobile engines genuinely do not honour). Guarded
 * end-to-end; returns `undefined` under SSR. Internal to the slice — used by the sibling modules, absent from the
 * barrel.
 *
 * @param member The method the caller is about to invoke, or `speak` when it only needs to read a flag.
 * @returns The `SpeechSynthesis` object, or `undefined` when it or `member` is unusable.
 */
export function speechSynthesisWith(
  member: 'speak' | 'cancel' | 'pause' | 'resume' | 'getVoices',
): SpeechSynthesis | undefined {
  try {
    const candidate: unknown = (globalThis as { speechSynthesis?: unknown }).speechSynthesis;
    if (typeof candidate !== 'object' || candidate === null) return undefined;

    const api = candidate as SpeechSynthesis;
    if (typeof api[member] !== 'function') return undefined;
    return api;
  } catch {
    // A throwing global getter (a partial polyfill, a locked-down webview) reads as absent — the same posture as
    // `foundation/media`'s `mediaDevicesWith` and `foundation/errors`' guarded member reads.
    return undefined;
  }
}

/**
 * Reads the `SpeechSynthesisUtterance` constructor.
 *
 * Separate from {@link speechSynthesisWith} because it is a separate global that can be separately missing.
 * Internal to the slice; absent from the barrel.
 *
 * @returns The constructor, or `undefined` under SSR / on a partial implementation.
 */
export function utteranceConstructor(): UtteranceConstructor | undefined {
  try {
    const candidate: unknown = (globalThis as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance;
    return typeof candidate === 'function' ? (candidate as UtteranceConstructor) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Reads the `SpeechRecognition` constructor, unprefixed first, then `webkit`-prefixed.
 *
 * Unprefixed wins where both exist: it is the one newer Chrome maintains, and an engine shipping both aliases
 * them anyway. Internal to the slice; absent from the barrel.
 *
 * @returns The constructor, or `undefined` under SSR and in Firefox.
 */
export function speechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  try {
    // Neither name exists in `lib.dom.d.ts`, so the cast goes through `unknown` — a direct assertion off
    // `typeof globalThis` would be comparing against properties TypeScript does not know exist.
    const scope = globalThis as unknown as {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    };

    const candidate: unknown = scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
    return typeof candidate === 'function' ? (candidate as SpeechRecognitionConstructor) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Whether this environment can speak text aloud.
 *
 * Never throws. `false` under SSR, and `false` on a page carrying only one of the two required globals.
 *
 * @returns `true` when `speak` will reach a real engine.
 */
export function canSpeak(): boolean {
  return speechSynthesisWith('speak') !== undefined && utteranceConstructor() !== undefined;
}

/**
 * Whether this environment can transcribe speech.
 *
 * A capability answer, NOT a permission answer: Chrome exposes the constructor to every page and only refuses at
 * `start()` — with `not-allowed` for a blocked microphone, or `service-not-allowed` on an insecure origin. Treat
 * `true` as "the button is worth rendering", never as "this will work".
 *
 * Never throws. `false` under SSR and in Firefox, which does not implement recognition at all.
 *
 * @returns `true` when a recognizer can be constructed.
 */
export function canRecognizeSpeech(): boolean {
  return speechRecognitionConstructor() !== undefined;
}

/**
 * Reports both capabilities at once — the shape a consumer branches on when it renders a speak button, a dictate
 * button, or both.
 *
 * Never throws. Both `false` under SSR.
 *
 * @returns The two independent answers.
 */
export function getSpeechSupport(): SpeechSupport {
  return { synthesis: canSpeak(), recognition: canRecognizeSpeech() };
}
