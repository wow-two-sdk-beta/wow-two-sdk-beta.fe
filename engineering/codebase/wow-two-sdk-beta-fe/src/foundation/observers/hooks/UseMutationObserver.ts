// `useMutationObserver` — react to DOM changes made by code this component does not own: a third-party widget
// that injects nodes, a portal target filling in, a `contenteditable` the user is typing into, an external
// script toggling an attribute. Inside Vue you use reactive state; this is the escape hatch for everything
// outside it.
//
// THE CALLBACK IS CALLED THROUGH THE CLOSURE, so consumers never have to memoize it. Mutation callbacks are
// usually written inline and usually close over reactive state; a component's `setup` runs once, so the one the
// consumer passes is the one and only, and the subscription itself is never churned by its identity.
//
// SUBSCRIPTION LIFECYCLE IS A PLAIN POST-FLUSH EFFECT. A template ref is reactive, so `watchPostEffect` re-runs
// exactly when the node or the options change and never otherwise. `mutationSignature` stays exported from the
// core for a non-Vue caller, but this file has no use for it.
//
// RECORDS ARRIVE AS A BATCH AND ARE PASSED THROUGH AS ONE. They are a transaction; see `ObserveMutation`.
//
// NO `once` KNOB. Unlike an intersection, "the DOM changed once" is almost never the interesting event — the
// consumer wants the mutations for as long as the node is mounted. A caller that genuinely wants one shot
// disconnects from inside the callback, which is why the observer is handed to it.

import { toValue, watchPostEffect, type MaybeRefOrGetter } from 'vue';

import { observeMutation, supportsMutationObserver, type MutationOptions } from '../ObserveMutation';

/** The `MutationObserverInit` flags plus the one lifecycle knob. */
export interface UseMutationObserverOptions extends MutationOptions {
  /** Suspend observation without tearing down. Flipping it back re-subscribes to the current node. */
  readonly disabled?: boolean;
}

/**
 * Runs `callback` whenever the node behind `target` mutates.
 *
 * With no options, watches `childList` — additions and removals of direct children. Add `subtree: true` to
 * extend that (and every other flag) to descendants.
 *
 * Takes the node as a ref or getter rather than handing one back. Records describe what ALREADY happened; the
 * DOM is in its post-mutation state by the time the callback runs.
 *
 * @param target Points at the node to watch. Changing it re-subscribes.
 * @param callback Receives the batch of records plus the observer, so a caller can disconnect from inside.
 * @param options Which mutation kinds to report, plus `disabled`.
 */
export function useMutationObserver<T extends Node>(
  target: MaybeRefOrGetter<T | null | undefined>,
  callback: (records: ReadonlyArray<MutationRecord>, observer: MutationObserver) => void,
  options?: MaybeRefOrGetter<UseMutationObserverOptions | undefined>,
): void {
  watchPostEffect((onCleanup) => {
    const opts = toValue(options);
    const node = opts?.disabled === true ? null : toValue(target);
    if (!node || !supportsMutationObserver()) return;

    const dispose = observeMutation(node, (records, observer) => callback(records, observer), opts);
    onCleanup(dispose);
  });
}
