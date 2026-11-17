import type { ToastOptions } from './ToastOptions';

/** Represents a toast as the store holds it — the caller's options plus its identity and delivery order. */
export interface ToastEntry extends ToastOptions {
  /** The toast's identity, assigned by the store. */
  id: string;

  /** The epoch milliseconds when the toast was first shown. */
  createdAtMs: number;

  /** Delivery order, including while the toast is exiting. */
  sequence: number;

  /** Bumped on every `update` / dedup so the viewport can reset that toast's auto-dismiss timer. */
  nonce: number;
}
