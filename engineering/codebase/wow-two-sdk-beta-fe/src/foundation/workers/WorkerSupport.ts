// The capability probe for this slice, isolated in its own module so the client, the host, the hook, and
// `runInWorker` all share ONE definition of "can this runtime spawn a worker".
//
// It exists because this package ships into SSR frameworks. `Worker` is a browser global with no Node
// counterpart under that name (Node's lives behind `node:worker_threads`), so a module-level
// `new Worker(...)` anywhere in this slice would be a hard crash the moment a server renders a page that
// imports it. The rule this module enforces: NOTHING here touches `Worker` outside a function body, and
// every entry point probes first and answers `unsupported` rather than throwing.
//
// `typeof Worker` rather than `'Worker' in globalThis`: `typeof` on an undeclared identifier is the one
// read that cannot raise a `ReferenceError`, which matters for bundles evaluated before a DOM shim is
// installed. The `globalThis` form would also work today, but the `typeof` form is the one that stays
// correct if this ever runs as a classic script.

/**
 * Reports whether the current runtime can construct a `Worker`.
 *
 * `false` under SSR and in Node's test environment. Call it before anything that would construct one —
 * every entry point in this slice already does, so this is for a consumer branching its own UI.
 */
export function isWorkerSupported(): boolean {
  return typeof Worker === 'function';
}

/**
 * Reports whether the runtime can build a worker from a `Blob` URL — the strictly stronger requirement
 * behind {@link runInWorker}, which needs `Blob` and `URL.createObjectURL` on top of `Worker`.
 *
 * Separate from {@link isWorkerSupported} because the two can genuinely diverge: a locked-down CSP with
 * no `worker-src blob:` leaves `Worker` fully functional while making the blob route unusable.
 */
export function isBlobWorkerSupported(): boolean {
  return (
    isWorkerSupported() &&
    typeof Blob === 'function' &&
    typeof URL !== 'undefined' &&
    typeof URL.createObjectURL === 'function' &&
    typeof URL.revokeObjectURL === 'function'
  );
}
