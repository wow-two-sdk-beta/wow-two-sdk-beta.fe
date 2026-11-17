import type { ToastOptions } from './ToastOptions';

/** Defines the content of a `toastHost.promise` phase — a title string, or a full partial options object. */
export type ToastContent = string | Partial<ToastOptions>;
