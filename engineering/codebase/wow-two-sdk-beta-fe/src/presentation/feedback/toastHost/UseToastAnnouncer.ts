import { onScopeDispose, shallowRef, watch, type Ref } from 'vue';

import { NoticePriority } from '../../../feedback';
import type { LocaleContextValue } from '../../../foundation/i18n';
import { Severity } from '../../../foundation/styles';
import { compareOrder, isRunning } from './ToastHostStore';
import type { ToastNode } from './ToastNode';
import type { VisibleToast } from './UseResolvedToasts';

/** @internal Arrivals this close together read as one message (ms). */
const BatchMs = 120;

/** @internal More arrivals than this in one batch read as a count plus the most important one. */
const ListedArrivals = 3;

/** @internal One queued announcement — the toast, its plain text and the region it speaks in. */
interface Announcement {
  readonly toast: VisibleToast;
  readonly text: string;
  readonly assertive: boolean;
  readonly arrival: boolean;
}

function textOf(node: ToastNode | undefined): string {
  return typeof node === 'string' ? node.trim() : '';
}

/** Joins phrases as sentences, adding a full stop only where a phrase has no closing mark of its own. */
function joinSentences(parts: ReadonlyArray<string>): string {
  return parts
    .filter((part) => part.length > 0)
    .reduce((text, part) => (!text ? part : /[.!?…:]$/u.test(text) ? `${text} ${part}` : `${text}. ${part}`), '');
}

/** Whether a toast interrupts: a danger severity or an urgent priority. */
function isUrgent(toast: VisibleToast): boolean {
  return (
    toast.severity === Severity.Danger ||
    toast.group?.latest.severity === Severity.Danger ||
    toast.priority === NoticePriority.Urgent
  );
}

/** Calls back after the next rendered frame, so a cleared region is seen empty before it fills again. */
function afterNextFrame(callback: () => void): () => void {
  if (typeof window.requestAnimationFrame !== 'function') {
    const handle = window.setTimeout(callback, 16);
    return () => window.clearTimeout(handle);
  }
  let handle = window.requestAnimationFrame(() => {
    handle = window.requestAnimationFrame(callback);
  });
  return () => window.cancelAnimationFrame(handle);
}

/**
 * Manages the host's two live regions. A new toast, an in-place change of its title, description or severity, a
 * group's growth and a finished operation each queue the toast's plain text; a progress update alone queues
 * nothing. A danger or urgent toast speaks in the assertive region, the rest in the polite one. Changes within
 * 120 ms read as one message, and more than three arrivals as a count plus the most important one. Each message
 * clears its region first, so the same text read twice is heard twice.
 */
export function useToastAnnouncer(
  cards: Readonly<Ref<ReadonlyArray<VisibleToast>>>,
  locale: Pick<LocaleContextValue, 't'>,
) {
  const polite = shallowRef('');
  const assertive = shallowRef('');
  let pending: Array<Announcement> = [];
  let batch: number | undefined;
  const frames = new Map<Ref<string>, () => void>();

  function speak(region: Ref<string>, message: string): void {
    frames.get(region)?.();
    region.value = '';
    frames.set(
      region,
      afterNextFrame(() => {
        frames.delete(region);
        region.value = message;
      }),
    );
  }

  function flush(): void {
    batch = undefined;
    const live = new Set(cards.value.map((card) => card.id));
    const queued = pending.filter((entry) => live.has(entry.toast.id));
    pending = [];
    if (queued.length === 0) return;
    const arrivals = queued.filter((entry) => entry.arrival);
    let parts = queued.map((entry) => entry.text);
    if (arrivals.length > ListedArrivals) {
      const [first] = [...arrivals].sort((a, b) => compareOrder(a.toast, b.toast));
      parts = [
        locale.t('ToastHost.manyArrivals', { count: arrivals.length }, '{count} new notifications'),
        first?.text ?? '',
        ...queued.filter((entry) => !entry.arrival).map((entry) => entry.text),
      ];
    }
    speak(queued.some((entry) => entry.assertive) ? assertive : polite, joinSentences(parts));
  }

  function enqueue(toast: VisibleToast, text: string, arrival: boolean): void {
    if (!text) return;
    // A toast that changes again inside the batch is read once, as it is now.
    const earlier = pending.findIndex((entry) => entry.toast.id === toast.id);
    const entry = { toast, text, assertive: isUrgent(toast), arrival: arrival || pending[earlier]?.arrival === true };
    if (earlier >= 0) pending[earlier] = entry;
    else pending.push(entry);
    batch ??= window.setTimeout(flush, BatchMs);
  }

  function copyOf(toast: VisibleToast): string {
    return joinSentences([textOf(toast.title), textOf(toast.description)]);
  }

  function growthOf(toast: VisibleToast & { group: NonNullable<VisibleToast['group']> }): string {
    const title = textOf(toast.title);
    const count = toast.group.count;
    const head = title
      ? locale.t('ToastHost.groupGrowth', { title, count }, '{title}: {count} notifications')
      : locale.t('ToastHost.groupCount', { count }, '{count} notifications');
    return joinSentences([head, textOf(toast.group.latest.title)]);
  }

  watch(cards, (next, previous) => {
    const earlier = new Map(previous.map((card) => [card.id, card]));
    for (const card of next) {
      const prior = earlier.get(card.id);
      if (!prior) {
        enqueue(card, copyOf(card), true);
        continue;
      }
      if (prior.nonce === card.nonce) continue;
      if (card.group && card.group.count > (prior.group?.count ?? 1)) {
        enqueue(card, growthOf({ ...card, group: card.group }), false);
        continue;
      }
      // A member leaving its group is the reader's own doing, or a quiet expiry.
      if (card.group && prior.group && card.group.count < prior.group.count) continue;
      const changed =
        textOf(prior.title) !== textOf(card.title) ||
        textOf(prior.description) !== textOf(card.description) ||
        prior.severity !== card.severity ||
        (isRunning(prior) && !isRunning(card));
      if (changed) enqueue(card, copyOf(card), false);
    }
  });

  onScopeDispose(() => {
    if (batch !== undefined) window.clearTimeout(batch);
    for (const cancel of frames.values()) cancel();
    frames.clear();
  });

  return { polite, assertive };
}
