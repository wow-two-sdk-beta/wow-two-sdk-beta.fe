import { speechSynthesisWith } from './SpeechSupport';

/** How long {@link listVoices} waits for a populated list before answering with whatever exists. */
export const DefaultVoicesTimeoutMs = 1000;

/** The empty answer, shared so an unsupported environment does not allocate a new array per call. */
const NoVoices: ReadonlyArray<SpeechSynthesisVoice> = [];

/** Tunes the wait for an asynchronously-populated voice list. */
export interface ListVoicesOptions {
  /** How long to wait for `voiceschanged` before resolving with whatever exists. Defaults to `1000`. */
  readonly timeoutMs?: number;
}

/** Reads the engine's current list, guarded — a partial polyfill can return a non-array or throw outright. */
function readVoices(synth: SpeechSynthesis): ReadonlyArray<SpeechSynthesisVoice> {
  try {
    const voices: unknown = synth.getVoices();
    return Array.isArray(voices) ? (voices as SpeechSynthesisVoice[]) : NoVoices;
  } catch {
    return NoVoices;
  }
}

/**
 * The synchronous snapshot of the installed voices.
 *
 * OFTEN EMPTY on first paint — that is the platform behaviour this module exists to absorb, not a failure. Use it
 * only where an empty answer is acceptable (a re-render triggered by something else); prefer {@link listVoices}
 * anywhere the answer drives UI.
 *
 * Never throws. `[]` under SSR.
 *
 * @returns The voices the engine has registered so far.
 */
export function listVoicesSync(): ReadonlyArray<SpeechSynthesisVoice> {
  const synth = speechSynthesisWith('getVoices');
  return synth === undefined ? NoVoices : readVoices(synth);
}

/**
 * Subscribes to `voiceschanged`.
 *
 * Exported for the sibling composable, which re-reads the list when the engine revises it (Chrome does, after remote
 * voices load). Absent from the barrel — a consumer wants `useSpeechSynthesis`'s `voices`, not an event.
 *
 * Never throws. A no-op under SSR, where the returned unsubscribe is still safe to call.
 *
 * @param listener Called whenever the engine reports a change. Receives no arguments; re-read the list.
 * @returns The unsubscribe function.
 */
export function onVoicesChanged(listener: () => void): () => void {
  const noop = (): void => {
    // Nothing was subscribed, so there is nothing to tear down.
  };

  const synth = speechSynthesisWith('getVoices');
  if (synth === undefined) return noop;

  try {
    if (typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', listener);
      return (): void => {
        try {
          synth.removeEventListener('voiceschanged', listener);
        } catch {
          // A polyfill that accepted the listener but refuses to remove it leaves one live closure. Throwing from
          // an unsubscribe — usually an effect cleanup — would be far worse than that leak.
        }
      };
    }

    // Older WebKit: property-only wiring. Chain rather than clobber, so a consumer's own handler survives us.
    const previous = synth.onvoiceschanged;
    let active = true;
    const wrapped = function (this: SpeechSynthesis, event: Event): void {
      try {
        if (typeof previous === 'function') previous.call(this, event);
      } catch {
        /* Preserve other subscribers. */
      }
      if (active) listener();
    };
    synth.onvoiceschanged = wrapped;
    return (): void => {
      active = false;
      if (synth.onvoiceschanged === wrapped) synth.onvoiceschanged = previous;
    };
  } catch {
    return noop;
  }
}

/**
 * Lists the installed voices, WAITING for the asynchronously-populated list rather than returning the empty array
 * a first `getVoices()` hands back.
 *
 * Resolves immediately when the list is already populated — the common case on every call after the first.
 *
 * ```ts
 * const voices = await listVoices();
 * const german = voices.filter((voice) => voice.lang.startsWith('de'));
 * ```
 *
 * Never throws, never rejects. Resolves to `[]` under SSR, and to `[]` on a device that genuinely has no voices
 * (after the timeout).
 *
 * @param options The wait bound. Defaults to {@link DefaultVoicesTimeoutMs}.
 * @returns The voices, or `[]`.
 */
export function listVoices(options?: ListVoicesOptions): Promise<ReadonlyArray<SpeechSynthesisVoice>> {
  const synth = speechSynthesisWith('getVoices');
  if (synth === undefined) return Promise.resolve(NoVoices);

  const immediate = readVoices(synth);
  if (immediate.length > 0) return Promise.resolve(immediate);

  return new Promise<readonly SpeechSynthesisVoice[]>((resolve) => {
    let settled = false;

    // `settle` closes over `unsubscribe` and `timer`, both declared below. Safe because neither the subscription
    // nor the timer can call back synchronously — `onVoicesChanged` only registers, and a timeout is a task.
    const settle = (): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribe();
      // Re-read rather than close over an earlier snapshot: on the timeout path this is what catches an engine
      // that populated the list without ever firing the event.
      resolve(readVoices(synth));
    };

    const unsubscribe = onVoicesChanged((): void => {
      // An event carrying an empty list is not an answer — keep waiting for a real one, or for the deadline.
      if (readVoices(synth).length === 0) return;
      settle();
    });

    const timer = setTimeout(settle, options?.timeoutMs ?? DefaultVoicesTimeoutMs);
  });
}

/** Normalizes a BCP-47 tag for comparison: trimmed, lower-cased, and `en_US`-style separators repaired. */
function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/_/g, '-');
}

/** The primary language subtag — `de` from `de-AT`. The unit a fallback match is made on. */
function primarySubtag(tag: string): string {
  return normalizeTag(tag).split('-')[0] ?? '';
}

/** Sorts the engine's default voice first within a tier; otherwise preserves the engine's own order. */
function defaultFirst(voices: ReadonlyArray<SpeechSynthesisVoice>): ReadonlyArray<SpeechSynthesisVoice> {
  return [...voices].sort((left, right) => Number(right.default === true) - Number(left.default === true));
}

/**
 * Filters voices to a language tag, exact matches first, then same-primary-subtag ones.
 *
 * Pure — takes the list rather than fetching it, so it is trivially testable and reusable on a list a consumer
 * already holds. Tag comparison is case-insensitive and tolerates the `en_US` separator some engines report.
 *
 * The two tiers are kept in order rather than collapsed because they are not equivalent: `en-GB` text read by an
 * `en-US` voice is understandable, so it belongs in the list — but never ahead of an actual `en-GB` voice.
 *
 * @param voices The list to filter, typically from {@link listVoices}.
 * @param lang A BCP-47 tag (`de`, `en-GB`). Same vocabulary as `foundation/i18n`'s locale.
 * @returns The matching voices, best match first. Empty when nothing matches.
 */
export function voicesForLang(
  voices: ReadonlyArray<SpeechSynthesisVoice>,
  lang: string,
): ReadonlyArray<SpeechSynthesisVoice> {
  const wanted = normalizeTag(lang);
  if (wanted === '') return NoVoices;

  const wantedPrimary = primarySubtag(wanted);
  const exact: SpeechSynthesisVoice[] = [];
  const related: SpeechSynthesisVoice[] = [];

  for (const voice of voices) {
    const tag = typeof voice.lang === 'string' ? normalizeTag(voice.lang) : '';
    if (tag === '') continue;

    if (tag === wanted) exact.push(voice);
    else if (primarySubtag(tag) === wantedPrimary) related.push(voice);
  }

  return [...defaultFirst(exact), ...defaultFirst(related)];
}

/**
 * Picks the best voice for a language tag, waiting for the voice list the same way {@link listVoices} does.
 *
 * ```ts
 * const voice = await findVoice('de-DE');
 * await speak('Guten Tag', { voice, lang: 'de-DE' });
 * ```
 *
 * Never throws, never rejects.
 *
 * @param lang A BCP-47 tag.
 * @param options The wait bound, forwarded to {@link listVoices}.
 * @returns The best match, or `undefined` when the language has no voice installed (SSR included).
 */
export async function findVoice(lang: string, options?: ListVoicesOptions): Promise<SpeechSynthesisVoice | undefined> {
  const voices = await listVoices(options);
  return voicesForLang(voices, lang).at(0);
}
