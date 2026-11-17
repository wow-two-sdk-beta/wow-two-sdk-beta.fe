import type { ToastContent } from './ToastContent';

/** Defines the loading, success and error content of a `toastHost.promise` toast. */
export interface ToastPromiseOptions<T> {
  /** The content of the sticky toast shown while the promise is pending. */
  loading: ToastContent;

  /** The content once the promise resolves; a function receives the resolved value. */
  success: ToastContent | ((value: T) => ToastContent);

  /** The content once the promise rejects; a function receives the rejection. */
  error: ToastContent | ((err: unknown) => ToastContent);

  /** Auto-dismiss (ms) for the settled toast; defaults to the ToastHost's `defaultDuration`. */
  duration?: number;
}
