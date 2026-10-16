// The wire format both halves of the RPC agree on, kept in one dependency-free module so the client and
// the host can never drift apart, and so the parts worth testing without a browser (id allocation, the
// shape guards) are testable in the node project.
//
// TWO DECISIONS HERE ARE NOT OBVIOUS.
//
// 1. EVERY MESSAGE CARRIES A CHANNEL TAG. A `Worker` is a single shared `postMessage` pipe, not a private
//    one: the same worker may also carry a consumer's own hand-written traffic, a bundler's HMR ping, or
//    another library's protocol. Without a tag, a guard keyed only on `typeof id === 'number'` would
//    happily adopt a foreign message and resolve — or worse, reject — an unrelated call. So both guards
//    demand the tag first, and anything unrecognized is IGNORED rather than treated as an error: a message
//    that isn't ours is not a protocol violation, it is someone else's message.
//
// 2. SUCCESS AND FAILURE ARE SPLIT BY AN EXPLICIT `ok` FLAG, not by probing for an `error` key. `undefined`
//    is a legitimate result — a handler returning nothing must still resolve, not be misread as a failure
//    because its `result` member is absent after a structured-clone round trip. The boolean makes the
//    union genuinely discriminated and keeps `void` methods working.
//
// The error side of the wire is a `SerializedError` from `foundation/errors`, not an `Error`: structured
// clone drops `stack` and the subclass, so an `Error` posted directly arrives as a bare object with only
// `message` intact. `serializeError` flattens it to plain JSON-safe members (including the `cause` chain)
// and the client feeds that back through `toError` on the far side.

import type { SerializedError } from '../errors';

/**
 * Tags every message belonging to this protocol. A namespaced literal rather than a `Symbol`, because a
 * `Symbol` does not survive structured clone and would arrive as `undefined` on the far thread.
 */
export const WorkerMessageChannel = '@wow-two-beta/worker-rpc';

/** Names the channel tag's type — used to type the envelopes without restating the literal. */
export type WorkerMessageChannel = typeof WorkerMessageChannel;

/** Describes a call travelling from the client to the worker. */
export interface WorkerRequestMessage {
  /** The protocol tag — always {@link WorkerMessageChannel}. */
  readonly channel: WorkerMessageChannel;

  /** The envelope discriminant, distinguishing a request from a reply on the same pipe. */
  readonly kind: 'request';

  /** The correlation id the reply must echo back. Unique per client, monotonic. */
  readonly id: number;

  /** The handler name to dispatch to on the worker side. */
  readonly method: string;

  /** The positional arguments, structured-cloned (or transferred) to the worker. */
  readonly args: ReadonlyArray<unknown>;
}

/** Describes a reply carrying a handler's resolved value. */
export interface WorkerSuccessMessage {
  /** The protocol tag — always {@link WorkerMessageChannel}. */
  readonly channel: WorkerMessageChannel;

  /** The envelope discriminant. */
  readonly kind: 'response';

  /** The correlation id echoed from the request this answers. */
  readonly id: number;

  /** The success discriminant. */
  readonly ok: true;

  /** The handler's resolved value. Legitimately `undefined` for a `void` method. */
  readonly result: unknown;
}

/** Describes a reply carrying a handler's failure. */
export interface WorkerFailureMessage {
  /** The protocol tag — always {@link WorkerMessageChannel}. */
  readonly channel: WorkerMessageChannel;

  /** The envelope discriminant. */
  readonly kind: 'response';

  /** The correlation id echoed from the request this answers. */
  readonly id: number;

  /** The failure discriminant. */
  readonly ok: false;

  /** The JSON-safe projection of the thrown value, rehydrated by `toError` on the client. */
  readonly error: SerializedError;
}

/** Describes either half of a reply — the union the client switches on. */
export type WorkerResponseMessage = WorkerSuccessMessage | WorkerFailureMessage;

/** Narrows an `unknown` to a non-null object so members can be read without a `TypeError`. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Recognizes a request envelope arriving on the worker side.
 *
 * Deliberately total and silent: a message failing this check is ignored by the host, because the pipe is
 * shared and a foreign message must not be answered with a protocol error addressed to nobody.
 */
export function isWorkerRequestMessage(value: unknown): value is WorkerRequestMessage {
  if (!isRecord(value)) return false;
  return (
    value['channel'] === WorkerMessageChannel &&
    value['kind'] === 'request' &&
    typeof value['id'] === 'number' &&
    typeof value['method'] === 'string' &&
    Array.isArray(value['args'])
  );
}

/**
 * Recognizes a reply envelope arriving on the client side.
 *
 * Note it does NOT require a `result` member on the success branch — absent and `undefined` are the same
 * thing after a clone, and a `void` handler must still resolve its call.
 */
export function isWorkerResponseMessage(value: unknown): value is WorkerResponseMessage {
  if (!isRecord(value)) return false;
  if (value['channel'] !== WorkerMessageChannel || value['kind'] !== 'response') return false;
  if (typeof value['id'] !== 'number') return false;

  const ok = value['ok'];
  if (ok === true) return true;
  return ok === false && isRecord(value['error']);
}

/** Builds a request envelope. */
export function createRequestMessage(id: number, method: string, args: ReadonlyArray<unknown>): WorkerRequestMessage {
  return { channel: WorkerMessageChannel, kind: 'request', id, method, args };
}

/** Builds a success reply. */
export function createSuccessMessage(id: number, result: unknown): WorkerSuccessMessage {
  return { channel: WorkerMessageChannel, kind: 'response', id, ok: true, result };
}

/** Builds a failure reply. */
export function createFailureMessage(id: number, error: SerializedError): WorkerFailureMessage {
  return { channel: WorkerMessageChannel, kind: 'response', id, ok: false, error };
}

/**
 * Creates a per-client monotonic id source, starting at `1` so a falsy `0` never identifies a real call.
 *
 * Per-client rather than module-global on purpose: two clients over two workers each keep their own
 * sequence, so ids stay small and readable in a log, and one client's traffic can never be confused with
 * another's. No wrap handling — exhausting `Number.MAX_SAFE_INTEGER` at a million calls a second would
 * take roughly 285 years, so a counter reset is dead code that could only ever hide a bug.
 */
export function createRequestIdAllocator(): () => number {
  let previous = 0;
  return () => {
    previous += 1;
    return previous;
  };
}
